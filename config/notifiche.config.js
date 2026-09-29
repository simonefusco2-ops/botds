/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const twitchConfig = require('./twitch.config');

/**
 * Pannello delle notifiche live, pubblicato da /pannello-notifiche.
 *
 * I due bottoni danno e tolgono il ruolo che le live degli streamer taggano:
 * è lo stesso di config/twitch.config.js, così pannello e annunci non possono
 * andare fuori sincrono.
 */
module.exports = {
  roleId: twitchConfig.liveRoleId,

  title: '🔔  NOTIFICHE LIVE',
  intro:
    'Vuoi sapere quando i nostri **streamer** vanno in diretta su Twitch?\n' +
    'Attiva le notifiche: ti taggheremo a ogni live dei nostri streamer.\n' +
    '-# Le live degli streamer **IPL** avvisano i giocatori della LEGA PRO.',
  footnote: 'Puoi disattivarle quando vuoi con lo stesso pannello.',

  buttons: {
    on: { label: 'Attiva notifiche', emoji: '🔔' },
    off: { label: 'Disattiva', emoji: '🔕' },
  },

  replies: {
    on: '🔔 Notifiche live **attivate**: ti taggheremo quando uno streamer va in diretta.',
    alreadyOn: '🔔 Le notifiche live sono già attive.',
    off: '🔕 Notifiche live **disattivate**.',
    alreadyOff: '🔕 Le notifiche live non erano attive.',
  },
};
