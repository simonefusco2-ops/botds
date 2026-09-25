/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const ihlConfig = require('../../../config/ihl.config');
const config = require('../../config');
const logger = require('../../utils/logger');
const lobbyRepository = require('../../database/repositories/lobbyRepository');
const ihlRepository = require('../../database/repositories/ihlRepository');
const eloService = require('./eloService');
const ihlLeaderboard = require('./leaderboard');
const {
  buildQueueEmbed,
  buildQueueComponents,
  buildNoticeEmbed,
  buildMatchEmbed,
  buildMatchComponents,
  countVotes,
  votesNeeded,
  remainingMaps,
} = require('./render');

/**
 * Ciclo di vita di una partita:
 *
 *   queue → checkin → side → draft → ban → live → closed
 *
 * La coda vive nel canale del pannello. Appena si riempie nasce un canale
 * testuale privato: da lì in poi tutto — check-in, coinflip, lato, ban, draft e
 * voto — succede lì dentro, e il canale delle code torna subito disponibile per
 * la coda successiva.
 */

/** Timer in attesa, per chiave: la fase corrente e l'attesa del check-in. */
const timers = new Map();

const checkinKey = (lobbyId) => `${lobbyId}:checkin`;

function clearTimer(key) {
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
}

/** Spegne tutto quello che era in attesa per una lobby. */
function clearLobbyTimers(lobbyId) {
  clearTimer(lobbyId);
  clearTimer(checkinKey(lobbyId));
}

function scheduleTimeout(client, key, seconds, action) {
  clearTimer(key);
  const timer = setTimeout(() => {
    timers.delete(key);
    action().catch((err) => logger.error(`IHL ${key}: errore allo scadere del tempo`, err));
  }, Math.max(0, seconds) * 1000);
  timer.unref?.();
  timers.set(key, timer);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Nomi visualizzati nel menu del draft. */
async function resolveNames(guild, ids) {
  const names = {};
  for (const id of ids) {
    const member = await guild.members.fetch(id).catch(() => null);
    names[id] = member?.displayName || id;
  }
  return names;
}

// --- rendering --------------------------------------------------------------

/**
 * Le pubblicazioni di una stessa scheda vengono messe in fila.
 *
 * Senza questo, due chiamate quasi simultanee sulla stessa lobby leggono
 * entrambe un `message_id` ancora vuoto e pubblicano entrambe: nel canale
 * compaiono due schede con lo stesso numero di coda. Succede davvero, perché
 * mentre si aprono le stanze di una partita (un paio di secondi) qualcuno può
 * già entrare nella coda nuova.
 */
const renderLocks = new Map();

function withLock(key, action) {
  const previous = renderLocks.get(key) || Promise.resolve();
  const current = previous.then(action, action);

  // La coda degli in attesa non deve interrompersi per un errore di uno di loro.
  const chain = current.catch(() => {});
  renderLocks.set(key, chain);
  chain.finally(() => {
    if (renderLocks.get(key) === chain) renderLocks.delete(key);
  });

  return current;
}

/** Lo stato salvato adesso: l'oggetto ricevuto può essere una fotografia vecchia. */
function fresh(lobby) {
  return lobbyRepository.find(lobby.id) || lobby;
}

/**
 * La scheda della coda, nel canale del pannello. È l'unico messaggio che il bot
 * lascia lì oltre al pannello: l'annuncio dell'apertura viaggia insieme a lei
 * invece di occupare un messaggio suo, così la stanza resta pulita.
 */
function renderQueue(client, lobby, options = {}) {
  return withLock(`queue:${lobby.id}`, () => publishQueue(client, fresh(lobby), options));
}

async function publishQueue(client, lobby, { announce = false } = {}) {
  const channel = await client.channels.fetch(lobby.channel_id).catch(() => null);
  if (!channel) return;

  const payload = { embeds: [buildQueueEmbed(lobby)], components: buildQueueComponents() };

  if (announce) {
    payload.content =
      '@everyone\n' +
      '🟢 **LE CODE SONO APERTE!**\n' +
      'Entrate in un vocale e premete **Entra in coda**: a ' +
      `**${ihlConfig.queueSize} giocatori** si apre la stanza della partita.`;
    payload.allowedMentions = { parse: ['everyone'] };
  }

  if (lobby.message_id) {
    const message = await channel.messages.fetch(lobby.message_id).catch(() => null);
    if (message) {
      await message.edit(payload).catch(() => {});
      return;
    }

    // Ne pubblichiamo una nuova, ma se la vecchia esisteva ancora ora sono due:
    // vale la pena saperlo dai log.
    logger.warn(`IHL coda ${lobby.id}: scheda ${lobby.message_id} non trovata, ne pubblico un'altra.`);
  }

  const sent = await channel.send(payload);
  lobbyRepository.update(lobby.id, { message_id: sent.id });
}

/**
 * La cronaca della partita — avviata, risultato, annullata — nel canale dello
 * storico. Senza un canale configurato resta in quello delle code, come prima.
 */
function renderNotice(client, lobby, extra = {}) {
  return withLock(`notice:${lobby.id}`, () => publishNotice(client, fresh(lobby), extra));
}

async function publishNotice(client, lobby, extra = {}) {
  const channelId = ihlConfig.historyChannelId || lobby.channel_id;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    logger.warn(`IHL lobby ${lobby.id}: canale dello storico ${channelId} non raggiungibile.`);
    return;
  }

  const payload = { embeds: [buildNoticeEmbed(lobby, extra)], components: [] };

  if (lobby.notice_message_id) {
    const message = await channel.messages.fetch(lobby.notice_message_id).catch(() => null);
    if (message) {
      await message.edit(payload).catch(() => {});
      return;
    }
  }

  const sent = await channel.send(payload).catch((err) => {
    logger.warn(`IHL lobby ${lobby.id}: cronaca non pubblicata: ${err.message}`);
    return null;
  });

  if (sent) lobbyRepository.update(lobby.id, { notice_message_id: sent.id });
}

/** La coda è diventata partita: la sua scheda non serve più nel canale delle code. */
async function removeQueueCard(client, lobby) {
  if (!lobby.message_id) return;

  const channel = await client.channels.fetch(lobby.channel_id).catch(() => null);
  const message = await channel?.messages.fetch(lobby.message_id).catch(() => null);
  await message?.delete().catch(() => {});

  lobbyRepository.update(lobby.id, { message_id: null });
}

/** La scheda dentro il canale della partita, che accompagna tutte le fasi. */
function renderMatch(client, lobby, extra = {}) {
  return withLock(`match:${lobby.id}`, () => publishMatch(client, fresh(lobby), extra));
}

async function publishMatch(client, lobby, extra = {}) {
  if (!lobby.text_channel_id) return;

  const channel = await client.channels.fetch(lobby.text_channel_id).catch(() => null);
  if (!channel) return;

  const guild = channel.guild;
  const withNames =
    lobby.state === 'draft' ? { ...lobby, names: await resolveNames(guild, lobby.players) } : lobby;

  const payload = {
    embeds: [buildMatchEmbed(withNames, extra)],
    components: buildMatchComponents(withNames),
  };

  if (lobby.match_message_id) {
    const message = await channel.messages.fetch(lobby.match_message_id).catch(() => null);
    if (message) {
      await message.edit(payload).catch(() => {});
      return;
    }
  }

  const sent = await channel.send({ content: lobby.players.map((id) => `<@${id}>`).join(' '), ...payload });
  lobbyRepository.update(lobby.id, { match_message_id: sent.id });
}

/** Aggiorna la scheda della partita ricalcolando chi è già nel vocale di ritrovo. */
async function renderCheckin(client, lobby) {
  const present = await presentPlayers(client, lobby);
  const waited = Math.floor(Date.now() / 1000) - (lobby.checkin_at || 0);

  return renderMatch(client, lobby, {
    present,
    substitutable: waited >= ihlConfig.timers.substituteAfter,
  });
}

// --- fase 1: coda -----------------------------------------------------------

/**
 * La lobby in raccolta nel canale, creandola se non c'è. Le partite già avviate
 * non contano: restano attive in parallelo mentre la coda continua a riempirsi.
 */
function getOrCreateLobby(guildId, channelId) {
  return lobbyRepository.findQueueInChannel(channelId) || lobbyRepository.create(guildId, channelId);
}

/** La partita non ancora conclusa in cui il giocatore è già impegnato, se c'è. */
function busyIn(userId) {
  return lobbyRepository.listActive().find((lobby) => lobby.players.includes(userId)) || null;
}

async function joinQueue(client, interaction) {
  const lobby = getOrCreateLobby(interaction.guildId, interaction.channelId);

  if (lobby.state !== 'queue') {
    return interaction.reply({ content: '⚠️ La lobby è già partita: attendi la prossima.', ephemeral: true });
  }

  // Una persona alla volta in una sola partita: senza questo controllo si
  // potrebbe finire in due lobby insieme e non presentarsi in nessuna delle due.
  const busy = busyIn(interaction.user.id);
  if (busy) {
    return interaction.reply({
      content:
        busy.id === lobby.id
          ? '⚠️ Sei già in coda.'
          : `⚠️ Sei già impegnato nella **partita #${busy.id}**` +
            (busy.text_channel_id ? ` (<#${busy.text_channel_id}>)` : '') +
            ': finiscila prima di rientrare in coda.',
      ephemeral: true,
    });
  }

  // Non dovrebbe succedere, ma se la coda è già piena non la si gonfia oltre.
  if (lobby.players.length >= ihlConfig.queueSize) {
    return interaction.reply({ content: '⚠️ Questa coda è già al completo: attendi la prossima.', ephemeral: true });
  }

  const players = [...lobby.players, interaction.user.id];
  ihlRepository.ensure(interaction.user.id);

  if (players.length < ihlConfig.queueSize) {
    const updated = lobbyRepository.update(lobby.id, { players });
    await interaction.reply({
      content: `✅ Sei in coda (${players.length}/${ihlConfig.queueSize}).`,
      ephemeral: true,
    });
    return renderQueue(client, updated);
  }

  // Decimo giocatore. Chiudere la coda e aprirne una nuova va fatto qui, in modo
  // sincrono, PRIMA di qualsiasi await: creare le stanze richiede un paio di
  // secondi, e in quel tempo un altro click troverebbe la coda ancora aperta,
  // si aggiungerebbe come undicesimo e farebbe partire una seconda volta la
  // stessa partita. È esattamente così che nascevano due canali gemelli.
  const updated = lobbyRepository.update(lobby.id, { players, state: 'checkin' });
  const next = lobbyRepository.create(updated.guild_id, updated.channel_id);

  await interaction.reply({
    content: `✅ Coda completa (${players.length}/${ihlConfig.queueSize}): sto aprendo la stanza.`,
    ephemeral: true,
  });

  await openMatch(client, updated);

  // La coda riparte subito: chi arriva ora forma la lobby successiva senza
  // aspettare che la partita appena creata finisca.
  return renderQueue(client, next);
}

async function leaveQueue(client, interaction) {
  const lobby = lobbyRepository.findQueueInChannel(interaction.channelId);

  if (!lobby || !lobby.players.includes(interaction.user.id)) {
    return interaction.reply({ content: '⚠️ Non risulti in coda.', ephemeral: true });
  }

  const players = lobby.players.filter((id) => id !== interaction.user.id);
  const updated = lobbyRepository.update(lobby.id, { players });

  await interaction.reply({ content: '🚪 Sei uscito dalla coda.', ephemeral: true });
  return renderQueue(client, updated);
}

// --- fase 2: apertura della partita e check-in ------------------------------

/**
 * Coda piena: nascono il canale testuale della partita e il vocale di ritrovo.
 * Nel canale delle code resta solo un avviso che rimanda alla stanza nuova.
 */
async function openMatch(client, lobby) {
  // Seconda rete di sicurezza contro le aperture doppie: se la stanza c'è già,
  // questa partita è stata avviata da qualcun altro e non va rifatta.
  if (lobby.text_channel_id) {
    logger.warn(`IHL lobby ${lobby.id}: apertura ignorata, la stanza esiste già.`);
    return lobby;
  }

  const guild = await client.guilds.fetch(lobby.guild_id).catch(() => null);
  if (!guild) return null;

  const parent = ihlConfig.categoryId || config.tempVcCategoryId || undefined;
  const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];

  const text = await guild.channels
    .create({
      name: `${ihlConfig.matchChannel.prefix}${lobby.id}`,
      type: ChannelType.GuildText,
      parent,
      topic: `Partita IHL #${lobby.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: client.user.id, allow: [...allow, PermissionFlagsBits.ManageChannels] },
        ...ihlConfig.managerRoleIds.map((id) => ({ id, allow })),
        ...lobby.players.map((id) => ({ id, allow })),
      ],
    })
    .catch((err) => {
      logger.error(`IHL lobby ${lobby.id}: creazione canale partita fallita`, err);
      return null;
    });

  if (!text) return null;

  const voice = await guild.channels
    .create({
      name: `${ihlConfig.voice.checkinName} · #${lobby.id}`,
      type: ChannelType.GuildVoice,
      parent,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
          ],
        },
        ...ihlConfig.managerRoleIds.map((id) => ({
          id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        })),
        ...lobby.players.map((id) => ({
          id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        })),
      ],
    })
    .catch((err) => {
      logger.error(`IHL lobby ${lobby.id}: creazione vocale di ritrovo fallita`, err);
      return null;
    });

  const updated = lobbyRepository.update(lobby.id, {
    state: 'checkin',
    text_channel_id: text.id,
    checkin_voice_id: voice?.id || null,
    checkin_at: Math.floor(Date.now() / 1000),
  });

  await removeQueueCard(client, updated);
  await renderNotice(client, lobbyRepository.find(lobby.id));

  // Se per qualche motivo il vocale non è nato, il check-in bloccherebbe tutto.
  if (!voice) {
    logger.warn(`IHL lobby ${lobby.id}: senza vocale di ritrovo si parte direttamente.`);
    return startPicks(client, updated);
  }

  // Chi è già collegato da qualche parte lo porta dentro il bot: deve muoversi a
  // mano solo chi in vocale non c'è proprio.
  await gatherConnected(client, guild, updated, voice);

  await renderCheckin(client, lobbyRepository.find(lobby.id));

  // Allo scadere dell'attesa il bot segnala chi manca: da lì lo staff può sostituire.
  scheduleTimeout(client, checkinKey(lobby.id), ihlConfig.timers.substituteAfter, () =>
    announceMissing(client, lobby.id),
  );

  // Con tutti già dentro non c'è niente da aspettare: si parte subito.
  await handleCheckinChange(client, lobby.id);

  return lobbyRepository.find(lobby.id);
}

/** Trascina nel ritrovo i giocatori già collegati a un qualsiasi vocale. */
async function gatherConnected(client, guild, lobby, voice) {
  for (const id of lobby.players) {
    const member = await guild.members.fetch(id).catch(() => null);

    // Discord non può spostare chi non è collegato: quelli entrano da soli.
    if (!member?.voice?.channel || member.voice.channel.id === voice.id) continue;

    await member.voice.setChannel(voice).catch((err) => {
      logger.warn(`IHL lobby ${lobby.id}: impossibile portare ${id} nel ritrovo: ${err.message}`);
    });
  }
}

/** Chi dei giocatori è collegato in questo momento al vocale di ritrovo. */
async function presentPlayers(client, lobby) {
  if (!lobby.checkin_voice_id) return [];

  const channel = await client.channels.fetch(lobby.checkin_voice_id).catch(() => null);
  if (!channel) return [];

  return lobby.players.filter((id) => channel.members.has(id));
}

/**
 * Chiamata a ogni movimento nei vocali: quando ci sono tutti e dieci la partita
 * parte, prima no. È il punto in cui si evita di spostare gente che non c'è.
 */
async function handleCheckinChange(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'checkin') return;

  const present = await presentPlayers(client, lobby);

  if (present.length < lobby.players.length) {
    await renderCheckin(client, lobby);
    return;
  }

  clearTimer(checkinKey(lobbyId));
  await startPicks(client, lobby);
}

/** Allo scadere dell'attesa: chi manca viene taggato e lo staff può sostituirlo. */
async function announceMissing(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'checkin' || !lobby.text_channel_id) return;

  const present = await presentPlayers(client, lobby);
  const missing = lobby.players.filter((id) => !present.includes(id));
  if (!missing.length) return;

  const channel = await client.channels.fetch(lobby.text_channel_id).catch(() => null);
  const minutes = Math.round(ihlConfig.timers.substituteAfter / 60);

  await channel
    ?.send({
      content:
        `${missing.map((id) => `<@${id}>`).join(' ')}\n` +
        `⌛ **Sono passati ${minutes} minuti e mancate ancora all'appello.**\n` +
        `${ihlConfig.managerRoleIds.map((id) => `<@&${id}>`).join(' ')} potete sostituire con ` +
        `\`/ihl sostituisci codice:${lobby.id} esce:@assente entra:@riserva\`.`,
      allowedMentions: { users: missing, roles: ihlConfig.managerRoleIds },
    })
    .catch(() => {});

  await renderCheckin(client, lobby);
}

/**
 * Sostituisce un giocatore che non si è presentato. Il tempo d'attesa è una
 * garanzia per chi sta arrivando: prima di quello non si tocca nessuno.
 */
async function substitutePlayer(client, lobbyId, outId, inId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby) return { error: `Nessuna partita con codice \`${lobbyId}\`.` };
  if (lobby.state !== 'checkin') {
    return { error: 'La sostituzione è possibile solo durante il check-in, prima che la partita parta.' };
  }
  if (!lobby.players.includes(outId)) return { error: `<@${outId}> non fa parte della partita #${lobby.id}.` };
  if (lobby.players.includes(inId)) return { error: `<@${inId}> è già in questa partita.` };

  const busy = busyIn(inId);
  if (busy) return { error: `<@${inId}> è già impegnato nella partita #${busy.id}.` };

  const waited = Math.floor(Date.now() / 1000) - (lobby.checkin_at || 0);
  const left = ihlConfig.timers.substituteAfter - waited;
  if (left > 0) {
    return { error: `Ancora **${Math.ceil(left / 60)} minuti** di attesa prima di poter sostituire.` };
  }

  const present = await presentPlayers(client, lobby);
  if (present.includes(outId)) {
    return { error: `<@${outId}> è nel vocale di ritrovo: non si sostituisce chi si è presentato.` };
  }

  ihlRepository.ensure(inId);
  const players = lobby.players.map((id) => (id === outId ? inId : id));
  const updated = lobbyRepository.update(lobbyId, { players });

  await applyPlayerPermissions(client, updated, outId, inId);

  const channel = await client.channels.fetch(updated.text_channel_id).catch(() => null);
  await channel
    ?.send({
      content: `🔁 <@${inId}> entra al posto di <@${outId}>.`,
      allowedMentions: { users: [inId] },
    })
    .catch(() => {});

  await handleCheckinChange(client, lobbyId);
  return { lobby: updated };
}

/** Toglie l'accesso a chi esce e lo dà a chi entra, su testuale e vocale. */
async function applyPlayerPermissions(client, lobby, outId, inId) {
  for (const channelId of [lobby.text_channel_id, lobby.checkin_voice_id]) {
    if (!channelId) continue;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    await channel.permissionOverwrites.delete(outId).catch(() => {});
    await channel.permissionOverwrites
      .create(
        inId,
        channel.type === ChannelType.GuildVoice
          ? { Connect: true, ViewChannel: true }
          : { ViewChannel: true, SendMessages: true },
      )
      .catch(() => {});
  }
}

// --- fase 3: coinflip e scelta del lato -------------------------------------

/**
 * I due ELO più alti fanno i capitani, ma chi sceglie per primo lo decide il
 * lancio della moneta: il più forte non parte avvantaggiato anche nel veto.
 */
async function startPicks(client, lobby) {
  const ranked = ihlRepository
    .getMany(lobby.players)
    .sort((a, b) => b.elo - a.elo)
    .map((player) => player.discord_id);

  const [captainA, captainB] = ranked;
  const first = pickRandom([captainA, captainB]);

  // Il veto parte da tutte le mappe in rotazione. Solo se `mapPoolSize` indica
  // un numero se ne estrae a caso un sottoinsieme, per accorciarlo.
  const active = ihlConfig.maps.filter((map) => ihlConfig.activeMaps.includes(map.name));
  const size = ihlConfig.mapPoolSize;
  const pool = size > 0 && size < active.length ? [...active].sort(() => Math.random() - 0.5).slice(0, size) : active;
  const mapPool = pool.map((map) => map.name);

  const updated = lobbyRepository.update(lobby.id, {
    state: 'side',
    captain_a: captainA,
    captain_b: captainB,
    team_a: [captainA],
    team_b: [captainB],
    turn: first,
    first_pick: first,
    map_pool: mapPool,
  });

  const channel = await client.channels.fetch(updated.text_channel_id).catch(() => null);
  await channel
    ?.send({
      content:
        '🪙 **Lancio della moneta**\n' +
        `Capitani: <@${captainA}> e <@${captainB}>. Il sorteggio ha scelto **<@${first}>**, che apre le scelte.`,
      allowedMentions: { users: [first] },
    })
    .catch(() => {});

  scheduleTimeout(client, lobby.id, ihlConfig.timers.sideChoice, () =>
    chooseSide(client, lobby.id, pickRandom(['attack', 'defense']), true),
  );

  return renderMatch(client, updated);
}

async function chooseSide(client, lobbyId, side, automatic = false) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'side') return;

  clearTimer(lobbyId);

  // Chi ha scelto il lato non apre anche il draft: la prima scelta va all'altro.
  const other = lobby.turn === lobby.captain_a ? lobby.captain_b : lobby.captain_a;

  // Il lato si registra sempre dal punto di vista del Team A.
  const sideA = lobby.turn === lobby.captain_a ? side : side === 'attack' ? 'defense' : 'attack';

  const updated = lobbyRepository.update(lobbyId, { state: 'draft', side_a: sideA, turn: other });

  if (automatic) logger.info(`IHL lobby ${lobbyId}: lato scelto dal bot (${side}).`);

  scheduleTimeout(client, lobbyId, ihlConfig.timers.pick, () => autoPick(client, lobbyId));
  return renderMatch(client, updated);
}

// --- fase 4: ban delle mappe ------------------------------------------------

async function banMap(client, lobbyId, mapName, automatic = false) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'ban') return;
  if (lobby.banned_maps.includes(mapName)) return;

  clearTimer(lobbyId);

  const banned = [...lobby.banned_maps, mapName];
  const left = remainingMaps({ ...lobby, banned_maps: banned });

  if (automatic) logger.info(`IHL lobby ${lobbyId}: ban automatico di ${mapName}.`);

  // Resta una sola mappa: si gioca lì, e i giocatori vanno nelle vocali.
  if (left.length === 1) {
    const updated = lobbyRepository.update(lobbyId, {
      state: 'live',
      banned_maps: banned,
      chosen_map: left[0].name,
      turn: null,
    });

    await setupVoiceChannels(client, updated);
    return renderMatch(client, lobbyRepository.find(lobbyId));
  }

  const nextTurn = lobby.turn === lobby.captain_a ? lobby.captain_b : lobby.captain_a;
  const updated = lobbyRepository.update(lobbyId, { banned_maps: banned, turn: nextTurn });

  scheduleTimeout(client, lobbyId, ihlConfig.timers.mapBan, () => autoBan(client, lobbyId));
  return renderMatch(client, updated);
}

async function autoBan(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'ban') return;
  return banMap(client, lobbyId, pickRandom(remainingMaps(lobby)).name, true);
}

// --- fase 5: draft ----------------------------------------------------------

async function pickPlayer(client, lobbyId, playerId, automatic = false) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'draft') return;

  const taken = [...lobby.team_a, ...lobby.team_b];
  if (taken.includes(playerId) || !lobby.players.includes(playerId)) return;

  clearTimer(lobbyId);

  const toTeamA = lobby.turn === lobby.captain_a;
  const teamA = toTeamA ? [...lobby.team_a, playerId] : lobby.team_a;
  const teamB = toTeamA ? lobby.team_b : [...lobby.team_b, playerId];

  if (automatic) logger.info(`IHL lobby ${lobbyId}: scelta automatica di ${playerId}.`);

  const half = ihlConfig.queueSize / 2;

  // Squadre complete: si passa al veto delle mappe, che apre chi ha vinto il
  // sorteggio (l'altro capitano ha già aperto il draft).
  if (teamA.length >= half && teamB.length >= half) {
    const updated = lobbyRepository.update(lobbyId, {
      team_a: teamA,
      team_b: teamB,
      state: 'ban',
      turn: lobby.first_pick || lobby.captain_a,
    });

    scheduleTimeout(client, lobbyId, ihlConfig.timers.mapBan, () => autoBan(client, lobbyId));
    return renderMatch(client, updated);
  }

  // Passa all'altro capitano, a meno che la sua squadra sia già completa.
  const nextIsA = !toTeamA;
  const nextTurn =
    (nextIsA ? teamA.length : teamB.length) >= half
      ? lobby.turn
      : nextIsA
        ? lobby.captain_a
        : lobby.captain_b;

  const updated = lobbyRepository.update(lobbyId, { team_a: teamA, team_b: teamB, turn: nextTurn });

  scheduleTimeout(client, lobbyId, ihlConfig.timers.pick, () => autoPick(client, lobbyId));
  return renderMatch(client, updated);
}

async function autoPick(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'draft') return;

  const taken = [...lobby.team_a, ...lobby.team_b];
  const available = lobby.players.filter((id) => !taken.includes(id));
  if (!available.length) return;

  return pickPlayer(client, lobbyId, pickRandom(available), true);
}

// --- fase 6: vocali delle squadre -------------------------------------------

/** Squadre fatte: nascono le due vocali e tutti vengono spostati dal ritrovo. */
async function setupVoiceChannels(client, lobby) {
  const guild = await client.guilds.fetch(lobby.guild_id).catch(() => null);
  if (!guild) return;

  const parent = ihlConfig.categoryId || config.tempVcCategoryId || undefined;
  const created = {};

  for (const [key, name, team] of [
    ['voice_a_id', ihlConfig.voice.teamAName, lobby.team_a],
    ['voice_b_id', ihlConfig.voice.teamBName, lobby.team_b],
  ]) {
    const channel = await guild.channels
      .create({
        name: `${name} · #${lobby.id}`,
        type: ChannelType.GuildVoice,
        parent,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
          {
            id: client.user.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
          },
          ...team.map((id) => ({ id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] })),
        ],
      })
      .catch((err) => {
        logger.error(`IHL lobby ${lobby.id}: creazione vocale ${name} fallita`, err);
        return null;
      });

    if (!channel) continue;
    created[key] = channel.id;

    for (const id of team) {
      const member = await guild.members.fetch(id).catch(() => null);
      // Spostiamo solo chi è collegato: dopo il check-in dovrebbero esserci tutti.
      if (!member?.voice?.channel) continue;
      await member.voice.setChannel(channel).catch((err) => {
        logger.warn(`IHL lobby ${lobby.id}: impossibile spostare ${id}: ${err.message}`);
      });
    }
  }

  if (Object.keys(created).length) lobbyRepository.update(lobby.id, created);

  // Il ritrovo ha esaurito il suo scopo.
  await deleteChannel(client, lobby.checkin_voice_id, 'Check-in concluso');
  lobbyRepository.update(lobby.id, { checkin_voice_id: null });
}

// --- fase 7: voto e risultato -----------------------------------------------

/**
 * Registra il voto e chiude la partita appena una squadra raggiunge la
 * maggioranza. Nessuna scadenza: una partita può durare ore, il voto aspetta.
 */
async function castVote(client, lobbyId, userId, choice) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'live') return { error: 'La partita non è più in corso.' };
  if (!lobby.players.includes(userId)) return { error: 'Non fai parte di questa partita.' };

  const votes = { ...lobby.votes, [userId]: choice };
  const updated = lobbyRepository.update(lobbyId, { votes });

  const { a, b } = countVotes(updated);
  const needed = votesNeeded(updated);

  if (a >= needed || b >= needed) {
    await finishMatch(client, lobbyId, a >= needed ? 'a' : 'b');
    return { settled: true };
  }

  await renderMatch(client, updated);

  const allVoted = Object.keys(votes).length >= updated.players.length;
  return { settled: false, tie: allVoted };
}

async function finishMatch(client, lobbyId, winner, note) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'live') return null;

  clearLobbyTimers(lobbyId);

  const changes = eloService.applyMatchResult(lobby.team_a, lobby.team_b, winner);

  for (const change of changes) {
    ihlRepository.recordMatch({
      lobby_id: lobby.id,
      discord_id: change.discordId,
      team: change.team,
      won: change.team === winner ? 1 : 0,
      elo_before: change.before,
      elo_after: change.before + change.delta,
      map: lobby.chosen_map,
    });
  }

  const summary = changes
    .map((change) => {
      const sign = change.delta >= 0 ? '+' : '';
      return `<@${change.discordId}> ${change.before} → **${change.before + change.delta}** (${sign}${change.delta})`;
    })
    .join('\n');

  const updated = lobbyRepository.update(lobbyId, { state: 'closed' });
  const result = `🏆 **Vittoria Team ${winner.toUpperCase()}**` + (note ? `\n-# ${note}` : '') + `\n\n${summary}`;

  // Il riepilogo va nello storico; la stanza della partita si chiude.
  await renderNotice(client, updated, { result });
  await renderMatch(client, updated, { result });

  scheduleCleanup(client, updated);
  await ihlLeaderboard.refresh(client);
  return updated;
}

function scheduleCleanup(client, lobby) {
  const delay = Math.max(0, ihlConfig.matchChannel.deleteAfter) * 1000;
  const timer = setTimeout(() => {
    cleanupMatchChannels(client, lobby).catch((err) =>
      logger.error(`IHL lobby ${lobby.id}: pulizia stanze fallita`, err),
    );
  }, delay);
  timer.unref?.();
}

async function deleteChannel(client, channelId, reason) {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  await channel?.delete(reason).catch(() => {});
}

/** Chiude tutte le stanze della partita: vocali, ritrovo e testuale. */
async function cleanupMatchChannels(client, lobby, reason = 'Partita IHL conclusa') {
  for (const channelId of [lobby.voice_a_id, lobby.voice_b_id, lobby.checkin_voice_id, lobby.text_channel_id]) {
    await deleteChannel(client, channelId, reason);
  }
}

/**
 * Annulla una partita. Se era già conclusa, l'ELO assegnato viene restituito a
 * tutti i partecipanti; se era ancora in corso, semplicemente non viene assegnato.
 */
async function cancelLobby(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby) return null;

  clearLobbyTimers(lobbyId);

  const refunded = ihlRepository.voidMatch(lobbyId);

  await cleanupMatchChannels(client, lobby, 'Partita IHL annullata');
  const updated = lobbyRepository.update(lobbyId, { state: 'closed' });

  await renderNotice(client, updated, { result: '🚫 **Partita annullata dallo staff.**' });

  if (refunded.length) await ihlLeaderboard.refresh(client);

  return { lobby, refunded };
}

/**
 * I timer vivono in memoria: dopo un riavvio vanno riarmati, altrimenti una
 * lobby resterebbe appesa a una fase che nessuno chiude. Il voto non ha
 * scadenza, quindi le partite in corso non hanno bisogno di nulla.
 */
async function resumeLobbies(client) {
  const active = lobbyRepository.listActive().filter((lobby) => lobby.state !== 'queue');
  if (!active.length) return;

  for (const lobby of active) {
    if (lobby.state === 'checkin') {
      await handleCheckinChange(client, lobby.id);
      const waited = Math.floor(Date.now() / 1000) - (lobby.checkin_at || 0);
      scheduleTimeout(client, checkinKey(lobby.id), ihlConfig.timers.substituteAfter - waited, () =>
        announceMissing(client, lobby.id),
      );
      continue;
    }

    if (lobby.state === 'side') {
      scheduleTimeout(client, lobby.id, ihlConfig.timers.sideChoice, () =>
        chooseSide(client, lobby.id, pickRandom(['attack', 'defense']), true),
      );
    } else if (lobby.state === 'draft') {
      scheduleTimeout(client, lobby.id, ihlConfig.timers.pick, () => autoPick(client, lobby.id));
    } else if (lobby.state === 'ban') {
      scheduleTimeout(client, lobby.id, ihlConfig.timers.mapBan, () => autoBan(client, lobby.id));
    }
  }

  logger.info(`IHL: ${active.length} partite riprese dopo il riavvio.`);
}

module.exports = {
  getOrCreateLobby,
  busyIn,
  joinQueue,
  leaveQueue,
  openMatch,
  presentPlayers,
  handleCheckinChange,
  substitutePlayer,
  startPicks,
  chooseSide,
  banMap,
  pickPlayer,
  castVote,
  finishMatch,
  cancelLobby,
  resumeLobbies,
  renderQueue,
  renderNotice,
  renderMatch,
};
