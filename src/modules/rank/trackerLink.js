/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */

/**
 * Riconosce un link a un profilo tracker.gg e ne ricava il Riot ID.
 *
 * Il link è la prova che il giocatore ci porta, ma per chiedere il rank serve il
 * Riot ID: sta dentro l'indirizzo, codificato (`Nome%23TAG`), a volte seguito da
 * `/overview`, da parametri o dalla barra finale. Accettiamo tutte le varianti
 * invece di pretendere la forma esatta, che nessuno copia mai uguale.
 */

// https://tracker.gg/valorant/profile/riot/Nome%23TAG/overview
const TRACKER = /(?:https?:\/\/)?(?:www\.)?tracker\.gg\/valorant\/profile\/riot\/([^/\s?#]+)/i;

/** Il primo link tracker.gg valido dentro un testo, con il Riot ID già separato. */
function parse(text) {
  if (!text) return null;

  const match = TRACKER.exec(text);
  if (!match) return null;

  let riotId;
  try {
    riotId = decodeURIComponent(match[1]);
  } catch {
    // Percentuali malformate: meglio il valore grezzo che scartare tutto.
    riotId = match[1];
  }

  const separator = riotId.lastIndexOf('#');
  if (separator <= 0 || separator === riotId.length - 1) return null;

  const name = riotId.slice(0, separator).trim();
  const tag = riotId.slice(separator + 1).trim();
  if (!name || !tag) return null;

  return { url: match[0], riotId: `${name}#${tag}`, name, tag };
}

/** Vero se il testo contiene un link tracker.gg riconoscibile. */
function looksLikeTracker(text) {
  return Boolean(parse(text));
}

module.exports = { parse, looksLikeTracker, TRACKER };
