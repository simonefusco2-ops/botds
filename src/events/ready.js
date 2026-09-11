const config = require('../config');
const logger = require('../utils/logger');
const leaderboardManager = require('../modules/leaderboard/leaderboardManager');
const inviteTracker = require('../modules/memberLog/inviteTracker');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot connesso come ${client.user.tag}`);

    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (guild) await inviteTracker.primeCache(guild);

    await leaderboardManager.updateLeaderboardMessage(client).catch((err) => {
      logger.error('Errore aggiornamento iniziale leaderboard', err);
    });
  },
};
