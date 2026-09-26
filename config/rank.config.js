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
 * Verifica del rank per l'accesso alle HUB.
 *
 * Il giocatore apre il ticket IPL e incolla il link del suo profilo tracker.gg.
 * Il bot ne ricava il Riot ID, chiede il rank attuale al servizio configurato e
 * propone allo staff il ruolo da assegnare: l'ultima parola resta a una persona.
 *
 * ⚠️  Gli ID dei ruoli vanno riempiti: finché sono null il bot mostra comunque
 * la proposta, ma all'approvazione avvisa che non può assegnare niente.
 */
module.exports = {
  // Sito da cui deve arrivare il link, mostrato nelle istruzioni.
  tracker: {
    name: 'tracker.gg',
    profileUrl: 'https://tracker.gg/valorant',
    // Esempio del link che ci aspettiamo indietro.
    example: 'https://tracker.gg/valorant/profile/riot/Nome%23TAG/overview',
  },

  /**
   * Da dove arriva il rank.
   *
   * L'endpoint riceve il nome e il tag ricavati dal link. Il servizio
   * predefinito è quello pubblico di HenrikDev, che richiede una chiave
   * gratuita da mettere in HENRIK_API_KEY nel .env.
   */
  provider: {
    url: 'https://api.henrikdev.xyz/valorant/v2/mmr/{region}/{name}/{tag}',
    region: 'eu',
    timeoutMs: 12000,
  },

  /**
   * I ruoli che danno accesso alle IPL, assegnati da soli.
   *
   * Servono due cose insieme: almeno un ruolo di gioco (Duelist, Initiator,
   * Controller o Sentinel) e un rank verificato. Chi ha Immortale o Radiante
   * prende il Pro, tutti gli altri l'Open. Appena i requisiti smettono di
   * essere soddisfatti il ruolo viene tolto, altrimenti resterebbe a chi si è
   * levato il ruolo di gioco.
   */
  iplRoleIds: {
    pro: '1553355794320326736',
    open: '1553024176129048656',
  },

  /**
   * I rank, dal più basso al più alto.
   *
   *  - match:     come li chiama il servizio (confronto senza maiuscole)
   *  - emoji:     emoji del server, usata nei messaggi e sui bottoni
   *  - nameEmoji: emoji unicode, usata nei NOMI DEI CANALI — lì quelle del
   *               server non esistono e uscirebbero come testo <:NOME:id>
   *  - league:    in quale lega finisce chi ha questo rank
   *  - roleId:    il ruolo Discord da assegnare
   */
  ranks: [
    { name: 'Ferro', match: ['iron'], emoji: '<:IRON3:1553358379403972668>', nameEmoji: '⬛', league: 'open', roleId: '1553352926460772382' },
    { name: 'Bronzo', match: ['bronze'], emoji: '<:BRONZE3:1553358299452411965>', nameEmoji: '🟫', league: 'open', roleId: '1553353086431658095' },
    { name: 'Argento', match: ['silver'], emoji: '<:SILVER3:1553358247136727040>', nameEmoji: '⬜', league: 'open', roleId: '1553353182015397888' },
    { name: 'Oro', match: ['gold'], emoji: '<:GOLD3:1553358200940667020>', nameEmoji: '🟨', league: 'open', roleId: '1553353411460730940' },
    { name: 'Platino', match: ['platinum'], emoji: '<:PLATINUM3:1553358165351989299>', nameEmoji: '🟦', league: 'open', roleId: '1553353547838394529' },
    { name: 'Diamante', match: ['diamond'], emoji: '<:DIAMOND3:1553358082149458080>', nameEmoji: '💎', league: 'open', roleId: '1553353701077553152' },
    { name: 'Ascendente', match: ['ascendant'], emoji: '<:ASCENDANT3:1553357147478429726>', nameEmoji: '🟩', league: 'open', roleId: '1553353834489978900' },
    { name: 'Immortale', match: ['immortal'], emoji: '<:IMMORTAL3:1553358030983139378>', nameEmoji: '🟥', league: 'pro', roleId: '1553353945945210970' },
    { name: 'Radiante', match: ['radiant'], emoji: '🌟', nameEmoji: '🌟', league: 'pro', roleId: '1553354004845822103' },
  ],

  /**
   * Elenco dei rank di chi è dentro una stanza vocale.
   *
   * `mode: 'status'` scrive nello **stato del canale vocale**, la riga che
   * Discord mostra sotto il nome: accetta le emoji del server e si può
   * aggiornare spesso, quindi la lista è praticamente in tempo reale.
   *
   * `mode: 'name'` rinomina il canale. Sconsigliato: nei nomi le emoji del
   * server non esistono (si ripiega sulle `nameEmoji` unicode) e Discord
   * consente solo DUE rinomine ogni dieci minuti per canale, quindi la lista
   * resta indietro. Resta disponibile come ripiego.
   */
  voiceRanks: {
    enabled: true,
    mode: 'status',

    // Vuoti = tutte le vocali del server. Riempine uno per restringere.
    categoryIds: [],
    channelIds: [],

    // Attesa dall'ultimo movimento prima di scrivere: con lo stato bastano
    // pochi secondi, con la rinomina serve molto di più per via del limite.
    debounceMs: 3000,
    renameDebounceMs: 20000,

    // Quante emoji al massimo, e cosa separa il nome dalle emoji (solo 'name').
    maxEmojis: 10,
    separator: ' · ',
  },

  // Soglia raccontata nel regolamento: da qui in su si gioca nella Pro.
  proFrom: 'Immortale 1',

  /**
   * Da questo rank in su il ruolo NON viene assegnato in automatico: si apre una
   * pratica e decide lo staff. Sotto, il bot assegna subito.
   * Deve corrispondere al `name` di una voce di `ranks`.
   */
  approvalFrom: 'Ascendente',
};
