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
 * Regolamento per chi trasmette le partite IPL, pubblicato da
 * /regolamento-streamer.
 *
 * Stessa forma degli altri regolamenti: ogni voce di `rules` diventa un blocco
 * separato da un divisore, con titolo grande, sottotitolo piccolo e corpo.
 */
module.exports = {
  title: '🔴  𝐑𝐄𝐆𝐎𝐋𝐀𝐌𝐄𝐍𝐓𝐎 𝐒𝐓𝐑𝐄𝐀𝐌𝐄𝐑 𝐈𝐏𝐋',

  intro:
    'Puoi trasmettere le tue partite IPL: ci fa piacere e porta gente nel server.\n' +
    '**Trasmettendo accetti queste regole.**',

  rules: [
    {
      emoji: '⏱️',
      name: 'I · DELAY',
      subtitle: 'Almeno 30 secondi',
      text:
        'Imposta **almeno 30 secondi di delay** prima di iniziare la live.\n' +
        '-# Senza, chi guarda vede le posizioni in tempo reale: è un vantaggio per la squadra avversaria.',
    },
    {
      emoji: '🖼️',
      name: 'II · BANNER',
      subtitle: 'IVPITER sempre visibile',
      text:
        'Mostra il **banner IVPITER** durante la partita, con il link **discord.gg/ivpiter** ben visibile, ' +
        'così chi guarda può entrare nel server e partecipare alle IPL.',
    },
    {
      emoji: '🤝',
      name: 'III · RISPETTO',
      subtitle: 'Vale anche in diretta',
      text:
        'Rispetta gli altri giocatori anche in diretta. ' +
        'Il **regolamento delle IPL vale anche durante lo streaming**.',
    },
  ],

  warning:
    '### ⚠️  SANZIONI\n' +
    'Il mancato rispetto di queste regole comporterà **sanzioni stabilite dallo staff** ' +
    'in base alla gravità della violazione.',

  footer: 'Buone live. Ad maiora!',
};
