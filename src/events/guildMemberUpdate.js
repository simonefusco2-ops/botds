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
const separators = require('../modules/separators/separators');

/**
 * Chi entra o esce dallo staff guadagna o perde il separatore staff; e se
 * qualcuno toglie a mano un separatore, torna. I ruoli IPL li gestisce il sito.
 */
module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    // I ruoli sono l'unica cosa che ci interessa: nickname e avatar no.
    if (oldMember.roles.cache.size === newMember.roles.cache.size) {
      const uguali = oldMember.roles.cache.every((role) => newMember.roles.cache.has(role.id));
      if (uguali) return;
    }

    await separators.sync(newMember).catch((err) => {
      logger.error(`Errore nei separatori di ${newMember.id}`, err);
    });
  },
};
