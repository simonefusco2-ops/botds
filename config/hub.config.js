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
    '**Leggi tutto prima di chiedere il ruolo IPL:** entrando nelle HUB accetti queste regole.',

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
  ],

  // Blocco finale, prima del bottone.
  warning:
    '### ⚠️  SANZIONI\n' +
    'Le violazioni possono comportare **richiami**, **sospensioni** o **esclusione dall\'HUB**, ' +
    'in base alla gravità e alla recidiva.',

  leagues:
    '### 🏅  LE DUE LEGHE\n' +
    '🎯 **LEGA OPEN** — porta aperta: si gioca fino a **Ascendente 3**, per chi vuole divertirsi e crescere.\n' +
    '🏆 **LEGA PRO** — da **Immortale 1** in su: livello alto, ritmo serio.\n' +
    '-# In quale finisci lo decide il tuo rank verificato, non la tua parola.',

  request:
    '### 🎫  COME GIOCARE — RICHIESTA RANK\n' +
    'Per entrare nelle HUB serve il ruolo **IPL** e il **rank verificato**.\n' +
    '**Il link del tuo profilo tracker.gg è obbligatorio:** senza quello la richiesta non viene accettata.\n\n' +
    '**Dove prenderlo:** vai su [tracker.gg/valorant](https://tracker.gg/valorant), cerca il tuo Riot ID ' +
    "e copia l'indirizzo dalla barra del browser.\n" +
    '**Cosa ci aspettiamo indietro:**\n' +
    '```https://tracker.gg/valorant/profile/riot/Nome%23TAG/overview```\n' +
    'Premi il bottone qui sotto: si apre una stanza privata con lo staff. Incolla lì il link, ' +
    'il bot legge il rank e propone il ruolo, un membro dello staff controlla e approva.',

  button: {
    label: 'Richiedi il ruolo IPL',
    emoji: '🎫',
  },

  // Tipo di ticket aperto dal bottone: deve esistere in config/tickets.config.js.
  ticketTypeId: 'ipl',

  footer: 'Benvenuto in IVPITER. Ad maiora!',
};
