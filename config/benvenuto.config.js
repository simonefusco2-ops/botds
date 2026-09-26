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
 *   1. Impostazioni server -> Emoji -> carica il logo (es. "valorant")
 *   2. In chat scrivi  \:valorant:  con la barra rovesciata e invia
 *   3. Discord mostrerà il codice, es. <:valorant:1234567890>
 *   4. Incolla quel codice nel campo `emoji` qui sotto
 */
module.exports = {
  title: '⚡  BENVENUTO IN IVPITER  ⚡',

  intro:
    'Sei entrato nella **Ivpiter Community**: qui si gioca, si compete e si cresce insieme.\n' +
    'Tre passaggi e sei operativo.',

  /**
   * I passaggi del benvenuto. Ognuno rimanda al suo canale, che Discord rende
   * come link blu cliccabile: il canale sta dentro il passaggio e non in un
   * elenco a parte, così aggiungerne uno non sposta i collegamenti degli altri.
   */
  steps: [
    {
      emoji: '📜',
      name: 'Leggi il regolamento',
      text: 'Poche regole, chiare: rispetto, fair play e ordine nei canali. Restando nel server le accetti.',
      channelId: '1547733991405387849',
    },
    {
      emoji: '🎯',
      name: 'Richiedi i tuoi ruoli',
      text:
        'Verifica il tuo rank con il link di tracker.gg e prenditi i ruoli che giochi ' +
        '(Duelist, Initiator, Controller, Sentinel). Servono per entrare nelle code.',
      channelId: '1553343914960883802',
    },
    {
      emoji: '📲',
      name: 'Seguici sui social',
      text: 'Clip, annunci, tornei e dirette: tutti i nostri canali ufficiali sono raccolti qui.',
      channelId: '1548054289262583838',
    },
  ],

  rolesTitle: '🎮  Prendi il ruolo Valorant',
  rolesHint: 'Clicca il bottone per assegnartelo. Riclicca per rimuoverlo.',

  roles: [
    {
      id: '1548053779943788564',
      label: 'Valorant',
      emoji: '<:valorant_round:1548245738557939784>',
      style: 'danger',
    },
  ],

  // Chiusura in grande, subito sopra il piè di pagina.
  closing:
    '## ⚡  VIENI SUBITO A GIOCARE\n' +
    'Le nostre code ti aspettano: prendi il ruolo, verifica il rank e scendi in campo.',

  footer: 'Per qualsiasi problema apri un ticket: lo staff risponde a ogni convocazione.',
};
