/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');
const twitchApi = require('./twitchApi');
const twitchRepository = require('../../database/repositories/twitchRepository');
const { buildTwitchLiveEmbed } = require('../../utils/embeds');
const twitchConfig = require('../../../config/twitch.config');

let running = false;

// Il canale annunci non è più obbligatorio: i gruppi possono avere il proprio.
function isConfigured() {
  return Boolean(config.twitchClientId && config.twitchClientSecret);
}

function groupOf(category) {
  return twitchConfig.groups[category] || twitchConfig.groups.generale;
}

/** @everyone e @here passano entrambi dal parse "everyone"; un ID invece è un ruolo. */
function buildMention(group) {
  if (group?.roleIds?.length) {
    const roles = group.roleIds.filter(Boolean);
    return { content: roles.map((id) => `<@&${id}>`).join(' '), allowedMentions: { parse: [], roles } };
  }

  const mention = config.twitchMention;
  if (!mention || mention === 'nessuna') return { content: null, allowedMentions: { parse: [] } };
  if (mention === 'everyone') return { content: '@everyone', allowedMentions: { parse: ['everyone'] } };
  if (mention === 'here') return { content: '@here', allowedMentions: { parse: ['everyone'] } };
  return { content: `<@&${mention}>`, allowedMentions: { roles: [mention] } };
}

async function announce(client, stream, user, category = 'generale') {
  const group = groupOf(category);
  const channelId = group.channelId || config.twitchAnnounceChannelId;
  const channel = channelId ? await client.channels.fetch(channelId).catch(() => null) : null;
  if (!channel) {
    logger.warn(`Canale annunci Twitch del gruppo "${category}" non trovato.`);
    return;
  }

  const mention = buildMention(group);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Guarda la live')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://twitch.tv/${stream.user_login}`),
  );

  await channel.send({
    content: mention.content ?? undefined,
    embeds: [buildTwitchLiveEmbed({ stream, user })],
    components: [row],
    allowedMentions: mention.allowedMentions,
  });
}

async function poll(client) {
  if (running) return;
  running = true;

  try {
    const streamers = twitchRepository.list();
    if (!streamers.length) return;

    const streams = await twitchApi.getStreams(streamers.map((s) => s.login));
    const liveByLogin = new Map(streams.map((s) => [s.user_login.toLowerCase(), s]));

    for (const streamer of streamers) {
      const stream = liveByLogin.get(streamer.login);

      if (!stream) {
        if (streamer.is_live) twitchRepository.setOffline(streamer.login);
        continue;
      }

      // Confrontiamo l'ID della diretta, non solo lo stato: così un riavvio del bot
      // durante una live non produce un secondo annuncio della stessa diretta.
      if (streamer.last_stream_id === stream.id) continue;

      const user = await twitchApi.getUserByLogin(stream.user_login).catch(() => null);
      await announce(client, stream, user, streamer.category);
      twitchRepository.setLive(streamer.login, stream.id);
      logger.info(`Annunciata la live di ${stream.user_login}`);
    }
  } catch (err) {
    logger.error('Errore durante il controllo delle live Twitch', err.response?.data || err.message);
  } finally {
    running = false;
  }
}

function start(client) {
  if (!isConfigured()) {
    logger.info('Notifiche Twitch disattivate (TWITCH_CLIENT_ID/SECRET mancanti).');
    return;
  }

  const intervalMs = Math.max(30, config.twitchPollSeconds) * 1000;
  poll(client);
  const timer = setInterval(() => poll(client), intervalMs);
  timer.unref?.();

  logger.info(`Notifiche Twitch attive: controllo ogni ${intervalMs / 1000}s.`);
}

module.exports = { start, poll, announce, isConfigured, groupOf };
