const db = require('../db');

const recordJoinStmt = db.prepare(`
  INSERT INTO member_tracking (discord_id, guild_id, username, invite_code, inviter_id, joined_at, left_at)
  VALUES (@discord_id, @guild_id, @username, @invite_code, @inviter_id, @joined_at, NULL)
  ON CONFLICT(discord_id) DO UPDATE SET
    username = excluded.username,
    invite_code = excluded.invite_code,
    inviter_id = excluded.inviter_id,
    joined_at = excluded.joined_at,
    left_at = NULL
`);

const recordLeaveStmt = db.prepare('UPDATE member_tracking SET left_at = ? WHERE discord_id = ?');
const findStmt = db.prepare('SELECT * FROM member_tracking WHERE discord_id = ?');

const countByInviterStmt = db.prepare(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN left_at IS NULL THEN 1 ELSE 0 END) AS still_in
  FROM member_tracking
  WHERE inviter_id = ?
`);

const topInvitersStmt = db.prepare(`
  SELECT
    inviter_id,
    COUNT(*) AS total,
    SUM(CASE WHEN left_at IS NULL THEN 1 ELSE 0 END) AS still_in
  FROM member_tracking
  WHERE inviter_id IS NOT NULL
  GROUP BY inviter_id
  ORDER BY total DESC, still_in DESC
  LIMIT ?
`);

function recordJoin({ discordId, guildId, username, inviteCode, inviterId, joinedAt }) {
  recordJoinStmt.run({
    discord_id: discordId,
    guild_id: guildId,
    username,
    invite_code: inviteCode,
    inviter_id: inviterId,
    joined_at: joinedAt,
  });
}

function recordLeave(discordId, leftAt) {
  recordLeaveStmt.run(leftAt, discordId);
}

function find(discordId) {
  return findStmt.get(discordId);
}

function countByInviter(inviterId) {
  const row = countByInviterStmt.get(inviterId);
  return { total: row?.total || 0, stillIn: row?.still_in || 0 };
}

function topInviters(limit = 10) {
  return topInvitersStmt.all(limit);
}

module.exports = { recordJoin, recordLeave, find, countByInviter, topInviters };
