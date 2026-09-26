/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const ihlConfig = require('../../../config/ihl.config');
const logger = require('../../utils/logger');
const ihlRepository = require('../../database/repositories/ihlRepository');
const settingsRepository = require('../../database/repositories/settingsRepository');
const { COLORS } = require('../../utils/embeds');
const { buildCard } = require('../../utils/cards');
const { toReuploadable } = require('../../utils/attachments');
const leagues = require('./leagues');

const SETTINGS_KEY = 'ihl_leaderboard_message';
const BANNER_KEY = 'ihl_leaderboard_banner';
const PAGE_SIZE = 10;

// Ogni lega ha la sua classifica, il suo banner e il suo file allegato.
const messageKey = (league) => leagues.settingsKey(SETTINGS_KEY, league.id);
const bannerKey = (league) => leagues.settingsKey(BANNER_KEY, league.id);
const bannerBase = (league) => `ihl-classifica-${league.id}`;

// Da dove arriva il click: il pannello pubblico apre sempre una copia privata,
// così nessuno può cambiare pagina al messaggio che vedono tutti.
const PUBLIC = 'public';
const PERSONAL = 'self';

const MEDALS = ['🥇', '🥈', '🥉'];

function totalPages(league) {
  return Math.max(1, Math.ceil(ihlRepository.count(league.id) / PAGE_SIZE));
}

/** Il riferimento all'immagine caricata con /ihl classifica, se ce n'è una. */
function storedBannerRef(league) {
  const name = settingsRepository.get(bannerKey(league));
  return name ? `attachment://${name}` : null;
}

function buildList(league, current) {
  const rows = ihlRepository.page(league.id, PAGE_SIZE, current * PAGE_SIZE);
  if (!rows.length) return 'Nessuna partita disputata. La prima coda scrive la storia.';

  return rows
    .map((row, index) => {
      const position = current * PAGE_SIZE + index;
      const rank = position < 3 ? MEDALS[position] : `\`#${String(position + 1).padStart(2, '0')}\``;
      const winrate = row.matches ? Math.round((row.wins / row.matches) * 100) : 0;
      return `${rank}  <@${row.discord_id}>  ·  **${row.elo}** elo\n-# ${row.wins}V · ${row.losses}S · ${winrate}% winrate`;
    })
    .join('\n');
}

function buildComponents(league, page, pages, scope) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ihl_lb:${page - 1}:${scope}:${league.id}`)
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`ihl_lb:${page + 1}:${scope}:${league.id}`)
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pages - 1),
      new ButtonBuilder()
        .setCustomId(`ihl_lb:${page}:${scope}:${league.id}`)
        .setLabel('Aggiorna')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ihl_lb_me:${league.id}`)
        .setLabel('Vedi tu dove sei')
        .setEmoji('📍')
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

/**
 * La scheda della classifica in formato Components V2, come gli altri pannelli:
 * banner in cima, titolo grande e piè di pagina piccolo.
 */
function buildPayload(league, { page = 0, scope = PUBLIC, bannerRef } = {}) {
  const pages = totalPages(league);
  const current = Math.min(Math.max(page, 0), pages - 1);
  const players = ihlRepository.count(league.id);

  const card = buildCard({
    accentColor: COLORS.gold,
    bannerRef: bannerRef === undefined ? storedBannerRef(league) : bannerRef,
    title: `${league.emoji}  CLASSIFICA  ·  ${league.name}`,
    body: buildList(league, current),
    footnote:
      `Pagina ${current + 1}/${pages} · ${players} giocator${players === 1 ? 'e' : 'i'} · ` +
      (scope === PERSONAL
        ? 'stai sfogliando la tua copia privata'
        : 'si aggiorna da sola alla fine di ogni partita'),
    rows: buildComponents(league, current, pages, scope),
  });

  return { ...card, page: current, pages };
}

/** Il payload da inviare a Discord, senza i campi di servizio. */
function toMessage({ page, pages, ...payload }) {
  return payload;
}

/**
 * Pubblica la classifica o aggiorna quella esistente. L'immagine viene
 * ricaricata insieme al messaggio: gli URL degli allegati delle slash command
 * scadono, quello del messaggio no.
 */
async function publish(client, channel, attachment, league) {
  const banner = await toReuploadable(attachment, bannerBase(league));
  if (banner) settingsRepository.set(bannerKey(league), banner.file.name);

  const bannerRef = banner?.ref || storedBannerRef(league);
  const payload = toMessage(buildPayload(league, { bannerRef }));

  const stored = settingsRepository.get(messageKey(league));
  const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

  if (storedMessageId && storedChannelId === channel.id) {
    const existing = await channel.messages.fetch(storedMessageId).catch(() => null);
    if (existing) {
      // Senza `files` Discord tiene l'allegato che il messaggio ha già: l'immagine
      // resta al suo posto a ogni aggiornamento, senza ricaricarla ogni volta.
      await existing.edit(banner ? { ...payload, files: [banner.file] } : payload);
      return existing;
    }
  }

  const sent = await channel.send(banner ? { ...payload, files: [banner.file] } : payload);
  settingsRepository.set(messageKey(league), `${channel.id}:${sent.id}`);
  return sent;
}

/** Riallinea il pannello pubblico: chiamata alla fine di ogni partita. */
async function refresh(client, leagueId) {
  const league = leagues.find(leagueId);
  const stored = settingsRepository.get(messageKey(league));
  if (!stored) return;

  const [channelId, messageId] = stored.split(':');
  const channel = await client.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);
  if (!message) return;

  const payload = toMessage(buildPayload(league));

  try {
    await message.edit(payload);
    return;
  } catch (err) {
    logger.warn(`Classifica IHL: aggiornamento senza allegato rifiutato (${err.message}), riprovo ricaricandolo.`);
  }

  // Ripiego: se Discord non ha accettato il riferimento all'allegato esistente,
  // lo riscarichiamo dal messaggio e lo rimandiamo insieme alla scheda.
  const previous = message.attachments.first();
  const banner = previous ? await toReuploadable(previous, bannerBase(league)).catch(() => null) : null;

  await message
    .edit(banner ? { ...toMessage(buildPayload(league, { bannerRef: banner.ref })), files: [banner.file] } : payload)
    .catch((err) => logger.warn(`Classifica IHL non aggiornata: ${err.message}`));
}

/**
 * Cambio pagina. Dal pannello pubblico apre una copia privata, così la
 * classifica che vedono tutti resta sempre alla prima pagina e aggiornata;
 * dentro la copia privata si sfoglia aggiornando quella.
 */
async function turnPage(interaction, page, scope = PUBLIC, leagueId) {
  const league = leagues.find(leagueId);
  // La copia privata non porta l'immagine: l'allegato vive sul messaggio pubblico.
  const payload = toMessage(buildPayload(league, { page, scope: PERSONAL, bannerRef: null }));

  if (scope === PERSONAL) {
    // Il messaggio è già privato: il flag va ripetuto, altrimenti Discord
    // rifiuta l'aggiornamento di una risposta effimera.
    await interaction.update({ ...payload, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    ...payload,
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

/** Posizione e ELO di chi ha premuto, visibile solo a lui. */
async function showOwnPosition(interaction, leagueId) {
  const league = leagues.find(leagueId);
  const player = ihlRepository.find(league.id, interaction.user.id);

  if (!player) {
    await interaction.reply({
      content:
        `📍 Non sei ancora in classifica **${league.name}**: gioca la tua prima partita, ` +
        `poi parti da **${ihlConfig.elo.starting}** elo.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const rank = ihlRepository.rankOf(league.id, player.elo);
  const players = ihlRepository.count(league.id);
  const winrate = player.matches ? Math.round((player.wins / player.matches) * 100) : 0;
  const page = Math.floor((rank - 1) / PAGE_SIZE) + 1;
  const medal = rank <= 3 ? `${MEDALS[rank - 1]} ` : '';

  await interaction.reply({
    content:
      `📍 ${medal}**${league.name}** — sei **#${rank}** su **${players}** con **${player.elo}** elo.\n` +
      `-# ${player.wins}V · ${player.losses}S · ${player.matches} partite · ${winrate}% winrate — pagina ${page} della classifica.`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  publish,
  refresh,
  turnPage,
  showOwnPosition,
  buildPayload,
  PUBLIC,
  PERSONAL,
  SETTINGS_KEY,
  PAGE_SIZE,
};
