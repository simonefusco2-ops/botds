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

const ensureStmt = db.prepare('INSERT OR IGNORE INTO ihl_players (league, discord_id, elo) VALUES (?, ?, ?)');
const getStmt = db.prepare('SELECT * FROM ihl_players WHERE league = ? AND discord_id = ?');
const topStmt = db.prepare('SELECT * FROM ihl_players WHERE league = ? ORDER BY elo DESC, wins DESC LIMIT ?');

const applyResultStmt = db.prepare(`
  UPDATE ihl_players
  SET elo = MAX(?, elo + ?),
      wins = wins + ?,
      losses = losses + ?,
      matches = matches + 1,
      updated_at = datetime('now')
  WHERE league = ? AND discord_id = ?
`);

/**
  * Registra il giocatore alla prima partita con l'ELO iniziale.
  *
  * Tutte le funzioni qui sotto vogliono la lega come primo argomento: due
  * campionati separati significano due punteggi per la stessa persona, e
  * dimenticarsi la lega vorrebbe dire mescolarli.
  */
function ensure(league, discordId) {
  ensureStmt.run(league, discordId, ihlConfig.elo.starting);
  return getStmt.get(league, discordId);
}

function get(league, discordId) {
  return getStmt.get(league, discordId) || ensure(league, discordId);
}

/**
 * Come get, ma non crea la riga se manca: serve quando si consulta la posizione
 * di qualcuno, perché chi non ha mai giocato non deve comparire in classifica
 * solo per aver premuto un bottone.
 */
function find(league, discordId) {
  return getStmt.get(league, discordId) || null;
}

function getMany(league, discordIds) {
  return discordIds.map((id) => get(league, id));
}

function applyResult(league, discordId, delta, won) {
  applyResultStmt.run(ihlConfig.elo.floor, delta, won ? 1 : 0, won ? 0 : 1, league, discordId);
}

function top(league, limit = ihlConfig.leaderboardSize) {
  return topStmt.all(league, limit);
}

const pageStmt = db.prepare(
  'SELECT * FROM ihl_players WHERE league = ? ORDER BY elo DESC, wins DESC LIMIT ? OFFSET ?',
);

// Il nome visualizzato non è nella tabella dei giocatori: lo recuperiamo da
// member_tracking, che lo registra all'ingresso nel server. Serve al sito, che
// non può mostrare soltanto degli ID numerici.
const pageWithNamesStmt = db.prepare(`
  SELECT p.*, t.username
  FROM ihl_players p
  LEFT JOIN member_tracking t ON t.discord_id = p.discord_id
  WHERE p.league = ?
  ORDER BY p.elo DESC, p.wins DESC
  LIMIT ? OFFSET ?
`);
const findWithNameStmt = db.prepare(`
  SELECT p.*, t.username
  FROM ihl_players p
  LEFT JOIN member_tracking t ON t.discord_id = p.discord_id
  WHERE p.league = ? AND p.discord_id = ?
`);
const recentMatchesStmt = db.prepare('SELECT * FROM ihl_matches WHERE league = ? ORDER BY id DESC LIMIT ?');
const lastUpdateStmt = db.prepare('SELECT MAX(updated_at) AS updated_at FROM ihl_players WHERE league = ?');
const countStmt = db.prepare('SELECT COUNT(*) AS total FROM ihl_players WHERE league = ?');
const rankStmt = db.prepare('SELECT COUNT(*) + 1 AS rank FROM ihl_players WHERE league = ? AND elo > ?');

const setEloStmt = db.prepare(
  "UPDATE ihl_players SET elo = MAX(?, ?), updated_at = datetime('now') WHERE league = ? AND discord_id = ?",
);

const recordMatchStmt = db.prepare(`
  INSERT INTO ihl_matches (league, lobby_id, discord_id, team, won, elo_before, elo_after, map)
  VALUES (@league, @lobby_id, @discord_id, @team, @won, @elo_before, @elo_after, @map)
`);

const historyStmt = db.prepare(
  'SELECT * FROM ihl_matches WHERE league = ? AND discord_id = ? ORDER BY id DESC LIMIT ?',
);

/** Pagina della classifica, per il pannello sfogliabile. */
function page(league, limit, offset) {
  return pageStmt.all(league, limit, offset);
}

function count(league) {
  return countStmt.get(league).total;
}

/** Pagina della classifica con il nome visualizzato: usata dall'API del sito. */
function pageWithNames(league, limit, offset) {
  return pageWithNamesStmt.all(league, limit, offset);
}

function findWithName(league, discordId) {
  return findWithNameStmt.get(league, discordId) || null;
}

/** Ultime righe registrate, una per giocatore per partita. */
function recentMatches(league, limit) {
  return recentMatchesStmt.all(league, limit);
}

/** Quando è stato assegnato l'ultimo punto: diventa l'`updated_at` dell'API. */
function lastUpdate(league) {
  return lastUpdateStmt.get(league).updated_at || null;
}

/** Posizione in classifica di un ELO: quanti lo superano, più uno. */
function rankOf(league, elo) {
  return rankStmt.get(league, elo).rank;
}

/** Correzione manuale da parte dello staff: rispetta comunque la soglia minima. */
function setElo(league, discordId, elo) {
  ensure(league, discordId);
  setEloStmt.run(ihlConfig.elo.floor, elo, league, discordId);
  return get(league, discordId);
}

function recordMatch(entry) {
  recordMatchStmt.run({ map: null, ...entry });
}

function history(league, discordId, limit = 10) {
  return historyStmt.all(league, discordId, limit);
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
  WHERE league = ? AND discord_id = ?
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
    revertStmt.run(ihlConfig.elo.floor, delta, row.won ? 1 : 0, row.won ? 0 : 1, row.league, row.discord_id);
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
  pageWithNames,
  findWithName,
  recentMatches,
  lastUpdate,
  setElo,
  recordMatch,
  history,
  matchesOfLobby,
  voidMatch,
};
