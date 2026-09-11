const inviteTracker = require('../modules/memberLog/inviteTracker');

module.exports = {
  name: 'inviteCreate',
  execute(invite) {
    inviteTracker.addToCache(invite);
  },
};
