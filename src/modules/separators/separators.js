/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const separatoriConfig = require('../../../config/separatori.config');
const logger = require('../../utils/logger');

/** I separatori che questo membro dovrebbe avere, e quello staff se non gli spetta. */
function plan(member) {
  const has = (roleId) => member.roles.cache.has(roleId);
  const staff = separatoriConfig.staff;
  const isStaff = staff.roleIds.some(has);

  const add = separatoriConfig.everyone.map((entry) => entry.roleId).filter((id) => id && !has(id));
  if (staff.roleId && isStaff && !has(staff.roleId)) add.push(staff.roleId);

  const remove = staff.roleId && !isStaff && has(staff.roleId) ? [staff.roleId] : [];
  return { add, remove };
}

/**
 * Mette in pari i separatori di un membro. Idempotente: se è già a posto non
 * chiama Discord, quindi si può lanciare a ogni cambio di ruoli senza costi.
 * I bot restano fuori: nella lista membri stanno sotto i loro ruoli.
 */
async function sync(member) {
  if (!member || member.user?.bot) return false;

  const { add, remove } = plan(member);
  if (!add.length && !remove.length) return false;

  // Un'unica modifica per aggiungere tutto: una richiesta invece di tre.
  if (add.length) await member.roles.add(add, 'Separatori automatici');
  if (remove.length) await member.roles.remove(remove, 'Separatore staff: non ha più ruoli staff');
  return true;
}

/**
 * All'avvio: chi c'era già prima di questa funzione, o ha perso un separatore
 * mentre il bot era spento. Gira in sottofondo, un membro alla volta, così i
 * limiti di Discord li gestisce la coda di discord.js senza bloccare il bot.
 */
async function syncAll(guild) {
  const members = await guild.members.fetch();
  let changed = 0;
  let failed = 0;

  for (const member of members.values()) {
    try {
      if (await sync(member)) changed += 1;
    } catch (err) {
      failed += 1;
      // Di solito è la gerarchia: il ruolo del bot sotto i separatori. Basta dirlo una volta.
      if (failed === 1) logger.error(`Separatori: impossibile aggiornare ${member.id}: ${err.message}`);
    }
  }

  logger.info(`Separatori: ${changed} membri aggiornati su ${members.size}` + (failed ? `, ${failed} errori` : '') + '.');
}

module.exports = { plan, sync, syncAll };
