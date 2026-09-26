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

  // Ruolo che dà l'accesso alle HUB, assegnato insieme al rank.
  iplRoleId: null,

  // Ruoli delle due leghe, se ne usi di dedicati.
  leagueRoleIds: {
    pro: null,
    open: null,
  },

  /**
   * I rank, dal più basso al più alto.
   *
   *  - match:  come li chiama il servizio (confronto senza maiuscole)
   *  - league: in quale lega finisce chi ha questo rank
   *  - roleId: il ruolo Discord da assegnare
   */
  ranks: [
    { name: 'Ferro', match: ['iron'], emoji: '⬛', league: 'open', roleId: null },
    { name: 'Bronzo', match: ['bronze'], emoji: '🟫', league: 'open', roleId: null },
    { name: 'Argento', match: ['silver'], emoji: '⬜', league: 'open', roleId: null },
    { name: 'Oro', match: ['gold'], emoji: '🟨', league: 'open', roleId: null },
    { name: 'Platino', match: ['platinum'], emoji: '🟦', league: 'open', roleId: null },
    { name: 'Diamante', match: ['diamond'], emoji: '💎', league: 'open', roleId: null },
    { name: 'Ascendente', match: ['ascendant'], emoji: '🟩', league: 'open', roleId: null },
    { name: 'Immortale', match: ['immortal'], emoji: '🟥', league: 'pro', roleId: null },
    { name: 'Radiante', match: ['radiant'], emoji: '🌟', league: 'pro', roleId: null },
  ],

  // Soglia raccontata nel regolamento: da qui in su si gioca nella Pro.
  proFrom: 'Immortale 1',

  /**
   * Da questo rank in su il ruolo NON viene assegnato in automatico: si apre una
   * pratica e decide lo staff. Sotto, il bot assegna subito.
   * Deve corrispondere al `name` di una voce di `ranks`.
   */
  approvalFrom: 'Ascendente',
};
