const config = require('../../config');
const logger = require('../../utils/logger');
const memberTrackingRepository = require('../../database/repositories/memberTrackingRepository');
const inviteTracker = require('./inviteTracker');
const { buildMemberJoinEmbed, buildMemberLeaveEmbed } = require('../../utils/embeds');

async function getLogChannel(guild, channelId) {
  if (!channelId) return null;
  return guild.channels.fetch(channelId).catch(() => null);
}

async function logJoin(member) {
  const invite = await inviteTracker.resolveUsedInvite(member);
  const joinedAt = (member.joinedAt || new Date()).toISOString();

  memberTrackingRepository.recordJoin({
    discordId: member.id,
    guildId: member.guild.id,
    username: member.user.tag,
    inviteCode: invite.code,
    inviterId: invite.inviterId,
    joinedAt,
  });

  const channel = await getLogChannel(member.guild, config.memberJoinChannelId);
  if (!channel) return;

  const inviterStats = invite.inviterId ? memberTrackingRepository.countByInviter(invite.inviterId) : null;

  const embed = buildMemberJoinEmbed({
    member,
    invite,
    inviterStats,
    memberCount: member.guild.memberCount,
  });

  await channel.send({ embeds: [embed] }).catch((err) => {
    logger.error('Errore invio log ingresso membro', err);
  });
}

async function logLeave(member) {
  const tracking = memberTrackingRepository.find(member.id);
  memberTrackingRepository.recordLeave(member.id, new Date().toISOString());

  const channel = await getLogChannel(member.guild, config.memberLeaveChannelId);
  if (!channel) return;

  const roles = member.roles?.cache
    ? [...member.roles.cache.values()].filter((role) => role.id !== member.guild.id).map((role) => `<@&${role.id}>`)
    : [];

  const embed = buildMemberLeaveEmbed({
    member,
    tracking,
    memberCount: member.guild.memberCount,
    roles,
  });

  await channel.send({ embeds: [embed] }).catch((err) => {
    logger.error('Errore invio log uscita membro', err);
  });
}

module.exports = { logJoin, logLeave };
