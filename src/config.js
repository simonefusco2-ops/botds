require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
}

module.exports = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  clientId: requireEnv('CLIENT_ID'),
  guildId: requireEnv('GUILD_ID'),
  staffRoleId: process.env.STAFF_ROLE_ID || null,
  autoRoleId: process.env.AUTOROLE_ID || null,

  // MEMBER_LOG_CHANNEL_ID funge da ripiego quando ingressi e uscite vanno nello stesso canale.
  memberJoinChannelId: process.env.MEMBER_JOIN_CHANNEL_ID || process.env.MEMBER_LOG_CHANNEL_ID || null,
  memberLeaveChannelId: process.env.MEMBER_LEAVE_CHANNEL_ID || process.env.MEMBER_LOG_CHANNEL_ID || null,

  ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
  transcriptChannelId: process.env.TRANSCRIPT_CHANNEL_ID || null,

  leaderboardChannelId: process.env.LEADERBOARD_CHANNEL_ID || null,
  leaderboardTopN: parseInt(process.env.LEADERBOARD_TOP_N || '10', 10),

  tempVcCategoryId: process.env.TEMP_VC_CATEGORY_ID || null,

  twitchClientId: process.env.TWITCH_CLIENT_ID || null,
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || null,
  twitchAnnounceChannelId: process.env.TWITCH_ANNOUNCE_CHANNEL_ID || null,
  twitchMention: process.env.TWITCH_MENTION || 'everyone',
  twitchPollSeconds: parseInt(process.env.TWITCH_POLL_SECONDS || '120', 10),

  faceitApiKey: process.env.FACEIT_API_KEY || null,
  faceitWebhookSecret: process.env.FACEIT_WEBHOOK_SECRET || null,
  faceitWebhookPort: parseInt(process.env.FACEIT_WEBHOOK_PORT || '3000', 10),

  databasePath: process.env.DATABASE_PATH || './data/bot.db',
};
