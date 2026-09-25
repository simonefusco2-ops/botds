/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const ihlRepository = require('../../database/repositories/ihlRepository');
const settingsRepository = require('../../database/repositories/settingsRepository');
const { COLORS } = require('../../utils/embeds');

const SETTINGS_KEY = 'ihl_leaderboard_message';
const PAGE_SIZE = 10;

function totalPages() {
  return Math.max(1, Math.ceil(ihlRepository.count() / PAGE_SIZE));
}

function buildEmbed(page = 0) {
  const pages = totalPages();
  const current = Math.min(Math.max(page, 0), pages - 1);
  const rows = ihlRepository.page(PAGE_SIZE, current * PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏆  CLASSIFICA IN-HOUSE LEAGUE')
    .setFooter({ text: `Pagina ${current + 1}/${pages} · ${ihlRepository.count()} giocatori · aggiornata a fine partita` })
    .setTimestamp();

  if (!rows.length) {
    embed.setDescription('Nessuna partita disputata. La prima coda scrive la storia.');
    return { embed, page: current, pages };
  }

  const medals = ['🥇', '🥈', '🥉'];
  embed.setDescription(
    rows
      .map((row, index) => {
        const position = current * PAGE_SIZE + index;
        const rank = position < 3 ? medals[position] : `\`#${String(position + 1).padStart(2, '0')}\``;
        const winrate = row.matches ? Math.round((row.wins / row.matches) * 100) : 0;
        return `${rank} <@${row.discord_id}> — **${row.elo}** elo\n-# ${row.wins}V · ${row.losses}S · ${winrate}% winrate`;
      })
      .join('\n'),
  );

  return { embed, page: current, pages };
}

function buildComponents(page, pages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ihl_lb:${page - 1}`)
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`ihl_lb:${page + 1}`)
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pages - 1),
      new ButtonBuilder().setCustomId(`ihl_lb:${page}`).setLabel('Aggiorna').setEmoji('🔄').setStyle(ButtonStyle.Primary),
    ),
  ];
}

function buildPayload(page = 0) {
  const { embed, page: current, pages } = buildEmbed(page);
  return { embeds: [embed], components: buildComponents(current, pages) };
}

/** Crea il messaggio della classifica o aggiorna quello esistente. */
async function publish(client, channel) {
  const payload = buildPayload(0);

  const stored = settingsRepository.get(SETTINGS_KEY);
  const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

  if (storedMessageId && storedChannelId === channel.id) {
    const existing = await channel.messages.fetch(storedMessageId).catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return existing;
    }
  }

  const sent = await channel.send(payload);
  settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);
  return sent;
}

async function refresh(client) {
  const stored = settingsRepository.get(SETTINGS_KEY);
  if (!stored) return;

  const [channelId, messageId] = stored.split(':');
  const channel = await client.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);

  await message?.edit(buildPayload(0)).catch((err) => {
    logger.warn(`Classifica IHL non aggiornata: ${err.message}`);
  });
}

/** Cambio pagina dai bottoni: aggiorna il messaggio esistente senza crearne altri. */
async function turnPage(interaction, page) {
  await interaction.update(buildPayload(page));
}

module.exports = { publish, refresh, turnPage, buildPayload, SETTINGS_KEY, PAGE_SIZE };
