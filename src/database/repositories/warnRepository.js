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

const insertStmt = db.prepare(`
  INSERT INTO mod_warns (guild_id, discord_id, reason, category, content, channel_id, automatic, staff_id, created_at)
  VALUES (@guild_id, @discord_id, @reason, @category, @content, @channel_id, @automatic, @staff_id, @created_at)
`);
const activeStmt = db.prepare(`
  SELECT * FROM mod_warns WHERE guild_id = ? AND discord_id = ? AND revoked = 0 AND created_at > ?
  ORDER BY created_at ASC
`);
const historyStmt = db.prepare(`
  SELECT * FROM mod_warns WHERE guild_id = ? AND discord_id = ? ORDER BY created_at DESC LIMIT ?
`);
const findStmt = db.prepare('SELECT * FROM mod_warns WHERE id = ?');
const revokeStmt = db.prepare('UPDATE mod_warns SET revoked = 1 WHERE id = ? AND revoked = 0');
const revokeAllStmt = db.prepare('UPDATE mod_warns SET revoked = 1 WHERE guild_id = ? AND discord_id = ? AND revoked = 0');

const now = () => Math.floor(Date.now() / 1000);

/** Registra un warn e restituisce il suo id. */
function add(entry) {
  const info = insertStmt.run({
    category: null,
    content: null,
    channel_id: null,
    automatic: 1,
    staff_id: null,
    created_at: now(),
    ...entry,
  });
  return info.lastInsertRowid;
}

/** I warn che contano ancora: non revocati e più recenti di `days` giorni. */
function active(guildId, discordId, days) {
  return activeStmt.all(guildId, discordId, now() - days * 86400);
}

function history(guildId, discordId, limit = 10) {
  return historyStmt.all(guildId, discordId, limit);
}

function find(id) {
  return findStmt.get(id) || null;
}

function revoke(id) {
  return revokeStmt.run(id).changes > 0;
}

function revokeAll(guildId, discordId) {
  return revokeAllStmt.run(guildId, discordId).changes;
}

module.exports = { add, active, history, find, revoke, revokeAll };
