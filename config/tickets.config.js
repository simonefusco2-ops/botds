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
 * Tipi di ticket mostrati nel pannello di apertura.
 *
 * Ogni voce genera un bottone (massimo 10 tipi, 5 per riga).
 *  - id:          identificatore breve, usato nel nome del canale. Non cambiarlo dopo l'uso.
 *  - categoryId:  categoria dedicata; se null usa TICKET_CATEGORY_ID del .env
 *  - staffRoleId: ruolo avvisato all'apertura; se null usa STAFF_ROLE_ID del .env
 *  - intro:       istruzioni mostrate dentro il ticket appena aperto
 */
module.exports = [
  {
    id: 'hub',
    label: 'Faceit Hub',
    emoji: '⚔️',
    style: 'primary',
    description: 'Problemi con match, ELO, code o collegamento account',
    intro:
      'Indica il tuo **nickname Faceit**, il **link del match** interessato e descrivi cosa è accaduto. ' +
      'Se il problema riguarda il collegamento, specifica se hai già usato `/link`.',
    categoryId: null,
    staffRoleId: null,
  },
  {
    id: 'tryout',
    label: 'Tryout',
    emoji: '🎯',
    style: 'success',
    description: 'Candidature per entrare nel roster',
    intro:
      'Indica **rank attuale**, **picco raggiunto**, **ruoli** che preferisci, **agenti** principali, ' +
      'disponibilità settimanale e il tuo profilo tracker.',
    categoryId: null,
    staffRoleId: null,
  },
  {
    id: 'segnalazione',
    label: 'Segnalazione',
    emoji: '⚖️',
    style: 'danger',
    description: 'Comportamenti scorretti, cheat, violazioni del regolamento',
    intro:
      'Indica **chi** stai segnalando, **quando** è avvenuto e allega **prove** (clip, screenshot, link al match). ' +
      'Le segnalazioni sono trattate in via riservata.',
    categoryId: null,
    staffRoleId: null,
  },
  {
    id: 'partnership',
    label: 'Collaborazioni',
    emoji: '🤝',
    style: 'secondary',
    description: 'Partnership, sponsor, scrim con altri team',
    intro: 'Presenta te stesso o la tua organizzazione, la proposta e un contatto di riferimento.',
    categoryId: null,
    staffRoleId: null,
  },
  {
    id: 'supporto',
    label: 'Supporto',
    emoji: '🛡️',
    style: 'secondary',
    description: 'Qualsiasi altra richiesta allo staff',
    intro: 'Descrivi la tua richiesta nel modo più chiaro possibile: lo staff ti risponderà qui.',
    categoryId: null,
    staffRoleId: null,
  },
];
