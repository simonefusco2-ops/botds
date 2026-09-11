const logger = require('../utils/logger');
const memberLogger = require('../modules/memberLog/memberLogger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    await memberLogger.logLeave(member).catch((err) => {
      logger.error(`Errore log uscita di ${member.user?.tag || member.id}`, err);
    });
  },
};
