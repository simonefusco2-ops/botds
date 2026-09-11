const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (!config.autoRoleId) return;

    try {
      await member.roles.add(config.autoRoleId);
      logger.info(`Ruolo automatico assegnato a ${member.user.tag}`);
    } catch (err) {
      logger.error(`Errore assegnazione ruolo automatico a ${member.user.tag}`, err);
    }
  },
};
