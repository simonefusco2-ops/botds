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
  INSERT INTO ihl_sanctions (kind, discord_id, league, lobby_id, until, reason, staff_id, created_at)
  VALUES (@kind, @discord_id, @league, @lobby_id, @until, @reason, @staff_id, @created_at)
`);
const activeStmt = db.prepare(`
  SELECT * FROM ihl_sanctions
  WHERE kind = 'sospensione' AND discord_id = ? AND revoked = 0 AND until > ?
  ORDER BY until DESC LIMIT 1
`);
const revokeStmt = db.prepare(`
  UPDATE ihl_sanctions SET revoked = 1
  WHERE kind = 'sospensione' AND discord_id = ? AND revoked = 0 AND until > ?
`);
const trollOfLobbyStmt = db.prepare("SELECT * FROM ihl_sanctions WHERE kind = 'troll' AND lobby_id = ? LIMIT 1");

const now = () => Math.floor(Date.now() / 1000);

function add(entry) {
  insertStmt.run({ league: null, lobby_id: null, until: null, reason: null, staff_id: null, created_at: now(), ...entry });
}

/** La sospensione in corso più lunga, o null. */
function activeSuspension(discordId) {
  return activeStmt.get(discordId, now()) || null;
}

/** Revoca le sospensioni ancora attive; restituisce quante erano. */
function revokeSuspensions(discordId) {
  return revokeStmt.run(discordId, now()).changes;
}

function trollOfLobby(lobbyId) {
  return trollOfLobbyStmt.get(lobbyId) || null;
}

module.exports = { add, activeSuspension, revokeSuspensions, trollOfLobby };
