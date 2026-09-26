/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const express = require('express');
const config = require('../../config');
const logger = require('../../utils/logger');
const ihlRepository = require('../../database/repositories/ihlRepository');
const ihlConfig = require('../../../config/ihl.config');
const leagues = require('../ihl/leagues');

/**
 * API di sola lettura per il sito ivpiter.it.
 *
 * Vive sul server HTTP del bot (httpServer.js) e legge direttamente il
 * database del bot: quello che vedi qui è sempre allineato alla classifica su
 * Discord, senza esportazioni manuali. Tutti gli endpoint sono GET.
 *
 * La documentazione per chi sviluppa il sito è in docs/INTEGRAZIONE-SITO.md.
 */
const BASE = '/api/v1';
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const MAX_MATCHES = 200;

// Finestra di conteggio delle richieste per IP: evita che un ciclo impazzito
// del sito martelli il bot, senza aggiungere dipendenze.
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > config.apiRateLimit;
}

// Le finestre scadute non servono più: senza questo la mappa crescerebbe per sempre.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) if (now > entry.reset) hits.delete(ip);
}, RATE_WINDOW_MS);
cleanup.unref?.();

function winrate(player) {
  return player.matches ? Math.round((player.wins / player.matches) * 1000) / 10 : 0;
}

/** Forma pubblica di un giocatore: nessun dato che non sia già visibile su Discord. */
function toPlayer(player, rank) {
  return {
    rank,
    discord_id: player.discord_id,
    name: player.username || null,
    elo: player.elo,
    wins: player.wins,
    losses: player.losses,
    matches: player.matches,
    winrate: winrate(player),
    updated_at: player.updated_at,
  };
}

function toMatchRow(row) {
  return {
    match_id: row.lobby_id,
    discord_id: row.discord_id,
    team: row.team,
    won: Boolean(row.won),
    elo_before: row.elo_before,
    elo_after: row.elo_after,
    elo_change: row.elo_after - row.elo_before,
    map: row.map,
    voided: Boolean(row.voided),
    played_at: row.played_at,
  };
}

/** Le righe dello storico raggruppate per partita, come le vedrebbe il sito. */
function groupMatches(rows) {
  const matches = new Map();

  for (const row of rows) {
    if (!matches.has(row.lobby_id)) {
      matches.set(row.lobby_id, {
        match_id: row.lobby_id,
        map: row.map,
        voided: Boolean(row.voided),
        played_at: row.played_at,
        winner: null,
        teams: { a: [], b: [] },
      });
    }

    const match = matches.get(row.lobby_id);
    match.teams[row.team]?.push(toMatchRow(row));
    if (row.won) match.winner = row.team;
  }

  return [...matches.values()];
}

/** La lega richiesta, o quella predefinita: il sito può chiedere ?lega=open. */
function readLeague(query) {
  return leagues.find(query.lega || query.league);
}

function readPaging(query) {
  const size = Math.min(Math.max(parseInt(query.size, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { size, page, offset: (page - 1) * size };
}

function mountPublicApi(app) {
  const api = express.Router();

  // Il sito gira su un altro dominio: senza questi header il browser blocca la
  // risposta. Si può restringere a un dominio solo con API_ALLOWED_ORIGIN.
  api.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', config.apiAllowedOrigin);
    res.set('Access-Control-Allow-Headers', 'X-Api-Token, Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Cache-Control', `public, max-age=${config.apiCacheSeconds}`);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    if (rateLimited(ip)) return res.status(429).json({ error: 'too_many_requests' });

    // Il token è facoltativo: la classifica è pubblica già su Discord. Se però
    // API_TOKEN è impostato, viene richiesto su ogni chiamata.
    if (config.apiToken) {
      const provided = req.headers['x-api-token'] || req.query.token;
      if (provided !== config.apiToken) return res.status(401).json({ error: 'unauthorized' });
    }

    return next();
  });

  api.get('/health', (req, res) => {
    res.json({
      ok: true,
      leagues: leagues.all().map((league) => ({
        id: league.id,
        name: league.name,
        players: ihlRepository.count(league.id),
        updated_at: ihlRepository.lastUpdate(league.id),
      })),
      elo: { starting: ihlConfig.elo.starting, floor: ihlConfig.elo.floor, k_factor: ihlConfig.elo.kFactor },
    });
  });

  api.get('/leaderboard', (req, res) => {
    const { size, page, offset } = readPaging(req.query);
    const league = readLeague(req.query);
    const total = ihlRepository.count(league.id);

    const players = ihlRepository
      .pageWithNames(league.id, size, offset)
      // La posizione arriva dal database, non dall'indice: a pari ELO due
      // giocatori condividono la stessa posizione.
      .map((player) => toPlayer(player, ihlRepository.rankOf(league.id, player.elo)));

    res.json({
      league: league.id,
      league_name: league.name,
      page,
      size,
      total,
      pages: Math.max(1, Math.ceil(total / size)),
      updated_at: ihlRepository.lastUpdate(league.id),
      players,
    });
  });

  api.get('/players/:discordId', (req, res) => {
    const league = readLeague(req.query);
    const player = ihlRepository.findWithName(league.id, req.params.discordId);
    if (!player) return res.status(404).json({ error: 'player_not_found' });

    const limit = Math.min(Math.max(parseInt(req.query.matches, 10) || 20, 1), MAX_MATCHES);

    return res.json({
      league: league.id,
      league_name: league.name,
      ...toPlayer(player, ihlRepository.rankOf(league.id, player.elo)),
      total_players: ihlRepository.count(league.id),
      history: ihlRepository.history(league.id, player.discord_id, limit).map(toMatchRow),
    });
  });

  api.get('/matches', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), MAX_MATCHES);
    const league = readLeague(req.query);

    // Ogni partita occupa dieci righe: ne leggiamo dieci volte tante prima di raggrupparle.
    const rows = ihlRepository.recentMatches(league.id, limit * ihlConfig.queueSize);
    res.json({ league: league.id, matches: groupMatches(rows).slice(0, limit) });
  });

  api.use((req, res) => res.status(404).json({ error: 'not_found' }));

  app.use(BASE, api);
  logger.info(
    `API pubblica montata su ${BASE} (token ${config.apiToken ? 'richiesto' : 'non richiesto'}, ` +
      `origine consentita ${config.apiAllowedOrigin}).`,
  );

  return api;
}

module.exports = { mountPublicApi, groupMatches, toPlayer, BASE };
