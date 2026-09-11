/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const logger = require('../../utils/logger');
const { buildNowPlayingEmbed } = require('../../utils/embeds');

/** Registra gli eventi di discord-player (eseguiti fuori dal thread principale degli handler Discord). */
function registerPlayerEvents(client) {
  client.player.events.on('playerStart', (queue, track) => {
    const embed = buildNowPlayingEmbed(track);
    queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => {});
  });

  client.player.events.on('emptyQueue', (queue) => {
    queue.metadata?.channel?.send('📭 Coda terminata, il bot lascerà il canale vocale.').catch(() => {});
  });

  client.player.events.on('error', (queue, error) => {
    logger.error('Errore generale del player', error);
  });

  client.player.events.on('playerError', (queue, error) => {
    logger.error('Errore durante la riproduzione', error);
  });
}

module.exports = { registerPlayerEvents };
