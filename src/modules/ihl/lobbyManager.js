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
const { buildLobbyEmbed, buildLobbyComponents, remainingMaps } = require('./render');

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

function getOrCreateLobby(guildId, channelId) {
  return lobbyRepository.findOpenInChannel(channelId) || lobbyRepository.create(guildId, channelId);
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

  if (players.length >= ihlConfig.queueSize) return startLobby(client, updated);
  return renderLobby(client, updated);
}

async function leaveQueue(client, interaction) {
  const lobby = lobbyRepository.findOpenInChannel(interaction.channelId);

  if (!lobby || lobby.state !== 'queue' || !lobby.players.includes(interaction.user.id)) {
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

  // Pool estratto a caso dall'archivio: ogni partita ha un veto diverso e più corto.
  const mapPool = [...ihlConfig.maps]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(ihlConfig.mapPoolSize, ihlConfig.maps.length))
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

  await renderLobby(client, updated, {
    result: `🏆 **Vittoria Team ${winner.toUpperCase()}**\n\n${summary}`,
  });

  await cleanupVoiceChannels(client, updated);
  await ihlLeaderboard.refresh(client);
  return updated;
}

async function cleanupVoiceChannels(client, lobby) {
  const guild = await client.guilds.fetch(lobby.guild_id).catch(() => null);
  if (!guild) return;

  for (const channelId of [lobby.voice_a_id, lobby.voice_b_id]) {
    if (!channelId) continue;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    await channel?.delete('Partita IHL conclusa').catch(() => {});
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

  await cleanupVoiceChannels(client, lobby);
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
  finishMatch,
  cancelLobby,
  renderLobby,
};
