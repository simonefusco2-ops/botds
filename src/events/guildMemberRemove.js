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

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    await memberLogger.logLeave(member).catch((err) => {
      logger.error(`Errore log uscita di ${member.user?.tag || member.id}`, err);
    });
  },
};
