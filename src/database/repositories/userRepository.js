const db = require('../db');

const upsertStmt = db.prepare(`
  INSERT INTO users (discord_id, faceit_player_id, faceit_nickname)
  VALUES (@discord_id, @faceit_player_id, @faceit_nickname)
  ON CONFLICT(discord_id) DO UPDATE SET
    faceit_player_id = excluded.faceit_player_id,
    faceit_nickname = excluded.faceit_nickname
`);

const findByFaceitIdStmt = db.prepare('SELECT * FROM users WHERE faceit_player_id = ?');
const findByDiscordIdStmt = db.prepare('SELECT * FROM users WHERE discord_id = ?');
const incrementStmt = db.prepare(
  'UPDATE users SET matches_played = matches_played + 1, wins = wins + ? WHERE discord_id = ?',
);
const topStmt = db.prepare('SELECT * FROM users ORDER BY wins DESC, matches_played ASC LIMIT ?');

function link(discordId, faceitPlayerId, faceitNickname) {
  upsertStmt.run({ discord_id: discordId, faceit_player_id: faceitPlayerId, faceit_nickname: faceitNickname });
}

function findByFaceitId(faceitPlayerId) {
  return findByFaceitIdStmt.get(faceitPlayerId);
}

function findByDiscordId(discordId) {
  return findByDiscordIdStmt.get(discordId);
}

function recordMatchResult(discordId, isWinner) {
  incrementStmt.run(isWinner ? 1 : 0, discordId);
}

function getTop(limit = 10) {
  return topStmt.all(limit);
}

module.exports = { link, findByFaceitId, findByDiscordId, recordMatchResult, getTop };
