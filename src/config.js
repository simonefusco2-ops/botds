/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
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

  tempVcCategoryId: process.env.TEMP_VC_CATEGORY_ID || null,

  twitchClientId: process.env.TWITCH_CLIENT_ID || null,
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || null,
  twitchAnnounceChannelId: process.env.TWITCH_ANNOUNCE_CHANNEL_ID || null,
  twitchMention: process.env.TWITCH_MENTION || 'everyone',
  twitchPollSeconds: parseInt(process.env.TWITCH_POLL_SECONDS || '120', 10),

  socialAnnounceChannelId: process.env.SOCIAL_ANNOUNCE_CHANNEL_ID || null,
  socialMention: process.env.SOCIAL_MENTION || 'everyone',
  socialPollSeconds: parseInt(process.env.SOCIAL_POLL_SECONDS || '300', 10),
  socialMaxPerCheck: parseInt(process.env.SOCIAL_MAX_PER_CHECK || '3', 10),

  // Chiave del servizio che fornisce il rank di Valorant (HenrikDev).
  rankApiKey: process.env.HENRIK_API_KEY || null,

  // Porta del server HTTP (API per il sito). FACEIT_WEBHOOK_PORT è il vecchio
  // nome: resta letto perché il .env sulla VPS potrebbe avere ancora quello.
  httpPort: parseInt(process.env.API_PORT || process.env.FACEIT_WEBHOOK_PORT || '3000', 10),

  // API di sola lettura per il sito.
  // Senza API_TOKEN è aperta (i dati sono gli stessi già pubblici su Discord).
  apiEnabled: process.env.API_ENABLED !== 'false',
  apiToken: process.env.API_TOKEN || null,
  apiAllowedOrigin: process.env.API_ALLOWED_ORIGIN || '*',
  apiCacheSeconds: parseInt(process.env.API_CACHE_SECONDS || '30', 10),
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '120', 10),

  databasePath: process.env.DATABASE_PATH || './data/bot.db',
};
