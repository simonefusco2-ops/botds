/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const logger = require('../utils/logger');
const memberLogger = require('../modules/memberLog/memberLogger');
const lobbyManager = require('../modules/ihl/lobbyManager');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    await memberLogger.logLeave(member).catch((err) => {
      logger.error(`Errore log uscita di ${member.user?.tag || member.id}`, err);
    });

    // Chi se ne va non può restare in coda: occuperebbe un posto per sempre.
    await lobbyManager.handleMemberLeft(client, member.id).catch((err) => {
      logger.error(`IHL: errore nel togliere ${member.id} dalle code`, err);
    });
  },
};
