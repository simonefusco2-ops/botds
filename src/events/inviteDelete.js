const inviteTracker = require('../modules/memberLog/inviteTracker');

module.exports = {
  name: 'inviteDelete',
  execute(invite) {
    inviteTracker.removeFromCache(invite);
  },
};
