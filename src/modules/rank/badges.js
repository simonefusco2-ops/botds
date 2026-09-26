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

/**
 * Le insegne di un giocatore: rank e ruoli di gioco, come emoji.
 *
 * Servono nelle schede della In-House League, dove i capitani scelgono chi
 * prendere: un elenco di soli nomi non dice niente, gli stessi nomi con rank e
 * ruoli accanto si leggono a colpo d'occhio. Si ricavano dai ruoli Discord,
 * quindi valgono per chiunque abbia fatto la verifica e non costano query.
 */

/** Disegnare una scheda non deve mai fallire: un membro senza ruoli in cache
 *  semplicemente non ha insegne. */
function has(member, roleId) {
  return Boolean(roleId) && Boolean(member?.roles?.cache?.has(roleId));
}

function rankOf(member) {
  return rankConfig.ranks.find((rank) => has(member, rank.roleId)) || null;
}

function gameRolesOf(member) {
  return ruoliConfig.roles.filter((role) => has(member, role.roleId));
}

/** Rank e ruoli di un membro, già pronti da stampare. */
function forMember(member) {
  const rank = rankOf(member);
  const roles = gameRolesOf(member);

  return {
    rank,
    roles,
    // Il rank per primo, poi i ruoli: l'ordine resta lo stesso per tutti.
    badge: [rank?.emoji, ...roles.map((role) => role.emoji)].filter(Boolean).join(' '),
    label: [rank?.name, roles.map((role) => role.label).join(', ')].filter(Boolean).join(' · '),
  };
}

/**
 * Le insegne di più giocatori in una volta.
 * @returns {Promise<Object<string, {rank, roles, badge, label}>>}
 */
async function forIds(guild, ids) {
  const badges = {};
  if (!guild?.members) return badges;

  for (const id of ids) {
    // La cache copre quasi sempre: il fetch è il ripiego per chi non c'è dentro.
    const member = guild.members.cache?.get(id) || (await guild.members.fetch(id).catch(() => null));
    if (member) badges[id] = forMember(member);
  }

  return badges;
}

module.exports = { forMember, forIds, rankOf, gameRolesOf };
