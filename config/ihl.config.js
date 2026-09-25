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
 * MAPPE: `maps` contiene l'archivio completo, anche le mappe fuori rotazione.
 * A ogni partita il bot ne estrae a caso `mapPoolSize`, e i capitani bannano
 * soltanto fra quelle: così non si bannano dodici mappe a ogni lobby e ogni
 * serata ha un ventaglio diverso.
 *
 * Conviene tenere `mapPoolSize` dispari: i ban sono uno in meno del pool e si
 * alternano, quindi con 7 mappe ogni capitano ne banna esattamente 3.
 */
module.exports = {
  // Ruoli abilitati ad aprire e chiudere le code.
  managerRoleIds: [
    '1551594248053198858', // Developer
    '1547733990654484643', // Owner
    '1547733990235045978', // Staff IVPITER
  ],

  queueSize: 10,

  // Quante mappe entrano nel veto di ogni partita, estratte a caso dall'archivio.
  mapPoolSize: 7,

  maps: [
    { name: 'Abyss', emoji: '🌌' },
    { name: 'Ascent', emoji: '🏛️' },
    { name: 'Bind', emoji: '🏜️' },
    { name: 'Breeze', emoji: '🏝️' },
    { name: 'Corrode', emoji: '🧪' },
    { name: 'Fracture', emoji: '⛓️' },
    { name: 'Haven', emoji: '🛕' },
    { name: 'Icebox', emoji: '❄️' },
    { name: 'Lotus', emoji: '🪷' },
    { name: 'Pearl', emoji: '🌊' },
    { name: 'Split', emoji: '🗼' },
    { name: 'Summit', emoji: '🏔️' },
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
