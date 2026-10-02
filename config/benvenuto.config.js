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
    'Pochi passaggi e sei operativo.',

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
      emoji: '📲',
      name: 'Seguici sui social',
      text: 'Clip, annunci, tornei e dirette: tutti i nostri canali ufficiali sono raccolti qui.',
      channelId: '1548054289262583838',
    },
  ],

  /**
   * La sezione del sito: registrandosi su ivpiter.it si entra nelle code OPEN.
   * La PRO si chiede con un ticket. Sotto il pannello c'è un bottone che apre
   * il sito (config/sito.config.js).
   */
  site: {
    title: '🌐  REGISTRATI SU IVPITER.IT',
    text:
      'Per giocare le **IPL** passa dal nostro sito:\n' +
      '> **1.** vai su **[ivpiter.it](https://ivpiter.it)**\n' +
      '> **2.** registrati con il tuo **account Discord**\n' +
      '> **3.** ricevi subito l\'accesso alle code **IPL OPEN**\n' +
      '-# Sei un player forte, conosciuto o con un buon storico competitivo? ' +
      'Chiedi la **IPL PRO** aprendo un ticket **Richiesta IPL PRO**.',
  },

  /**
   * I vecchi bottoni dei ruoli. Vuoto: il ruolo Valorant lo danno a tutti i
   * separatori automatici, e i ruoli IPL il sito. Un bottone rimasto in un
   * messaggio vecchio risponde che il ruolo non è più disponibile.
   */
  roles: [],

  // Chiusura in grande, subito sopra il piè di pagina.
  closing:
    '## ⚡  VIENI SUBITO A GIOCARE\n' +
    'Registrati sul sito e scendi in campo nelle code OPEN.',

  footer: 'Per qualsiasi problema apri un ticket: lo staff risponde a ogni convocazione.',
};
