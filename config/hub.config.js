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
 * Regolamento delle HUB, pubblicato da /regolamento-hub.
 *
 * Ogni voce di `rules` diventa un blocco separato da un divisore:
 *   emoji + name  -> titolo grande
 *   subtitle      -> riga piccola sotto il titolo
 *   text          -> corpo della regola
 *
 * Il bottone in fondo apre un ticket del tipo indicato in `ticketTypeId`, che
 * deve esistere in config/tickets.config.js.
 */
module.exports = {
  title: '⚔️  𝐋𝐄 𝐑𝐄𝐆𝐎𝐋𝐄 𝐃𝐄𝐋𝐋𝐄 𝐇𝐔𝐁',

  intro:
    'Qui si gioca sul serio, e sul serio ci si rispetta.\n' +
    '**Leggi tutto prima di registrarti sul sito:** entrando nelle HUB accetti queste regole.',

  rules: [
    {
      emoji: '🤝',
      name: 'I · RISPETTA TUTTI',
      subtitle: 'Le battute ci stanno, la tossicità no',
      text: 'Insulti, discriminazioni, minacce e molestie non sono tollerati.',
    },
    {
      emoji: '🛡️',
      name: 'II · GIOCA PER IL TEAM',
      subtitle: 'Cinque in campo, una sola maglia',
      text:
        'Collabora, dai il massimo ed evita comportamenti che rovinano la partita agli altri.',
    },
    {
      emoji: '🎙️',
      name: 'III · COMUNICA COSTRUTTIVAMENTE',
      subtitle: 'Call utili, non rumore',
      text:
        'Usa la chat e il microfono per dare informazioni utili. Niente flame, urla o spam.',
    },
    {
      emoji: '⏱️',
      name: 'IV · RISPETTA L\'IMPEGNO',
      subtitle: 'Se entri, la porti a termine',
      text:
        'Entra in partita solo se puoi finirla. Niente abbandoni volontari, AFK intenzionale o griefing.',
    },
    {
      emoji: '⚖️',
      name: 'V · COMPETI LEALMENTE',
      subtitle: 'Il risultato si conquista',
      text: 'Cheat, exploit e qualsiasi tentativo di alterare il risultato sono vietati.',
    },
    {
      emoji: '📈',
      name: 'VI · AIUTA CHI MIGLIORA',
      subtitle: 'Consigli sì, umiliazioni no',
      text: 'Un errore può capitare a tutti. I consigli sono benvenuti, le umiliazioni no.',
    },
    {
      emoji: '🚨',
      name: 'VII · SEGNALA ALLO STAFF',
      subtitle: 'Prove in mano, discussioni fuori',
      text:
        'In caso di problemi raccogli le prove e contatta i moderatori senza alimentare discussioni.',
    },
    {
      emoji: '🎬',
      name: 'VIII · ABILITA I REPLAY',
      subtitle: 'Chi crea la lobby, attiva la registrazione',
      text:
        'Chi crea la partita personalizzata deve **abilitare i replay** prima di iniziare. ' +
        'Servono allo staff per verificare ogni segnalazione: una lobby senza replay può essere invalidata.',
    },
  ],

  // Blocco finale, prima del bottone.
  warning:
    '### ⚠️  SANZIONI\n' +
    'Le violazioni possono comportare **richiami**, **sospensioni** o **esclusione dall\'HUB**, ' +
    'in base alla gravità e alla recidiva.',

  leagues:
    '### 🏅  LE DUE LEGHE\n' +
    '🎯 **LEGA OPEN** — porta aperta a tutti: ci entri appena ti registri sul sito.\n' +
    '🏆 **LEGA PRO** — livello alto, ritmo serio: **su richiesta**, la decide lo staff.',

  request:
    '### 🎟️  COME SI ENTRA NELLE IPL\n' +
    '> **1.** vai su **[ivpiter.it](https://ivpiter.it)**\n' +
    '> **2.** accedi con il tuo **account Discord**\n' +
    '> **3.** registrati: ricevi subito l\'accesso alle code **IPL OPEN**\n\n' +
    'Per la **IPL PRO** apri un ticket **Richiesta IPL PRO**: è per player forti, conosciuti ' +
    'o con un buon storico competitivo. Lo staff valuta ogni richiesta.',

  // Il pannello rimanda qui: è il canale della richiesta ruoli e rank.
  rolesChannelId: '1553343914960883802',

  // Tipo di ticket usato dalla verifica del rank quando serve l'approvazione.
  ticketTypeId: 'ipl',

  footer: 'Benvenuto in IVPITER. Ad maiora!',
};
