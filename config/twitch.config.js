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

/**
 * Gruppi di streamer Twitch. Ogni streamer appartiene a un gruppo, scelto con
 * /twitch aggiungi tipo:…, e la sua live finisce nel canale del gruppo con i
 * tag del gruppo.
 *
 *  - channelId: canale degli annunci; null = TWITCH_ANNOUNCE_CHANNEL_ID del .env
 *  - roleIds:   ruoli da taggare; null = TWITCH_MENTION del .env
 */
module.exports = {
  groups: {
    generale: {
      label: 'Generale',
      channelId: null,
      roleIds: null,
    },
    ipl: {
      label: 'Streamer IPL',
      channelId: '1553829536268030123',
      // Solo chi gioca le IPL: i due ruoli di accesso, PRO e OPEN.
      roleIds: [rankConfig.iplRoleIds.pro, rankConfig.iplRoleIds.open],
    },
  },
};
