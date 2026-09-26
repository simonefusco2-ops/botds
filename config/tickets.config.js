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
 *  - hidden:      true per tenerlo fuori dal pannello generale /ticket-panel,
 *                 quando si apre solo da un altro pannello (es. il regolamento HUB)
 */
module.exports = [
  {
    id: 'hub',
    label: 'Partite IPL',
    emoji: '⚔️',
    style: 'primary',
    description: 'Problemi con partite, ELO o code delle IPL',
    intro:
      'Indica il **codice della partita** interessata e descrivi cosa è accaduto. ' +
      'Se hai screenshot o clip, allegali qui.',
    categoryId: null,
    staffRoleId: null,
  },
  {
    // Aperto dal bottone in fondo al regolamento HUB (/regolamento-hub), non dal
    // pannello generale: la richiesta ha senso solo dopo aver letto le regole.
    id: 'ipl',
    label: 'Richiesta ruolo IPL',
    emoji: '🎫',
    style: 'success',
    description: 'Accesso alle HUB dopo aver letto il regolamento',
    intro:
      'Incolla qui il **link del tuo profilo tracker.gg** — è obbligatorio:\n' +
      '```https://tracker.gg/valorant/profile/riot/Nome%23TAG/overview```\n' +
      'Appena lo mandi il bot legge il rank e propone il ruolo allo staff, che controlla e approva.\n' +
      'Confermaci anche di aver letto e accettato il **regolamento delle HUB**.',
    categoryId: null,
    staffRoleId: null,
    hidden: true,
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
