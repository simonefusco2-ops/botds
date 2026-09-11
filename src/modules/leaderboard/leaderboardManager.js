/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const userRepository = require('../../database/repositories/userRepository');
const settingsRepository = require('../../database/repositories/settingsRepository');
const { buildLeaderboardEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const config = require('../../config');

/** Aggiorna wins/matches_played per ogni giocatore collegato in base al risultato del match. */
function processMatchResult(payload) {
  const factions = payload.teams || payload.factions;
  const winnerKey = payload.winner;

  if (!factions) {
    logger.warn('processMatchResult: payload senza roster dei team.');
    return;
  }

  for (const [key, faction] of Object.entries(factions)) {
    const roster = faction.roster || faction.players || [];
    const isWinner = key === winnerKey;

    for (const player of roster) {
      const faceitPlayerId = player.id || player.player_id || player.guid;
      const user = userRepository.findByFaceitId(faceitPlayerId);
      if (!user) {
        logger.warn(`Giocatore Faceit ${faceitPlayerId} non collegato a nessun account Discord.`);
        continue;
      }
      userRepository.recordMatchResult(user.discord_id, isWinner);
    }
  }
}

/** Crea o aggiorna (message.edit) il singolo embed persistente della classifica. */
async function updateLeaderboardMessage(client) {
  const channelId = settingsRepository.get('leaderboard_channel_id') || config.leaderboardChannelId;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    logger.warn('Canale leaderboard non trovato.');
    return;
  }

  const rows = userRepository.getTop(config.leaderboardTopN);
  const embed = buildLeaderboardEmbed(rows);

  const messageId = settingsRepository.get('leaderboard_message_id');
  if (messageId) {
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message) {
      await message.edit({ embeds: [embed] });
      return;
    }
  }

  const sent = await channel.send({ embeds: [embed] });
  settingsRepository.set('leaderboard_channel_id', channelId);
  settingsRepository.set('leaderboard_message_id', sent.id);
}

module.exports = { processMatchResult, updateLeaderboardMessage };
