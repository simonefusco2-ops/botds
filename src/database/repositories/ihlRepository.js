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
const ihlConfig = require('../../../config/ihl.config');

const ensureStmt = db.prepare('INSERT OR IGNORE INTO ihl_players (discord_id, elo) VALUES (?, ?)');
const getStmt = db.prepare('SELECT * FROM ihl_players WHERE discord_id = ?');
const topStmt = db.prepare('SELECT * FROM ihl_players ORDER BY elo DESC, wins DESC LIMIT ?');

const applyResultStmt = db.prepare(`
  UPDATE ihl_players
  SET elo = MAX(?, elo + ?),
      wins = wins + ?,
      losses = losses + ?,
      matches = matches + 1,
      updated_at = datetime('now')
  WHERE discord_id = ?
`);

/** Registra il giocatore alla prima partita con l'ELO iniziale. */
function ensure(discordId) {
  ensureStmt.run(discordId, ihlConfig.elo.starting);
  return getStmt.get(discordId);
}

function get(discordId) {
  return getStmt.get(discordId) || ensure(discordId);
}

/**
 * Come get, ma non crea la riga se manca: serve quando si consulta la posizione
 * di qualcuno, perché chi non ha mai giocato non deve comparire in classifica
 * solo per aver premuto un bottone.
 */
function find(discordId) {
  return getStmt.get(discordId) || null;
}

function getMany(discordIds) {
  return discordIds.map((id) => get(id));
}

function applyResult(discordId, delta, won) {
  applyResultStmt.run(ihlConfig.elo.floor, delta, won ? 1 : 0, won ? 0 : 1, discordId);
}

function top(limit = ihlConfig.leaderboardSize) {
  return topStmt.all(limit);
}

const pageStmt = db.prepare('SELECT * FROM ihl_players ORDER BY elo DESC, wins DESC LIMIT ? OFFSET ?');
const countStmt = db.prepare('SELECT COUNT(*) AS total FROM ihl_players');
const rankStmt = db.prepare('SELECT COUNT(*) + 1 AS rank FROM ihl_players WHERE elo > ?');

const setEloStmt = db.prepare(
  "UPDATE ihl_players SET elo = MAX(?, ?), updated_at = datetime('now') WHERE discord_id = ?",
);

const recordMatchStmt = db.prepare(`
  INSERT INTO ihl_matches (lobby_id, discord_id, team, won, elo_before, elo_after, map)
  VALUES (@lobby_id, @discord_id, @team, @won, @elo_before, @elo_after, @map)
`);

const historyStmt = db.prepare(
  'SELECT * FROM ihl_matches WHERE discord_id = ? ORDER BY id DESC LIMIT ?',
);

/** Pagina della classifica, per il pannello sfogliabile. */
function page(limit, offset) {
  return pageStmt.all(limit, offset);
}

function count() {
  return countStmt.get().total;
}

/** Posizione in classifica di un ELO: quanti lo superano, più uno. */
function rankOf(elo) {
  return rankStmt.get(elo).rank;
}

/** Correzione manuale da parte dello staff: rispetta comunque la soglia minima. */
function setElo(discordId, elo) {
  ensure(discordId);
  setEloStmt.run(ihlConfig.elo.floor, elo, discordId);
  return get(discordId);
}

function recordMatch(entry) {
  recordMatchStmt.run({ map: null, ...entry });
}

function history(discordId, limit = 10) {
  return historyStmt.all(discordId, limit);
}

const matchesByLobbyStmt = db.prepare('SELECT * FROM ihl_matches WHERE lobby_id = ? AND voided = 0');
const markVoidedStmt = db.prepare('UPDATE ihl_matches SET voided = 1 WHERE lobby_id = ?');

const revertStmt = db.prepare(`
  UPDATE ihl_players
  SET elo = MAX(?, elo - ?),
      wins = MAX(0, wins - ?),
      losses = MAX(0, losses - ?),
      matches = MAX(0, matches - 1),
      updated_at = datetime('now')
  WHERE discord_id = ?
`);

function matchesOfLobby(lobbyId) {
  return matchesByLobbyStmt.all(lobbyId);
}

/**
 * Rimborsa una partita già conclusa.
 *
 * Si sottrae la variazione applicata a suo tempo invece di riscrivere il vecchio
 * valore assoluto: così le partite giocate dopo quella annullata restano valide.
 * L'operazione è in transazione, perché un rimborso a metà lascerebbe la
 * classifica incoerente.
 */
const voidMatch = db.transaction((lobbyId) => {
  const rows = matchesByLobbyStmt.all(lobbyId);
  if (!rows.length) return [];

  for (const row of rows) {
    const delta = row.elo_after - row.elo_before;
    revertStmt.run(ihlConfig.elo.floor, delta, row.won ? 1 : 0, row.won ? 0 : 1, row.discord_id);
  }

  markVoidedStmt.run(lobbyId);
  return rows;
});

module.exports = {
  ensure,
  get,
  getMany,
  applyResult,
  top,
  page,
  count,
  rankOf,
  find,
  setElo,
  recordMatch,
  history,
  matchesOfLobby,
  voidMatch,
};
