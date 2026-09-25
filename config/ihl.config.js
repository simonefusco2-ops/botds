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
 * Parametri della In-House League.
 *
 * MAPPE: il pool competitivo di Valorant cambia a ogni atto. Tieni in `maps`
 * soltanto le mappe attualmente in rotazione: il sistema di ban usa esattamente
 * questo elenco, quindi va aggiornato quando Riot ruota il pool.
 */
module.exports = {
  // Ruoli abilitati ad aprire e chiudere le code.
  managerRoleIds: [
    '1551594248053198858', // Developer
    '1547733990654484643', // Owner
    '1547733990235045978', // Staff IVPITER
  ],

  queueSize: 10,

  maps: [
    { name: 'Ascent', emoji: '🏛️' },
    { name: 'Bind', emoji: '🏜️' },
    { name: 'Haven', emoji: '🛕' },
    { name: 'Icebox', emoji: '❄️' },
    { name: 'Lotus', emoji: '🪷' },
    { name: 'Split', emoji: '🗼' },
    { name: 'Sunset', emoji: '🌇' },
  ],

  elo: {
    starting: 1000,
    kFactor: 32,
    floor: 100, // nessuno scende sotto questa soglia
  },

  // Secondi a disposizione per ogni scelta prima che decida il bot.
  timers: {
    sideChoice: 60,
    mapBan: 60,
    pick: 60,
  },

  voice: {
    // Categoria dei vocali di partita; se vuoto usa TEMP_VC_CATEGORY_ID del .env.
    categoryId: null,
    teamAName: '🔴 Team A',
    teamBName: '🔵 Team B',
  },

  leaderboardSize: 10,
};
