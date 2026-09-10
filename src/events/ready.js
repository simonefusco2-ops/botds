const logger = require('../utils/logger');
const leaderboardManager = require('../modules/leaderboard/leaderboardManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot connesso come ${client.user.tag}`);
    await leaderboardManager.updateLeaderboardMessage(client).catch((err) => {
      logger.error('Errore aggiornamento iniziale leaderboard', err);
    });
  },
};
