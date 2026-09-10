const logger = require('../../utils/logger');

/** Registra gli eventi di discord-player (eseguiti fuori dal thread principale degli handler Discord). */
function registerPlayerEvents(client) {
  client.player.events.on('playerStart', (queue, track) => {
    queue.metadata?.channel?.send(`🎶 Ora in riproduzione: **${track.title}**`).catch(() => {});
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
