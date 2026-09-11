/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const config = require('../config');
const logger = require('../utils/logger');
const memberLogger = require('../modules/memberLog/memberLogger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    // Il log va registrato prima dell'autorole: risolvere l'invito richiede
    // di confrontare i contatori il prima possibile dopo l'ingresso.
    await memberLogger.logJoin(member).catch((err) => {
      logger.error(`Errore log ingresso di ${member.user.tag}`, err);
    });

    if (!config.autoRoleId) return;

    try {
      await member.roles.add(config.autoRoleId);
      logger.info(`Ruolo automatico assegnato a ${member.user.tag}`);
    } catch (err) {
      logger.error(`Errore assegnazione ruolo automatico a ${member.user.tag}`, err);
    }
  },
};
