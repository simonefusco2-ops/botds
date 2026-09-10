const db = require('../db');

const createStmt = db.prepare(`
  INSERT INTO active_matches (match_id, guild_id, team_a_channel_id, team_b_channel_id)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(match_id) DO UPDATE SET
    team_a_channel_id = excluded.team_a_channel_id,
    team_b_channel_id = excluded.team_b_channel_id
`);
const findStmt = db.prepare('SELECT * FROM active_matches WHERE match_id = ?');
const removeStmt = db.prepare('DELETE FROM active_matches WHERE match_id = ?');

function create(matchId, guildId, teamAChannelId, teamBChannelId) {
  createStmt.run(matchId, guildId, teamAChannelId, teamBChannelId);
}

function find(matchId) {
  return findStmt.get(matchId);
}

function remove(matchId) {
  removeStmt.run(matchId);
}

module.exports = { create, find, remove };
