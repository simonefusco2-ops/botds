/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const rankConfig = require('./rank.config');

// Il ruolo di chi vuole le notifiche delle live degli streamer generali.
const LIVE_ROLE_ID = '1553840021436506322';

/**
 * Gruppi di streamer Twitch. Ogni streamer appartiene a un gruppo, scelto con
 * /twitch aggiungi tipo:…, e la sua live finisce nel canale del gruppo con i
 * tag del gruppo.
 *
 *  - channelId: canale degli annunci; null = TWITCH_ANNOUNCE_CHANNEL_ID del .env
 *  - roleIds:   ruoli da taggare; null = TWITCH_MENTION del .env
 */
module.exports = {
  // Letto anche da /pannello-notifiche, che dà e toglie questo ruolo.
  liveRoleId: LIVE_ROLE_ID,

  groups: {
    generale: {
      label: 'Generale',
      channelId: null,
      roleIds: [LIVE_ROLE_ID],
    },
    ipl: {
      label: 'Streamer IPL',
      channelId: '1553829536268030123',
      // Le live degli streamer IPL avvisano solo chi gioca la LEGA PRO.
      roleIds: [rankConfig.iplRoleIds.pro],
    },
  },
};
