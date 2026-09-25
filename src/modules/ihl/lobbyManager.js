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
  buildLobbyEmbed,
  buildLobbyComponents,
  buildVoteEmbed,
  buildVoteComponents,
  countVotes,
  remainingMaps,
} = require('./render');

/** Timer della fase corrente per lobby: alla scadenza decide il bot. */
const timers = new Map();

function clearTimer(lobbyId) {
  const timer = timers.get(lobbyId);
  if (timer) clearTimeout(timer);
  timers.delete(lobbyId);
}

function scheduleTimeout(client, lobbyId, seconds, action) {
  clearTimer(lobbyId);
  const timer = setTimeout(() => {
    timers.delete(lobbyId);
    action().catch((err) => logger.error(`IHL lobby ${lobbyId}: errore allo scadere del tempo`, err));
  }, seconds * 1000);
  timer.unref?.();
  timers.set(lobbyId, timer);
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

async function renderLobby(client, lobby, extra = {}) {
  const channel = await client.channels.fetch(lobby.channel_id).catch(() => null);
  if (!channel) return;

  const guild = channel.guild;
  const withNames =
    lobby.state === 'draft' ? { ...lobby, names: await resolveNames(guild, lobby.players) } : lobby;

  const payload = {
    embeds: [buildLobbyEmbed(withNames, extra)],
    components: buildLobbyComponents(withNames),
  };

  if (lobby.message_id) {
    const message = await channel.messages.fetch(lobby.message_id).catch(() => null);
    if (message) {
      await message.edit(payload);
      return;
    }
  }

  const sent = await channel.send(payload);
  lobbyRepository.update(lobby.id, { message_id: sent.id });
}

// --- Fase 1: coda -----------------------------------------------------------

/**
 * La lobby in raccolta nel canale, creandola se non c'è. Le partite già avviate
 * non contano: restano attive in parallelo mentre la coda continua a riempirsi.
 */
function getOrCreateLobby(guildId, channelId) {
  return lobbyRepository.findQueueInChannel(channelId) || lobbyRepository.create(guildId, channelId);
}

async function joinQueue(client, interaction) {
  const lobby = getOrCreateLobby(interaction.guildId, interaction.channelId);

  if (lobby.state !== 'queue') {
    return interaction.reply({ content: '⚠️ La lobby è già partita: attendi la prossima.', ephemeral: true });
  }

  if (lobby.players.includes(interaction.user.id)) {
    return interaction.reply({ content: '⚠️ Sei già in coda.', ephemeral: true });
  }

  const players = [...lobby.players, interaction.user.id];
  ihlRepository.ensure(interaction.user.id);
  const updated = lobbyRepository.update(lobby.id, { players });

  await interaction.reply({
    content: `✅ Sei in coda (${players.length}/${ihlConfig.queueSize}).`,
    ephemeral: true,
  });

  if (players.length < ihlConfig.queueSize) return renderLobby(client, updated);

  await startLobby(client, updated);

  // La coda riparte subito: chi arriva ora forma la lobby successiva senza
  // aspettare che la partita appena creata finisca.
  const next = lobbyRepository.create(updated.guild_id, updated.channel_id);
  return renderLobby(client, next);
}

async function leaveQueue(client, interaction) {
  const lobby = lobbyRepository.findQueueInChannel(interaction.channelId);

  if (!lobby || !lobby.players.includes(interaction.user.id)) {
    return interaction.reply({ content: '⚠️ Non risulti in coda.', ephemeral: true });
  }

  const players = lobby.players.filter((id) => id !== interaction.user.id);
  const updated = lobbyRepository.update(lobby.id, { players });

  await interaction.reply({ content: '🚪 Sei uscito dalla coda.', ephemeral: true });
  return renderLobby(client, updated);
}

// --- Fase 2: capitani e scelta del lato -------------------------------------

/** I due ELO più alti diventano capitani; il primo sceglie il lato. */
async function startLobby(client, lobby) {
  const ranked = ihlRepository
    .getMany(lobby.players)
    .sort((a, b) => b.elo - a.elo)
    .map((player) => player.discord_id);

  const [captainA, captainB] = ranked;

  // Pool estratto a caso fra le mappe in rotazione: ogni partita ha un veto
  // diverso e abbastanza corto da non annoiare.
  const active = ihlConfig.maps.filter((map) => ihlConfig.activeMaps.includes(map.name));
  const mapPool = [...active]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(ihlConfig.mapPoolSize, active.length))
    .map((map) => map.name);

  const updated = lobbyRepository.update(lobby.id, {
    state: 'side',
    captain_a: captainA,
    captain_b: captainB,
    team_a: [captainA],
    team_b: [captainB],
    turn: captainA,
    map_pool: mapPool,
  });

  scheduleTimeout(client, lobby.id, ihlConfig.timers.sideChoice, () =>
    chooseSide(client, lobby.id, pickRandom(['attack', 'defense']), true),
  );

  return renderLobby(client, updated);
}

async function chooseSide(client, lobbyId, side, automatic = false) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'side') return;

  clearTimer(lobbyId);

  // Chi sceglie il lato non banna per primo: il primo ban va all'altro capitano.
  const updated = lobbyRepository.update(lobbyId, {
    state: 'ban',
    side_a: side,
    turn: lobby.captain_b,
  });

  if (automatic) logger.info(`IHL lobby ${lobbyId}: lato scelto dal bot (${side}).`);

  scheduleTimeout(client, lobbyId, ihlConfig.timers.mapBan, () => autoBan(client, lobbyId));
  return renderLobby(client, updated);
}

// --- Fase 3: ban delle mappe ------------------------------------------------

async function banMap(client, lobbyId, mapName, automatic = false) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'ban') return;
  if (lobby.banned_maps.includes(mapName)) return;

  clearTimer(lobbyId);

  const banned = [...lobby.banned_maps, mapName];
  const left = remainingMaps({ ...lobby, banned_maps: banned });

  if (automatic) logger.info(`IHL lobby ${lobbyId}: ban automatico di ${mapName}.`);

  // Resta una sola mappa: si passa al draft, che apre il capitano A.
  if (left.length === 1) {
    const updated = lobbyRepository.update(lobbyId, {
      state: 'draft',
      banned_maps: banned,
      chosen_map: left[0].name,
      turn: lobby.captain_a,
    });

    scheduleTimeout(client, lobbyId, ihlConfig.timers.pick, () => autoPick(client, lobbyId));
    return renderLobby(client, updated);
  }

  const nextTurn = lobby.turn === lobby.captain_a ? lobby.captain_b : lobby.captain_a;
  const updated = lobbyRepository.update(lobbyId, { banned_maps: banned, turn: nextTurn });

  scheduleTimeout(client, lobbyId, ihlConfig.timers.mapBan, () => autoBan(client, lobbyId));
  return renderLobby(client, updated);
}

async function autoBan(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'ban') return;
  return banMap(client, lobbyId, pickRandom(remainingMaps(lobby)).name, true);
}

// --- Fase 4: draft ----------------------------------------------------------

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
  if (teamA.length >= half && teamB.length >= half) {
    const updated = lobbyRepository.update(lobbyId, { team_a: teamA, team_b: teamB, state: 'live', turn: null });
    await renderLobby(client, updated);
    return setupVoiceChannels(client, updated);
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
  return renderLobby(client, updated);
}

async function autoPick(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'draft') return;

  const taken = [...lobby.team_a, ...lobby.team_b];
  const available = lobby.players.filter((id) => !taken.includes(id));
  if (!available.length) return;

  return pickPlayer(client, lobbyId, pickRandom(available), true);
}

// --- Fase 5: vocali di partita ----------------------------------------------

async function setupVoiceChannels(client, lobby) {
  const guild = await client.guilds.fetch(lobby.guild_id).catch(() => null);
  if (!guild) return;

  const parent = ihlConfig.voice.categoryId || config.tempVcCategoryId || undefined;
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
      // Spostiamo solo chi è già collegato: Discord non può trascinare chi è offline dal vocale.
      if (!member?.voice?.channel) continue;
      await member.voice.setChannel(channel).catch((err) => {
        logger.warn(`IHL lobby ${lobby.id}: impossibile spostare ${id}: ${err.message}`);
      });
    }
  }

  if (Object.keys(created).length) lobbyRepository.update(lobby.id, created);

  await createMatchChannel(client, lobbyRepository.find(lobby.id));
}

/**
 * Canale testuale privato della singola partita: ci entrano solo i dieci
 * giocatori e lo staff, e serve a votare il vincitore. Viene eliminato a
 * votazione conclusa, così il server non si riempie di canali morti.
 */
async function createMatchChannel(client, lobby) {
  const guild = await client.guilds.fetch(lobby.guild_id).catch(() => null);
  if (!guild) return;

  const parent = ihlConfig.voice.categoryId || config.tempVcCategoryId || undefined;

  const channel = await guild.channels
    .create({
      name: `${ihlConfig.matchChannel.prefix}${lobby.id}`,
      type: ChannelType.GuildText,
      parent,
      topic: `Partita IHL #${lobby.id} — ${lobby.chosen_map}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
        ...ihlConfig.managerRoleIds.map((id) => ({
          id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        })),
        ...lobby.players.map((id) => ({
          id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        })),
      ],
    })
    .catch((err) => {
      logger.error(`IHL lobby ${lobby.id}: creazione canale partita fallita`, err);
      return null;
    });

  if (!channel) return;

  lobbyRepository.update(lobby.id, { text_channel_id: channel.id });

  await channel.send({
    content: lobby.players.map((id) => `<@${id}>`).join(' '),
    embeds: [buildVoteEmbed(lobby)],
    components: buildVoteComponents(lobby),
  });

  // La scheda nel canale delle code ora può rimandare alla stanza della partita.
  await renderLobby(client, lobbyRepository.find(lobby.id));
}

/** Aggiorna la scheda di voto nel canale della partita. */
async function renderVoteCard(client, lobby, extra = {}) {
  if (!lobby.text_channel_id) return;

  const channel = await client.channels.fetch(lobby.text_channel_id).catch(() => null);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const card = messages?.find((message) => message.author.id === client.user.id && message.embeds.length);
  if (!card) return;

  await card
    .edit({
      embeds: [buildVoteEmbed(lobby, extra)],
      components: extra.result ? [] : buildVoteComponents(lobby),
    })
    .catch(() => {});
}

/**
 * Registra il voto di un giocatore e chiude la partita appena una delle due
 * squadre raggiunge la maggioranza assoluta dei partecipanti.
 */
async function castVote(client, lobbyId, userId, choice) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'live') return { error: 'La partita non è più in corso.' };
  if (!lobby.players.includes(userId)) return { error: 'Non fai parte di questa partita.' };

  const votes = { ...lobby.votes, [userId]: choice };
  const updated = lobbyRepository.update(lobbyId, { votes });

  const { a, b } = countVotes(updated);
  const needed = Math.floor(updated.players.length / 2) + 1;

  if (a >= needed || b >= needed) {
    await finishMatch(client, lobbyId, a >= needed ? 'a' : 'b');
    return { settled: true };
  }

  await renderVoteCard(client, updated);

  const allVoted = Object.keys(votes).length >= updated.players.length;
  return { settled: false, tie: allVoted };
}

// --- Fase 6: risultato ------------------------------------------------------

async function finishMatch(client, lobbyId, winner) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby || lobby.state !== 'live') return null;

  clearTimer(lobbyId);

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

  const result = `🏆 **Vittoria Team ${winner.toUpperCase()}**\n\n${summary}`;

  await renderLobby(client, updated, { result });

  // L'esito resta nel canale delle code; il testuale della partita mostra il
  // riepilogo e poi si chiude da solo, come previsto a votazione conclusa.
  await renderVoteCard(client, updated, { result });
  scheduleCleanup(client, updated);
  await ihlLeaderboard.refresh(client);
  return updated;
}

/**
 * Chiude le stanze della partita: le due vocali e il testuale del voto. Il
 * testuale sparisce a votazione conclusa, come richiesto, quindi lo cancelliamo
 * insieme al resto una volta assegnato l'ELO.
 */
function scheduleCleanup(client, lobby) {
  const delay = Math.max(0, ihlConfig.matchChannel.deleteAfter) * 1000;
  const timer = setTimeout(() => {
    cleanupMatchChannels(client, lobby).catch((err) =>
      logger.error(`IHL lobby ${lobby.id}: pulizia stanze fallita`, err),
    );
  }, delay);
  timer.unref?.();
}

async function cleanupMatchChannels(client, lobby, reason = 'Partita IHL conclusa') {
  const guild = await client.guilds.fetch(lobby.guild_id).catch(() => null);
  if (!guild) return;

  for (const channelId of [lobby.voice_a_id, lobby.voice_b_id, lobby.text_channel_id]) {
    if (!channelId) continue;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    await channel?.delete(reason).catch(() => {});
  }
}

/**
 * Annulla una partita. Se era già conclusa, l'ELO assegnato viene restituito a
 * tutti i partecipanti; se era ancora in corso, semplicemente non viene assegnato.
 */
async function cancelLobby(client, lobbyId) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby) return null;

  clearTimer(lobbyId);

  const refunded = ihlRepository.voidMatch(lobbyId);

  await cleanupMatchChannels(client, lobby, 'Partita IHL annullata');
  lobbyRepository.update(lobbyId, { state: 'closed' });

  if (refunded.length) await ihlLeaderboard.refresh(client);

  return { lobby, refunded };
}

module.exports = {
  getOrCreateLobby,
  joinQueue,
  leaveQueue,
  startLobby,
  chooseSide,
  banMap,
  pickPlayer,
  castVote,
  finishMatch,
  cancelLobby,
  renderLobby,
};
