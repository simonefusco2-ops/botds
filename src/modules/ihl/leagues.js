/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const ihlConfig = require('../../../config/ihl.config');
const { toSmallCaps } = require('../../utils/smallCaps');

/**
 * Le leghe della In-House League.
 *
 * Ogni lega è un campionato a sé: pannello, code, partite, ELO e classifica
 * separati. Condividono solo le regole (dimensione della coda, mappe, timer).
 * L'identificatore viaggia dentro i bottoni e nel database, quindi tutto il
 * resto del codice non deve mai indovinare a quale lega appartiene qualcosa.
 */

/** La lega usata quando un comando non ne indica una. */
function fallback() {
  return ihlConfig.leagues[0];
}

function all() {
  return ihlConfig.leagues;
}

/** La lega con quell'id, o quella predefinita se l'id non esiste più. */
function find(id) {
  return ihlConfig.leagues.find((league) => league.id === id) || fallback();
}

function exists(id) {
  return ihlConfig.leagues.some((league) => league.id === id);
}

/** Scelte per le opzioni dei comandi. */
function choices() {
  return ihlConfig.leagues.map((league) => ({ name: `${league.emoji} ${league.name}`, value: league.id }));
}

/** Chiave di impostazione dedicata alla lega: ogni lega ricorda le sue cose. */
function settingsKey(base, leagueId) {
  return `${base}:${leagueId}`;
}

/** Nome del canale del pannello secondo lo stato delle code. */
function channelName(league, open) {
  const raw = open ? league.channelNames.open : league.channelNames.closed;
  return ihlConfig.channelNamesSmallCaps ? toSmallCaps(raw) : raw;
}

/** Dove va la cronaca delle partite di questa lega. */
function historyChannelId(league) {
  return league.historyChannelId || ihlConfig.historyChannelId || null;
}

/** Categoria che ospita le stanze temporanee di questa lega. */
function categoryId(league) {
  return league.categoryId || ihlConfig.categoryId || null;
}

/** Etichetta pronta da mettere nei titoli. */
function label(league) {
  return `${league.emoji}  ${league.name}`;
}

module.exports = {
  all,
  find,
  exists,
  fallback,
  choices,
  settingsKey,
  channelName,
  historyChannelId,
  categoryId,
  label,
};
