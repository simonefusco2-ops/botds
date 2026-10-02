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
 * Pannello "Come partecipare alle IPL", pubblicato da /pannello-ipl.
 *
 * Registrandosi sul sito si entra nelle OPEN; la PRO si chiede con un ticket
 * (bottone `proButton`, tipo `pro` in config/tickets.config.js) e la decide lo staff.
 */
module.exports = {
  title: '🎟️  𝐂𝐎𝐌𝐄 𝐏𝐀𝐑𝐓𝐄𝐂𝐈𝐏𝐀𝐑𝐄 𝐀𝐋𝐋𝐄 𝐈𝐏𝐋',

  intro:
    'Le **IPL** sono le nostre partite 5v5 organizzate dal bot: code, squadre, mappe ed ELO.\n' +
    'Si entra dal sito, e si comincia dalla **OPEN**.',

  sections: [
    {
      name: '1️⃣  REGISTRATI SUL SITO',
      value:
        'Vai su **[ivpiter.it](https://ivpiter.it)** e registrati con il tuo **account Discord**.\n' +
        'Appena registrato ricevi l\'accesso alle code **IPL OPEN**.\n' +
        '-# Con l\'accesso compare la sezione IPL del server, con le stanze delle partite.',
    },
    {
      name: '2️⃣  VAI NELLA SEZIONE IPL E METTITI IN CODA',
      value:
        'Apri la sezione **IPL** del server: lì trovi il canale delle code.\n' +
        'Quando le code sono **aperte** 🟢 premi **Entra in coda** e aspetta di essere in dieci.\n' +
        '-# Quando sono chiuse 🔴 il bottone non c\'è: le apre lo staff negli orari di gioco.',
    },
  ],

  leagues:
    '### 🏅  LE DUE LEGHE\n' +
    '🎯 **IPL OPEN** — **per tutti**: ci entri appena ti registri sul sito.\n' +
    '🏆 **IPL PRO** — livello alto, ritmo serio. **Su richiesta**, la decide lo staff.',

  automatic:
    '### 🏆  COME SI ENTRA NELLA PRO\n' +
    'Sei un player forte, conosciuto in community o con un **buon storico** competitivo? ' +
    'Premi **Richiedi IPL PRO** qui sotto: si apre un ticket dove ci racconti chi sei. ' +
    'Lo staff valuta e, se approvata, ti dà il ruolo.',

  // Il bottone sotto il pannello che apre il ticket della richiesta PRO.
  proButton: { label: 'Richiedi IPL PRO', emoji: '🏆', ticketTypeId: 'pro' },

  closing:
    '## 🔥  POI SI GIOCA\n' +
    'Al decimo in coda il bot fa tutto: ti manda un DM, apre il check-in, fa scegliere squadre e ' +
    'mappa e prepara le stanze vocali.',

  footer: 'Problemi con il sito o con l\'accesso? Apri un ticket di supporto.',
};
