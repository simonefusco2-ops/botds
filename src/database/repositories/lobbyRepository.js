/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const db = require('../db');

const createStmt = db.prepare(
  "INSERT INTO ihl_lobbies (league, guild_id, channel_id, state) VALUES (?, ?, ?, 'queue')",
);
const findStmt = db.prepare('SELECT * FROM ihl_lobbies WHERE id = ?');
const findQueueStmt = db.prepare(
  "SELECT * FROM ihl_lobbies WHERE channel_id = ? AND state = 'queue' ORDER BY id DESC LIMIT 1",
);
const findOpenStmt = db.prepare(
  "SELECT * FROM ihl_lobbies WHERE channel_id = ? AND state != 'closed' ORDER BY id DESC LIMIT 1",
);
const listActiveStmt = db.prepare("SELECT * FROM ihl_lobbies WHERE state != 'closed'");
const findByCheckinVoiceStmt = db.prepare(
  "SELECT * FROM ihl_lobbies WHERE checkin_voice_id = ? AND state = 'checkin' LIMIT 1",
);
const listWithMessageStmt = db.prepare(
  'SELECT * FROM ihl_lobbies WHERE channel_id = ? AND message_id IS NOT NULL ORDER BY id',
);
const deleteStmt = db.prepare('DELETE FROM ihl_lobbies WHERE id = ?');

// Campi salvati come JSON, con il valore neutro da usare quando sono vuoti.
const JSON_DEFAULTS = {
  players: '[]',
  team_a: '[]',
  team_b: '[]',
  banned_maps: '[]',
  map_pool: '[]',
  votes: '{}',
};

function hydrate(row) {
  if (!row) return null;

  const lobby = { ...row };
  for (const [field, fallback] of Object.entries(JSON_DEFAULTS)) {
    try {
      lobby[field] = JSON.parse(row[field] || fallback);
    } catch {
      lobby[field] = JSON.parse(fallback);
    }
  }
  return lobby;
}

function create(league, guildId, channelId) {
  const { lastInsertRowid } = createStmt.run(league, guildId, channelId);
  return hydrate(findStmt.get(lastInsertRowid));
}

function find(id) {
  return hydrate(findStmt.get(id));
}

function findOpenInChannel(channelId) {
  return hydrate(findOpenStmt.get(channelId));
}

/** La lobby ancora in raccolta: con più partite contemporanee ce n'è una sola così. */
function findQueueInChannel(channelId) {
  return hydrate(findQueueStmt.get(channelId));
}

function listActive() {
  return listActiveStmt.all().map(hydrate);
}

/** La partita in attesa di check-in su quel vocale di ritrovo, se c'è. */
function findByCheckinVoice(channelId) {
  return hydrate(findByCheckinVoiceStmt.get(channelId));
}

/** Lobby che hanno ancora una scheda pubblicata nel canale, da ripulire alla chiusura. */
function listWithMessage(channelId) {
  return listWithMessageStmt.all(channelId).map(hydrate);
}

/** Aggiorna solo i campi passati, serializzando le liste. */
function update(id, fields) {
  const entries = Object.entries(fields);
  if (!entries.length) return find(id);

  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([key, value]) =>
    key in JSON_DEFAULTS || Array.isArray(value) || (value && typeof value === 'object')
      ? JSON.stringify(value)
      : value,
  );

  db.prepare(`UPDATE ihl_lobbies SET ${assignments} WHERE id = ?`).run(...values, id);
  return find(id);
}

function remove(id) {
  deleteStmt.run(id);
}

module.exports = {
  create,
  find,
  findOpenInChannel,
  findQueueInChannel,
  findByCheckinVoice,
  listActive,
  listWithMessage,
  update,
  remove,
};
