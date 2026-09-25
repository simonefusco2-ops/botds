/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const Parser = require('rss-parser');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');
const socialRepository = require('../../database/repositories/socialRepository');
const { buildSocialPostEmbed, SOCIAL_PLATFORMS } = require('../../utils/embeds');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IvpiterBot/1.0)' },
});

let running = false;

function isConfigured() {
  return Boolean(config.socialAnnounceChannelId);
}

/** @everyone e @here passano entrambi dal parse "everyone"; un ID invece è un ruolo. */
function buildMention() {
  const mention = config.socialMention;
  if (!mention || mention === 'nessuna') return { content: null, allowedMentions: { parse: [] } };
  if (mention === 'everyone') return { content: '@everyone', allowedMentions: { parse: ['everyone'] } };
  if (mention === 'here') return { content: '@here', allowedMentions: { parse: ['everyone'] } };
  return { content: `<@&${mention}>`, allowedMentions: { roles: [mention] } };
}

/** Identificativo stabile della voce: i feed non espongono tutti gli stessi campi. */
function itemId(item) {
  return item.guid || item.id || item.link || item.title || null;
}

/**
 * Le voci dal post più recente al più vecchio.
 *
 * Non tutti i generatori di feed le mettono in quest'ordine: alcuni ponti RSS
 * le elencano dalla più vecchia. Fidandosi dell'ordine del documento, con un
 * feed così il post nuovo finirebbe in fondo e il bot non lo vedrebbe mai.
 * Se le date non ci sono o non sono leggibili teniamo l'ordine originale,
 * che resta l'ipotesi più sensata.
 */
function sortNewestFirst(items) {
  const dated = items.map((item, index) => ({
    item,
    index,
    time: Date.parse(item.isoDate || item.pubDate || item.date || ''),
  }));

  if (dated.some((entry) => Number.isNaN(entry.time))) return items;

  return dated.sort((a, b) => b.time - a.time || a.index - b.index).map((entry) => entry.item);
}

/** L'immagine del post arriva da campi diversi secondo il generatore del feed. */
function extractImage(item) {
  const candidate =
    item.enclosure?.url ||
    item['media:content']?.$?.url ||
    item['media:thumbnail']?.$?.url ||
    item.itunes?.image;

  if (candidate) return candidate;

  const match = (item['content:encoded'] || item.content || '').match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : null;
}

/**
 * Pubblica il post nel canale annunci. Con `mention: false` non tagga nessuno:
 * serve alla prova manuale, che non deve svegliare tutto il server.
 */
async function announce(client, feed, item, { mention: withMention = true } = {}) {
  const channel = await client.channels.fetch(config.socialAnnounceChannelId).catch(() => null);
  if (!channel) {
    throw new Error(`canale annunci ${config.socialAnnounceChannelId} non raggiungibile`);
  }

  const mention = withMention ? buildMention() : { content: null, allowedMentions: { parse: [] } };
  const components = [];

  if (item.link) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Apri il post').setStyle(ButtonStyle.Link).setURL(item.link),
      ),
    );
  }

  await channel.send({
    content: mention.content ?? undefined,
    embeds: [
      buildSocialPostEmbed({
        platform: feed.platform,
        label: feed.label,
        item,
        imageUrl: extractImage(item),
      }),
    ],
    components,
    allowedMentions: mention.allowedMentions,
  });
}

async function checkFeed(client, feed) {
  let parsed;
  try {
    parsed = await parser.parseURL(feed.feed_url);
  } catch (err) {
    throw new Error(`feed non leggibile: ${err.message}`);
  }

  const items = sortNewestFirst(parsed.items || []);
  if (!items.length) return;

  const latest = items[0];
  const latestId = itemId(latest);
  if (!latestId) return;

  // Primo controllo di un feed appena aggiunto: memorizziamo lo stato corrente
  // senza annunciare, altrimenti verrebbero pubblicati tutti i post già esistenti.
  if (!feed.last_item_id) {
    socialRepository.setLastItem(feed.feed_url, latestId);
    logger.info(`Feed ${feed.platform} allineato: da ora verranno annunciati solo i nuovi post.`);
    return;
  }

  if (feed.last_item_id === latestId) return;

  // Pubblichiamo tutte le novità dalla più vecchia alla più recente, con un tetto
  // per evitare raffiche se il feed è rimasto fermo a lungo.
  const knownIndex = items.findIndex((item) => itemId(item) === feed.last_item_id);
  const fresh = (knownIndex === -1 ? items.slice(0, 1) : items.slice(0, knownIndex)).reverse();

  for (const item of fresh.slice(-config.socialMaxPerCheck)) {
    try {
      await announce(client, feed, item);
    } catch (err) {
      // Senza aggiornare last_item_id il post verrà ritentato al prossimo giro:
      // un problema di permessi nel canale non fa perdere l'annuncio.
      throw new Error(`annuncio non pubblicato: ${err.message}`);
    }
    logger.info(`Annunciato nuovo post ${feed.platform}: ${item.link || itemId(item)}`);
  }

  socialRepository.setLastItem(feed.feed_url, latestId);
}

async function poll(client) {
  if (running) return;
  running = true;

  try {
    for (const feed of socialRepository.list()) {
      try {
        await checkFeed(client, feed);
      } catch (err) {
        logger.warn(`Social ${feed.platform} (${feed.feed_url}): ${err.message}`);
      }
    }
  } finally {
    running = false;
  }
}

/**
 * Prova manuale: pubblica l'ultimo post di ogni feed senza taggare nessuno e
 * senza toccare lo stato, così si verifica tutta la catena (lettura del feed,
 * permessi nel canale, embed) senza aspettare che qualcuno pubblichi davvero.
 */
async function testFeeds(client) {
  const results = [];

  for (const feed of socialRepository.list()) {
    try {
      const parsed = await parser.parseURL(feed.feed_url);
      const [item] = sortNewestFirst(parsed.items || []);

      if (!item) {
        results.push({ feed, ok: false, reason: 'il feed è valido ma non contiene nessun post' });
        continue;
      }

      await announce(client, feed, item, { mention: false });
      results.push({ feed, ok: true, title: item.title || item.link || itemId(item) });
    } catch (err) {
      results.push({ feed, ok: false, reason: err.message });
    }
  }

  return results;
}

function start(client) {
  if (!isConfigured()) {
    logger.info('Notifiche social disattivate (SOCIAL_ANNOUNCE_CHANNEL_ID mancante).');
    return;
  }

  const intervalMs = Math.max(60, config.socialPollSeconds) * 1000;
  poll(client);
  const timer = setInterval(() => poll(client), intervalMs);
  timer.unref?.();

  logger.info(`Notifiche social attive: controllo ogni ${intervalMs / 1000}s.`);
}

module.exports = { start, poll, announce, testFeeds, sortNewestFirst, itemId, isConfigured, SOCIAL_PLATFORMS };
