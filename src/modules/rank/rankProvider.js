/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const rankConfig = require('../../../config/rank.config');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Chiede il rank attuale di un Riot ID al servizio configurato.
 *
 * Riot non espone pubblicamente il rank di Valorant, quindi ci si appoggia a un
 * servizio di terze parti: può cambiare, rallentare o smettere di rispondere.
 * Per questo il fallimento non è un errore fatale — lo staff riceve comunque la
 * richiesta e decide a mano.
 */

/** Il rank configurato che corrisponde al nome restituito dal servizio. */
function matchRank(label) {
  if (!label) return null;
  const lower = label.toLowerCase();
  return rankConfig.ranks.find((rank) => rank.match.some((word) => lower.includes(word))) || null;
}

/** Il numero romano/arabo dopo il nome: "Immortal 2" → 2. */
function tierNumber(label) {
  const match = /(\d+)\s*$/.exec(label || '');
  return match ? Number(match[1]) : null;
}

function buildUrl({ name, tag }) {
  return rankConfig.provider.url
    .replace('{region}', encodeURIComponent(rankConfig.provider.region))
    .replace('{name}', encodeURIComponent(name))
    .replace('{tag}', encodeURIComponent(tag));
}

/**
 * Legge la risposta del servizio.
 *
 * Il formato di HenrikDev annida il rank corrente sotto `data.current_data`;
 * accettiamo anche le varianti più vecchie, così un cambio di versione non
 * manda tutto all'aria.
 */
function readPayload(body) {
  const data = body?.data || body;
  const current = data?.current_data || data?.currentdata || data;

  const label =
    current?.currenttierpatched || current?.currenttier_patched || current?.tier?.name || null;

  const peak =
    data?.highest_rank?.patched_tier || data?.highest_rank?.tier?.name || data?.highestrankpatched || null;

  return {
    label,
    peak,
    rr: current?.ranking_in_tier ?? current?.rr ?? null,
    elo: current?.elo ?? null,
  };
}

/**
 * @returns {Promise<{ok: boolean, label?: string, rank?: object, tier?: number,
 *                     peak?: string, rr?: number, reason?: string}>}
 */
async function fetchRank({ name, tag }) {
  const headers = { 'User-Agent': 'IvpiterBot/1.0' };
  if (config.rankApiKey) headers.Authorization = config.rankApiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), rankConfig.provider.timeoutMs);

  try {
    const response = await fetch(buildUrl({ name, tag }), { headers, signal: controller.signal });

    if (response.status === 404) return { ok: false, reason: 'Riot ID non trovato dal servizio.' };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'Il servizio ha rifiutato la chiamata: controlla HENRIK_API_KEY nel .env.' };
    }
    if (response.status === 429) return { ok: false, reason: 'Troppe richieste al servizio: riprova fra poco.' };
    if (!response.ok) return { ok: false, reason: `Il servizio ha risposto HTTP ${response.status}.` };

    const body = await response.json();
    const { label, peak, rr, elo } = readPayload(body);

    if (!label) return { ok: false, reason: 'Il servizio non ha restituito nessun rank (mai giocato in competitiva?).' };

    const rank = matchRank(label);
    if (!rank) return { ok: false, reason: `Rank "${label}" non riconosciuto: aggiungilo in config/rank.config.js.` };

    return { ok: true, label, rank, tier: tierNumber(label), peak, rr, elo };
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'Il servizio non ha risposto in tempo.' : err.message;
    logger.warn(`Rank: richiesta per ${name}#${tag} fallita: ${reason}`);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/** La lega in cui finisce chi ha quel rank. */
function leagueOf(rank) {
  return rank?.league || 'open';
}

/**
 * Vero se quel rank richiede il via libera dello staff.
 *
 * Sotto la soglia il bot assegna da solo: sbagliare lì costa poco. Sopra, dove
 * il rank decide l'accesso alla Pro, vogliamo un occhio umano sul profilo.
 */
function needsApproval(rank) {
  if (!rank) return true;

  const order = rankConfig.ranks.findIndex((entry) => entry.name === rank.name);
  const threshold = rankConfig.ranks.findIndex((entry) => entry.name === rankConfig.approvalFrom);

  if (order === -1 || threshold === -1) return true;
  return order >= threshold;
}

module.exports = { fetchRank, matchRank, tierNumber, leagueOf, needsApproval, buildUrl, readPayload };
