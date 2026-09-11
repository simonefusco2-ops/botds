const db = require('../db');

const addStmt = db.prepare(`
  INSERT INTO twitch_streamers (login, display_name, added_by)
  VALUES (?, ?, ?)
  ON CONFLICT(login) DO UPDATE SET display_name = excluded.display_name
`);

const removeStmt = db.prepare('DELETE FROM twitch_streamers WHERE login = ?');
const listStmt = db.prepare('SELECT * FROM twitch_streamers ORDER BY login ASC');
const findStmt = db.prepare('SELECT * FROM twitch_streamers WHERE login = ?');
const setLiveStmt = db.prepare('UPDATE twitch_streamers SET is_live = 1, last_stream_id = ? WHERE login = ?');
const setOfflineStmt = db.prepare('UPDATE twitch_streamers SET is_live = 0 WHERE login = ?');

function add(login, displayName, addedBy) {
  addStmt.run(login, displayName, addedBy);
}

function remove(login) {
  return removeStmt.run(login).changes > 0;
}

function list() {
  return listStmt.all();
}

function find(login) {
  return findStmt.get(login);
}

function setLive(login, streamId) {
  setLiveStmt.run(streamId, login);
}

function setOffline(login) {
  setOfflineStmt.run(login);
}

module.exports = { add, remove, list, find, setLive, setOffline };
