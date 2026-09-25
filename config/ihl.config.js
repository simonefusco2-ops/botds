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
 * MAPPE: `maps` è l'archivio completo con le relative emoji, `activeMaps` dice
 * quali sono in rotazione e `mapPoolSize` quante ne entrano nel veto di ogni
 * partita, estratte a caso fra le attive. Con 4 mappe i ban sono 3: due al
 * capitano che non ha scelto il lato e uno all'altro.
 */
module.exports = {
  // Ruoli abilitati ad aprire e chiudere le code.
  managerRoleIds: [
    '1551594248053198858', // Developer
    '1547733990654484643', // Owner
    '1547733990235045978', // Staff IVPITER
  ],

  queueSize: 10,

  // Nomi del canale delle code. Le lettere vengono convertite in maiuscoletto
  // (ᴄᴏᴅᴇ ᴀᴘᴇʀᴛᴇ) perché Discord non le forza in minuscolo come farebbe con le
  // lettere normali; metti smallCaps a false per usarli così come sono scritti.
  queueChannelNames: {
    open: '🟢︱code-aperte',
    closed: '🔴︱code-chiuse',
    smallCaps: true,
  },

  // Mappe attualmente in rotazione: solo da queste vengono estratte quelle del veto.
  // Per rimetterne una in gioco basta aggiungerne il nome, purché sia in `maps`.
  activeMaps: ['Ascent', 'Haven', 'Abyss', 'Summit', 'Lotus', 'Split', 'Sunset'],

  // Quante mappe entrano nel veto di ogni partita, estratte a caso fra le attive.
  mapPoolSize: 4,

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

    // Dopo quanto, da quando si apre il check-in, lo staff può sostituire chi
    // non è ancora entrato nel vocale di ritrovo.
    substituteAfter: 420,
  },

  // Categoria che ospita tutte le stanze temporanee della IHL: le due vocali
  // delle squadre e il testuale del voto di ogni partita. Se la lasci vuota
  // viene usata TEMP_VC_CATEGORY_ID del .env.
  categoryId: '1547745773452533814',

  voice: {
    teamAName: '🔴 Team A',
    teamBName: '🔵 Team B',

    // Vocale di ritrovo: la partita parte solo quando ci sono entrati tutti e
    // dieci, e da lì vengono spostati nelle due vocali delle squadre.
    checkinName: '🎧 Check-in',
  },

  // Canale testuale privato della singola partita: ci entrano solo i dieci
  // giocatori e lo staff, si vota il vincitore e viene eliminato dopo
  // `deleteAfter` secondi dalla chiusura della votazione.
  matchChannel: {
    prefix: 'partita-',
    deleteAfter: 20,

    // Tempo per votare il vincitore. Allo scadere vince chi ha più voti, anche
    // se non si è arrivati alla maggioranza assoluta; a metà tempo il bot
    // ritagga chi non ha ancora votato.
    voteTimeout: 300,
    voteReminder: 150,
  },

  leaderboardSize: 10,
};
