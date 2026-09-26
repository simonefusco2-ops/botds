/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const rankConfig = require('../../../config/rank.config');
const ruoliConfig = require('../../../config/ruoli.config');
const logger = require('../../utils/logger');

/**
 * Assegna da solo il ruolo di accesso alle IPL.
 *
 * Due requisiti, entrambi necessari: almeno un ruolo di gioco e un rank
 * verificato. Chi ha Immortale o Radiante entra nella Pro, tutti gli altri
 * nell'Open. Il controllo gira a ogni cambio di ruoli, quindi il momento in cui
 * i requisiti si completano — qualunque dei due arrivi per ultimo — è anche il
 * momento in cui il ruolo compare.
 *
 * Funziona anche al contrario: chi si toglie il ruolo di gioco perde l'accesso,
 * e chi sale a Immortale passa da Open a Pro senza tenersi il vecchio.
 */

/** Il rank verificato di un membro, letto dai suoi ruoli. */
function rankOf(member) {
  return rankConfig.ranks.find((rank) => rank.roleId && member.roles.cache.has(rank.roleId)) || null;
}

/** I ruoli di gioco che ha addosso. */
function gameRolesOf(member) {
  return ruoliConfig.roles.filter((role) => role.roleId && member.roles.cache.has(role.roleId));
}

/**
 * Quale accesso gli spetta adesso: 'pro', 'open' oppure null se i requisiti
 * non ci sono.
 */
function entitlement(member) {
  const rank = rankOf(member);
  const games = gameRolesOf(member);

  if (!rank || !games.length) return { league: null, rank, games };

  return { league: rank.league === 'pro' ? 'pro' : 'open', rank, games };
}

/**
 * Allinea i ruoli IPL del membro a quello che gli spetta.
 * @returns {Promise<{changed: boolean, league: string|null, reason?: string}>}
 */
async function sync(member) {
  if (!member || member.user?.bot) return { changed: false, league: null };

  const { pro, open } = rankConfig.iplRoleIds || {};
  if (!pro && !open) return { changed: false, league: null, reason: 'ruoli IPL non configurati' };

  const { league, rank, games } = entitlement(member);

  const wanted = league === 'pro' ? pro : league === 'open' ? open : null;
  const unwanted = [pro, open].filter((id) => id && id !== wanted);

  let changed = false;

  for (const roleId of unwanted) {
    if (!member.roles.cache.has(roleId)) continue;

    await member.roles.remove(roleId).then(() => { changed = true; }).catch((err) => {
      logger.warn(`IPL: ruolo ${roleId} non rimosso a ${member.id}: ${err.message}`);
    });
  }

  if (wanted && !member.roles.cache.has(wanted)) {
    await member.roles
      .add(wanted)
      .then(() => {
        changed = true;
        logger.info(
          `IPL: accesso ${league} assegnato a ${member.id} ` +
            `(${rank.name}, ${games.map((g) => g.label).join('/')}).`,
        );
      })
      .catch((err) => {
        logger.warn(`IPL: ruolo ${wanted} non assegnato a ${member.id}: ${err.message}`);
      });
  }

  return { changed, league, rank, games };
}

/** Cosa manca per essere ammessi: serve a spiegarlo a chi lo chiede. */
function missing(member) {
  const { rank, games } = entitlement(member);
  const mancanze = [];

  if (!games.length) mancanze.push('almeno un ruolo di gioco');
  if (!rank) mancanze.push('il rank verificato');

  return mancanze;
}

module.exports = { sync, entitlement, missing, rankOf, gameRolesOf };
