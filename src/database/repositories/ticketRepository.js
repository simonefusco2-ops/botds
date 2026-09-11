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

const createStmt = db.prepare('INSERT INTO tickets (channel_id, guild_id, owner_id, type) VALUES (?, ?, ?, ?)');
const findByChannelStmt = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'");
const findOpenByOwnerStmt = db.prepare(
  "SELECT * FROM tickets WHERE guild_id = ? AND owner_id = ? AND type = ? AND status = 'open'",
);
const closeStmt = db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?");

function create(channelId, guildId, ownerId, type) {
  createStmt.run(channelId, guildId, ownerId, type);
}

function findByChannel(channelId) {
  return findByChannelStmt.get(channelId);
}

/** Un utente può avere un ticket aperto per ogni tipo, non uno solo in assoluto. */
function findOpenByOwnerAndType(guildId, ownerId, type) {
  return findOpenByOwnerStmt.get(guildId, ownerId, type);
}

function close(channelId) {
  closeStmt.run(channelId);
}

module.exports = { create, findByChannel, findOpenByOwnerAndType, close };
