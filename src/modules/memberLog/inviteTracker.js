const logger = require('../../utils/logger');

/** guildId -> Map<inviteCode, { uses, inviterId, deletedAt? }> */
const cache = new Map();

/**
 * Quando un invito a usi limitati si esaurisce, Discord emette inviteDelete e
 * guildMemberAdd senza ordine garantito. Teniamo quindi in cache gli inviti
 * eliminati per qualche secondo, così l'ingresso resta attribuibile.
 */
const DELETED_GRACE_MS = 30_000;

function snapshot(invites, previous = new Map()) {
  const map = new Map();

  for (const invite of invites.values()) {
    map.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviter?.id || null });
  }

  for (const [code, entry] of previous) {
    if (map.has(code)) continue;
    if (entry.deletedAt && Date.now() - entry.deletedAt < DELETED_GRACE_MS) {
      map.set(code, entry);
    }
  }

  return map;
}

async function primeCache(guild) {
  try {
    const invites = await guild.invites.fetch();
    cache.set(guild.id, snapshot(invites));
    logger.info(`Cache inviti inizializzata per ${guild.name}: ${invites.size} inviti.`);
  } catch (err) {
    logger.warn(
      `Impossibile leggere gli inviti di ${guild.name} (serve il permesso "Gestisci server"): ${err.message}`,
    );
  }
}

function addToCache(invite) {
  const guildId = invite.guild?.id;
  if (!guildId) return;

  const guildCache = cache.get(guildId) || new Map();
  guildCache.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviter?.id || null });
  cache.set(guildId, guildCache);
}

function removeFromCache(invite) {
  const entry = cache.get(invite.guild?.id)?.get(invite.code);
  if (entry) entry.deletedAt = Date.now();
}

/**
 * Determina quale invito ha usato un nuovo membro, confrontando i contatori
 * "uses" attuali con quelli in cache.
 */
async function resolveUsedInvite(member) {
  if (member.user.bot) return { code: null, inviterId: null, source: 'bot' };

  const previous = cache.get(member.guild.id) || new Map();

  let current;
  try {
    current = await member.guild.invites.fetch();
  } catch (err) {
    logger.warn(`Impossibile leggere gli inviti durante l'ingresso di ${member.user.tag}: ${err.message}`);
    return { code: null, inviterId: null, source: 'unknown' };
  }

  let used = null;

  for (const invite of current.values()) {
    const usesBefore = previous.get(invite.code)?.uses ?? 0;
    if ((invite.uses ?? 0) > usesBefore) {
      used = { code: invite.code, inviterId: invite.inviter?.id || null, source: 'invite' };
      break;
    }
  }

  if (!used) {
    for (const [code, entry] of previous) {
      const isGone = !current.has(code);
      const recentlyDeleted = entry.deletedAt && Date.now() - entry.deletedAt < DELETED_GRACE_MS;
      if (isGone || recentlyDeleted) {
        used = { code, inviterId: entry.inviterId, source: 'invite_esaurito' };
        break;
      }
    }
  }

  cache.set(member.guild.id, snapshot(current, previous));

  return used || { code: null, inviterId: null, source: 'unknown' };
}

module.exports = { primeCache, addToCache, removeFromCache, resolveUsedInvite };
