/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const hub = require('../../config/hub.config');
const ticketTypes = require('../../config/tickets.config');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const { applyEmoji } = require('../utils/emoji');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'regolamento_hub_message';

/**
 * Il bottone apre un ticket vero, lo stesso meccanismo del pannello generale:
 * il canale nasce nella categoria dei ticket, con lo staff dentro.
 */
function buildRequestRow() {
  return new ActionRowBuilder().addComponents(
    applyEmoji(
      new ButtonBuilder()
        .setCustomId(`ticket_open:${hub.ticketTypeId}`)
        .setLabel(hub.button.label)
        .setStyle(ButtonStyle.Success),
      hub.button.emoji,
    ),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regolamento-hub')
    .setDescription('Pubblica il regolamento delle HUB con il bottone per richiedere il ruolo IPL')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) =>
      opt.setName('immagine').setDescription('Banner mostrato in cima al regolamento'),
    ),
  async execute(interaction) {
    // Senza il tipo di ticket il bottone aprirebbe la pratica sbagliata: meglio
    // dirlo subito che far scoprire l'errore a chi preme.
    if (!ticketTypes.some((type) => type.id === hub.ticketTypeId)) {
      return interaction.reply({
        content:
          `❌ Il tipo di ticket \`${hub.ticketTypeId}\` non esiste in \`config/tickets.config.js\`: ` +
          'il bottone aprirebbe la richiesta sbagliata.',
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel('canale') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    let banner = null;
    try {
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'regolamento-hub');
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const stored = settingsRepository.get(SETTINGS_KEY);
    const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

    const existing =
      storedMessageId && storedChannelId === channel.id
        ? await channel.messages.fetch(storedMessageId).catch(() => null)
        : null;

    // Aggiornando senza una nuova immagine riallegiamo quella presente: il
    // riferimento attachment:// vale solo per i file inviati con la stessa chiamata.
    if (!banner && existing) {
      const previous = existing.attachments.first();
      if (previous) banner = await toReuploadable(previous, 'regolamento-hub').catch(() => null);
    }

    const card = buildCard({
      accentColor: COLORS.gold,
      bannerRef: banner?.ref,
      title: hub.title,
      body: hub.intro,
      sections: hub.rules.map((rule) => ({
        name: `${rule.emoji}  ${rule.name}`,
        value: `-# ${rule.subtitle}\n${rule.text}`,
      })),
      separateSections: true,
      // Leghe, sanzioni e istruzioni per il rank chiudono la scheda, sopra il bottone.
      footnote: `${hub.leagues}\n\n${hub.warning}\n\n${hub.request}\n\n-# ${hub.footer}`,
      rows: [buildRequestRow()],
    });

    const payload = { ...card, files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Regolamento HUB aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content:
        `✅ Regolamento HUB pubblicato in ${channel}, col bottone per la richiesta del ruolo IPL.\n` +
        '-# Rilanciando il comando viene aggiornato, non duplicato. Senza `immagine` il banner già caricato resta.',
    });
  },
};
