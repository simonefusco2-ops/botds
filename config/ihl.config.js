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
 * MAPPE: `maps` è l'archivio completo, `activeMaps` dice quali sono in rotazione
 * e `mapPoolSize` quante ne entrano nel veto di ogni partita. Lasciandolo a null
 * il veto parte da tutte le attive; con un numero ne vengono estratte a caso
 * quante indicato. I ban sono sempre uno meno delle mappe in gioco, alternati
 * fra i due capitani.
 */
module.exports = {
  // Ruoli abilitati ad aprire e chiudere le code.
  managerRoleIds: [
    '1551594248053198858', // Developer
    '1547733990654484643', // Owner
    '1547733990235045978', // Staff IVPITER
  ],

  queueSize: 10,

  /**
   * Ruoli da capitano, dal tier più alto al più basso. In ogni partita sono
   * capitani i due giocatori con il tier migliore; a parità di tier, e per chi
   * non ne ha nessuno, decide l'ELO. Senza ruoli da capitano in partita si
   * torna ai due ELO più alti.
   */
  captainTierRoleIds: [
    '1553920340265271337', // Captain 1
    '1553920330857447474', // Captain 2
    '1553920307981590719', // Captain 3
  ],

  // Se i due capitani hanno tier diversi il draft lo apre quello col tier più
  // basso, per compensare, e sasso carta forbici si salta. Stesso tier: si gioca.
  // Segnaposto: {primo} {tierPrimo} {altro} {tierAltro}.
  tierFirstPick:
    '⚖️ **Capitani di tier diverso**\n' +
    '{altro} ({tierAltro}) contro {primo} ({tierPrimo}): per bilanciare, **{primo} apre il draft**.',

  /**
   * Le leghe.
   *
   * Ognuna ha il suo pannello, la sua classifica, il suo ELO e le sue partite:
   * sono due campionati separati che condividono soltanto le regole. Il primo
   * della lista è quello usato quando un comando non specifica la lega.
   *
   *  - id:              usato nei bottoni e nel database. Non cambiarlo dopo l'uso.
   *  - channelNames:    nomi del canale del pannello secondo lo stato delle code
   *  - historyChannelId: dove finisce la cronaca; se null usa quello condiviso
   *  - categoryId:      categoria delle stanze temporanee; se null quella condivisa
   */
  leagues: [
    {
      id: 'pro',
      name: 'LEGA PRO',
      emoji: '🏆',
      channelNames: { open: '🟢︱pro-aperte', closed: '🔴︱pro-chiuse' },
      historyChannelId: null,
      categoryId: null,
    },
    {
      id: 'open',
      name: 'LEGA OPEN',
      emoji: '🎯',
      channelNames: { open: '🟢︱open-aperte', closed: '🔴︱open-chiuse' },
      historyChannelId: null,
      categoryId: null,
    },
  ],

  // Le lettere dei nomi dei canali vengono convertite in maiuscoletto
  // (ᴘʀᴏ-ᴀᴘᴇʀᴛᴇ) perché Discord non le forza in minuscolo come farebbe con le
  // lettere normali; metti a false per usarli così come sono scritti.
  channelNamesSmallCaps: true,

  // Mappe attualmente in rotazione: solo da queste vengono estratte quelle del veto.
  // Per rimetterne una in gioco basta aggiungerne il nome, purché sia in `maps`.
  activeMaps: ['Ascent', 'Haven', 'Abyss', 'Summit', 'Lotus', 'Split', 'Sunset'],

  // Quante mappe entrano nel veto: null = tutte quelle attive (nessuna estrazione).
  mapPoolSize: null,

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

  /**
   * ELO a squadre: si confronta la SOMMA dell'ELO dei cinque di ogni squadra.
   *
   * Punti a chi vince = kFactor × (1 − probabilità che aveva di vincere); chi
   * perde toglie gli stessi punti. Due squadre pari valgono ±25; la favorita
   * vince poco e perde tanto, la sfavorita il contrario. kFactor è il tetto.
   *
   * `scale` dice quanto pesa la differenza fra i totali: con 1660, 1000 punti
   * di differenza (7500 contro 6500) fanno +10 / −40 alla favorita.
   * `minDelta`: anche la favorita schiacciante prende almeno questo.
   */
  elo: {
    starting: 1000,
    kFactor: 50,
    scale: 1660,
    minDelta: 1,
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

  /**
   * Sasso carta forbici fra i due capitani, al posto del lancio della moneta:
   * decide chi apre il draft. Ognuno sceglie in segreto; quando hanno scelto
   * entrambi il bot svela le mosse. Pari: si rigioca, fino a `maxRounds` round,
   * poi decide la moneta. Ogni round dura `timeout` secondi: chi non sceglie
   * perde, e se non sceglie nessuno decide la moneta.
   * Con `enabled: false` si torna al lancio della moneta.
   * Segnaposto: {a} {b} {statoA} {statoB} {vincitore} {perdente} {mosse} {round}.
   */
  rps: {
    enabled: true,
    timeout: 60,
    maxRounds: 5,
    moves: {
      sasso: { label: 'Sasso', emoji: '✊', beats: 'forbici' },
      carta: { label: 'Carta', emoji: '✋', beats: 'sasso' },
      forbici: { label: 'Forbici', emoji: '✌️', beats: 'carta' },
    },
    title: '✊✋✌️ **SASSO CARTA FORBICI** · {a} vs {b}',
    ask: 'Scegliete **in segreto**: chi vince apre il draft.',
    status: '{a} {statoA}  ·  {b} {statoB}',
    tie: '🤝 Pari ({mosse}): si rigioca. Round {round}.',
    win: '🏆 {mosse}: vince {vincitore}, che apre il draft.',
    onlyOne: '⌛ {perdente} non ha scelto in tempo: {vincitore} apre il draft.',
    nobody: '🪙 Nessuno ha scelto: decide la moneta. {vincitore} apre il draft.',
    tooManyTies: '🪙 Troppi pareggi ({mosse}): decide la moneta. {vincitore} apre il draft.',
  },

  // Canale dove finisce la cronaca delle partite: "partita avviata", il
  // risultato con i punti e gli annullamenti. Lasciandolo vuoto, quei messaggi
  // restano nel canale delle code come prima.
  historyChannelId: '1553153529361989683',

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

  /**
   * DM mandato a ogni giocatore appena la coda diventa partita: uno solo per
   * partita (e uno a chi entra con /ihl sostituisci). Il bottone porta dritto
   * nel vocale di check-in. Segnaposto: {partita} {lega} {vocale} {minuti}.
   */
  checkinDm: {
    enabled: true,
    text:
      '🟢 **Coda creata: la partita #{partita} ({lega}) è pronta!**\n' +
      'Entra nel vocale {vocale}: si parte solo quando ci siete tutti e dieci.\n' +
      '-# Dopo {minuti} minuti lo staff può sostituire chi non si è presentato.',
    button: 'Entra nel check-in',
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
