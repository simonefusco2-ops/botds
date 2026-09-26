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
 * Pannello "Richiesta rank e ruoli", pubblicato da /pannello-ruoli.
 *
 * Due sezioni:
 *  1. i ruoli di gioco, che ognuno si assegna e si toglie da solo con i bottoni
 *  2. il rank, che si verifica incollando il proprio profilo tracker.gg
 *
 * `emoji` accetta le emoji personalizzate del server nel formato <:nome:ID>:
 * carica lì i loghini dei ruoli e incolla qui i codici. Lasciandola vuota il
 * bottone esce senza icona, senza rompersi.
 */
module.exports = {
  title: '🎯  𝐑𝐈𝐂𝐇𝐈𝐄𝐒𝐓𝐀 𝐑𝐀𝐍𝐊 𝐄 𝐑𝐔𝐎𝐋𝐈',

  intro:
    'Qui prendi i **ruoli di gioco** e fai verificare il tuo **rank**.\n' +
    'Servono entrambi per essere considerato nelle HUB e nelle lobby.',

  rolesHeading: '### 🎮  I TUOI RUOLI DI GIOCO',
  rolesBody:
    'Premi i ruoli che giochi: puoi sceglierne **più di uno**, e ripremendo li togli.\n' +
    '-# Servono ai capitani per bilanciare le squadre nel draft.',

  roles: [
    { id: 'duelist', label: 'Duelist', roleId: '1553349012407459851', emoji: '<:Duelist:1553355503042699334>' },
    { id: 'initiator', label: 'Initiator', roleId: '1553348465977983087', emoji: '<:Initiator:1553355489457340486>' },
    { id: 'controller', label: 'Controller', roleId: '1553349054669262858', emoji: '<:Controller:1553355476991873074>' },
    { id: 'sentinel', label: 'Sentinel', roleId: '1553349120377360497', emoji: '<:Sentinel:1553355461560901662>' },
  ],

  rankHeading: '### 📊  IL TUO RANK',

  // {soglia} viene sostituito con il primo rank che richiede l'approvazione.
  rankBody:
    'Premi **Verifica il mio rank** e incolla il link del tuo profilo **tracker.gg**.\n\n' +
    '**Sotto {soglia}** il ruolo te lo assegna il bot **subito**.\n' +
    '**Da {soglia} in su** si apre una pratica con lo staff, che controlla il profilo e approva.\n\n' +
    '**Dove prendere il link:** vai su {sito}, cerca il tuo Riot ID e copia l\'indirizzo dalla barra del browser.\n' +
    'Deve venire una cosa così:\n```{esempio}```',

  button: { label: 'Verifica il mio rank', emoji: '🔎' },

  footer: 'Il rank va rifatto quando sali: riapri il pannello e riverifica.',
};
