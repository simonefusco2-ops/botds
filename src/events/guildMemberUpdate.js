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
const iplAccess = require('../modules/rank/iplAccess');
const notify = require('../modules/rank/notify');
const separators = require('../modules/separators/separators');

/**
 * L'accesso alle IPL dipende dai ruoli, quindi va ricontrollato ogni volta che
 * i ruoli cambiano — da qualunque parte arrivi il cambiamento: il pannello, lo
 * staff che assegna a mano, un altro bot. Così il ruolo compare da solo nel
 * momento in cui i requisiti si completano.
 */
module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    // I ruoli sono l'unica cosa che ci interessa: nickname e avatar no.
    if (oldMember.roles.cache.size === newMember.roles.cache.size) {
      const uguali = oldMember.roles.cache.every((role) => newMember.roles.cache.has(role.id));
      if (uguali) return;
    }

    // Chi entra o esce dallo staff guadagna o perde il separatore staff; e se
    // qualcuno toglie a mano un separatore, torna.
    await separators.sync(newMember).catch((err) => {
      logger.error(`Errore nei separatori di ${newMember.id}`, err);
    });

    // Come stava prima, per capire dopo cosa è cambiato davvero.
    const prima = notify.snapshot(oldMember);

    await iplAccess.sync(newMember).catch((err) => {
      logger.error(`Errore nel controllo dell'accesso IPL per ${newMember.id}`, err);
    });

    // E glielo diciamo: chi riceve un rank a mano dallo staff non vede nessuna
    // risposta del bot, e senza avviso non sa che gli manca ancora un passo.
    const avviso = await notify.announce(newMember, prima).catch((err) => {
      logger.error(`Errore nell'avviso sui ruoli per ${newMember.id}`, err);
      return null;
    });

    if (avviso) logger.info(`Ruoli: avviso "${avviso}" mandato a ${newMember.id}.`);
  },
};
