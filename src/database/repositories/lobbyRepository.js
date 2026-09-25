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
  "INSERT INTO ihl_lobbies (guild_id, channel_id, state) VALUES (?, ?, 'queue')",
);
const findStmt = db.prepare('SELECT * FROM ihl_lobbies WHERE id = ?');
const findOpenStmt = db.prepare(
  "SELECT * FROM ihl_lobbies WHERE channel_id = ? AND state != 'closed' ORDER BY id DESC LIMIT 1",
);
const listActiveStmt = db.prepare("SELECT * FROM ihl_lobbies WHERE state != 'closed'");
const deleteStmt = db.prepare('DELETE FROM ihl_lobbies WHERE id = ?');

const JSON_FIELDS = ['players', 'team_a', 'team_b', 'banned_maps', 'map_pool'];

/** Le liste sono salvate come JSON: qui vengono riportate ad array. */
function hydrate(row) {
  if (!row) return null;

  const lobby = { ...row };
  for (const field of JSON_FIELDS) {
    try {
      lobby[field] = JSON.parse(row[field] || '[]');
    } catch {
      lobby[field] = [];
    }
  }
  return lobby;
}

function create(guildId, channelId) {
  const { lastInsertRowid } = createStmt.run(guildId, channelId);
  return hydrate(findStmt.get(lastInsertRowid));
}

function find(id) {
  return hydrate(findStmt.get(id));
}

function findOpenInChannel(channelId) {
  return hydrate(findOpenStmt.get(channelId));
}

function listActive() {
  return listActiveStmt.all().map(hydrate);
}

/** Aggiorna solo i campi passati, serializzando le liste. */
function update(id, fields) {
  const entries = Object.entries(fields);
  if (!entries.length) return find(id);

  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([key, value]) =>
    JSON_FIELDS.includes(key) || Array.isArray(value) ? JSON.stringify(value) : value,
  );

  db.prepare(`UPDATE ihl_lobbies SET ${assignments} WHERE id = ?`).run(...values, id);
  return find(id);
}

function remove(id) {
  deleteStmt.run(id);
}

module.exports = { create, find, findOpenInChannel, listActive, update, remove };
