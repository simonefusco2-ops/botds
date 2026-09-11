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
const config = require('../../config');
const logger = require('../../utils/logger');
const userRepository = require('../../database/repositories/userRepository');
const matchRepository = require('../../database/repositories/matchRepository');

function extractFactions(payload) {
  return payload.teams || payload.factions || null;
}

/**
 * Riceve il roster del match (evento match_status_configuring/ready), crea due canali
 * vocali temporanei e smista i membri mappati tramite /link, verificando che ciascuno
 * sia già connesso a un canale vocale prima di spostarlo.
 */
async function handleMatchConfiguring(client, payload) {
  const matchId = payload.id || payload.match_id || payload.matchId;
  if (!matchId) {
    logger.warn('handleMatchConfiguring: match_id assente nel payload.');
    return;
  }

  const factions = extractFactions(payload);
  if (!factions) {
    logger.warn(`handleMatchConfiguring: nessun roster trovato per il match ${matchId}.`);
    return;
  }

  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    logger.error(`Guild ${config.guildId} non trovata.`);
    return;
  }

  const teamKeys = Object.keys(factions);
  const teamLabels = ['Team A', 'Team B'];
  const createdChannelIds = [];
  const unresolved = [];

  for (let i = 0; i < teamKeys.length; i++) {
    const key = teamKeys[i];
    const faction = factions[key];
    const roster = faction.roster || faction.players || [];
    const label = teamLabels[i] || `Team ${i + 1}`;

    let voiceChannel;
    try {
      voiceChannel = await guild.channels.create({
        name: `🔊 ${label} | ${String(matchId).slice(0, 8)}`,
        type: ChannelType.GuildVoice,
        parent: config.tempVcCategoryId || undefined,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
            ],
          },
        ],
      });
    } catch (err) {
      logger.error(`Errore creazione canale vocale per ${label}`, err);
      continue;
    }

    createdChannelIds.push(voiceChannel.id);

    for (const player of roster) {
      const faceitPlayerId = player.id || player.player_id || player.guid;
      const displayName = player.nickname || faceitPlayerId;

      const user = userRepository.findByFaceitId(faceitPlayerId);
      if (!user) {
        unresolved.push(`${displayName} (non collegato con /link)`);
        continue;
      }

      const member = await guild.members.fetch(user.discord_id).catch(() => null);
      if (!member) {
        unresolved.push(`${displayName} (membro non trovato sul server)`);
        continue;
      }

      await voiceChannel.permissionOverwrites
        .create(member, { Connect: true, ViewChannel: true, Speak: true })
        .catch((err) => logger.error(`Errore permessi canale per ${member.user.tag}`, err));

      // Verifica obbligatoria: spostiamo solo chi è già connesso a un canale vocale.
      if (!member.voice.channel) {
        unresolved.push(`${displayName} (non connesso a nessun canale vocale)`);
        logger.warn(`${member.user.tag} non è in un canale vocale: spostamento saltato.`);
        continue;
      }

      try {
        await member.voice.setChannel(voiceChannel);
      } catch (err) {
        unresolved.push(`${displayName} (errore spostamento: ${err.message})`);
        logger.error(`Errore spostando ${member.user.tag}`, err);
      }
    }
  }

  matchRepository.create(String(matchId), guild.id, createdChannelIds[0] || null, createdChannelIds[1] || null);

  if (unresolved.length) {
    logger.warn(`Match ${matchId}: ${unresolved.length} giocatori non spostati -> ${unresolved.join('; ')}`);
  }
}

/** Cleanup automatico dei canali vocali temporanei al termine del match. */
async function handleMatchFinished(client, payload) {
  const matchId = payload.id || payload.match_id || payload.matchId;
  if (!matchId) return;

  const match = matchRepository.find(String(matchId));
  if (!match) {
    logger.warn(`handleMatchFinished: nessun match attivo trovato per ${matchId}.`);
    return;
  }

  const guild = await client.guilds.fetch(match.guild_id).catch(() => null);
  if (guild) {
    for (const channelId of [match.team_a_channel_id, match.team_b_channel_id]) {
      if (!channelId) continue;
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        await channel
          .delete('Match Faceit concluso: cleanup automatico canali temporanei.')
          .catch((err) => logger.error(`Errore eliminazione canale temporaneo ${channelId}`, err));
      }
    }
  }

  matchRepository.remove(String(matchId));
}

module.exports = { handleMatchConfiguring, handleMatchFinished };
