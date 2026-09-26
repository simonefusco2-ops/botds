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
  // Il canale dove vive questo pannello: gli altri messaggi ci rimandano.
  rolesChannelId: '1553343914960883802',

  title: '🎯  𝐑𝐈𝐂𝐇𝐈𝐄𝐒𝐓𝐀 𝐑𝐀𝐍𝐊 𝐄 𝐑𝐔𝐎𝐋𝐈',

  // Il punto che la gente sbaglia: fa solo il rank e resta fuori. Quindi la
  // scheda apre dicendo che i passi sono due, e il bot lo ripete a ogni clic.
  intro:
    'Per entrare nelle **IPL** servono **due cose, non una**:\n' +
    '> **1.** almeno un **ruolo di gioco** (i bottoni grigi qui sotto)\n' +
    '> **2.** il **rank verificato** (il bottone verde in fondo)\n\n' +
    '⚠️ **Con una sola delle due non entri.** Appena hai entrambe il bot ti dà ' +
    'l\'accesso da solo, senza chiedere niente a nessuno.',

  rolesHeading: '### 🎮  PASSO 1 · I TUOI RUOLI DI GIOCO',
  rolesBody:
    'Premi i ruoli che giochi: puoi sceglierne **più di uno**, e ripremendo li togli.\n' +
    '**Questo passo è obbligatorio**: senza nemmeno un ruolo di gioco l\'accesso alle IPL resta chiuso, ' +
    'anche con il rank già verificato.\n' +
    '-# Servono anche ai capitani per bilanciare le squadre nel draft.',

  roles: [
    { id: 'duelist', label: 'Duelist', roleId: '1553349012407459851', emoji: '<:Duelist:1553355503042699334>' },
    { id: 'initiator', label: 'Initiator', roleId: '1553348465977983087', emoji: '<:Initiator:1553355489457340486>' },
    { id: 'controller', label: 'Controller', roleId: '1553349054669262858', emoji: '<:Controller:1553355476991873074>' },
    { id: 'sentinel', label: 'Sentinel', roleId: '1553349120377360497', emoji: '<:Sentinel:1553355461560901662>' },
  ],

  rankHeading: '### 📊  PASSO 2 · IL TUO RANK',

  // {soglia} viene sostituito con il primo rank che richiede l'approvazione.
  // {soglia} arriva già in grassetto e con la sua icona: non aggiungere
  // asterischi attorno, o Discord lascia i simboli in mezzo al testo.
  rankBody:
    'Premi **Verifica il mio rank** e incolla il link del tuo profilo **tracker.gg**.\n\n' +
    'Sotto {soglia} il ruolo te lo assegna il bot **subito**.\n' +
    'Da {soglia} in su si apre una pratica con lo staff, che controlla il profilo e approva.\n\n' +
    '**Dove prendere il link**\n' +
    'Vai su {sito}, cerca il tuo Riot ID e copia l\'indirizzo dalla barra del browser.\n' +
    'Deve venire una cosa così:\n```{esempio}```',

  button: { label: 'Verifica il mio rank', emoji: '🔎' },

  footer:
    '### ✅  COME CAPISCI DI ESSERE A POSTO\n' +
    'A ogni clic il bot ti risponde con la lista dei due passi e ti dice quale ti manca. ' +
    'Quando sono entrambi ✅ hai il ruolo **IPL** e puoi entrare nelle code.\n' +
    '-# Il rank va rifatto quando sali: ritorna qui e riverifica.',
};
