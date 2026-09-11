/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const inviteTracker = require('../modules/memberLog/inviteTracker');

module.exports = {
  name: 'inviteCreate',
  execute(invite) {
    inviteTracker.addToCache(invite);
  },
};
