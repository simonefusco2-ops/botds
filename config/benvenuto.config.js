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
 * Messaggio di benvenuto pubblicato da /benvenuto.
 *
 * EMOJI PERSONALIZZATE SUI BOTTONI
 * I bottoni accettano solo emoji unicode oppure emoji caricate sul server.
 * Per usare i loghi dei giochi:
 *   1. Impostazioni server -> Emoji -> carica il logo (es. "valorant" e "cs")
 *   2. In chat scrivi  \:valorant:  con la barra rovesciata e invia
 *   3. Discord mostrerà il codice, es. <:valorant:1234567890>
 *   4. Incolla quel codice nel campo `emoji` qui sotto
 */
module.exports = {
  title: '⚡  BENVENUTO IN IVPITER  ⚡',

  intro:
    'Sei entrato nella **Ivpiter Community**: qui si gioca, si compete e si cresce insieme.\n' +
    'Bastano due passaggi per essere operativo.',

  // Canali richiamati nel messaggio: compaiono come link blu cliccabili.
  rulesChannelId: '1547733991405387849',
  socialChannelId: '1548054289262583838',

  steps: [
    {
      emoji: '📜',
      name: 'Leggi il regolamento',
      text: 'Poche regole, chiare: rispetto, fair play e ordine nei canali. Restando nel server le accetti.',
    },
    {
      emoji: '📲',
      name: 'Seguici sui social',
      text: 'Clip, annunci, tornei e dirette: tutti i nostri canali ufficiali sono raccolti qui.',
    },
  ],

  rolesTitle: '🎮  Scegli i tuoi giochi',
  rolesHint: 'Clicca un bottone per assegnarti il ruolo. Riclicca per rimuoverlo.',

  roles: [
    {
      id: '1548053779943788564',
      label: 'Valorant',
      emoji: '🔴', // sostituisci con <:valorant:ID> dopo aver caricato l'emoji
      style: 'danger',
    },
    {
      id: '1548053832666447984',
      label: 'Counter-Strike',
      emoji: '🟡', // sostituisci con <:cs:ID> dopo aver caricato l'emoji
      style: 'primary',
    },
  ],

  footer: 'Per qualsiasi problema apri un ticket: lo staff risponde a ogni convocazione.',
};
