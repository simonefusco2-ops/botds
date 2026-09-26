/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ruoliConfig = require('../../config/ruoli.config');
const rolePanel = require('../modules/rank/rolePanel');
const { toReuploadable } = require('../utils/attachments');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'ruoli_panel_message';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pannello-ruoli')
    .setDescription('Pubblica il pannello con i ruoli di gioco e la verifica del rank')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) =>
      opt.setName('immagine').setDescription('Banner mostrato in cima al pannello'),
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    let banner = null;
    try {
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'ruoli');
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const stored = settingsRepository.get(SETTINGS_KEY);
    const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

    const existing =
      storedMessageId && storedChannelId === channel.id
        ? await channel.messages.fetch(storedMessageId).catch(() => null)
        : null;

    // Aggiornando senza una nuova immagine riallegiamo quella già presente: il
    // riferimento attachment:// vale solo per i file inviati con la stessa chiamata.
    if (!banner && existing) {
      const previous = existing.attachments.first();
      if (previous) banner = await toReuploadable(previous, 'ruoli').catch(() => null);
    }

    const payload = { ...rolePanel.buildPanel(banner?.ref), files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Pannello ruoli aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content:
        `✅ Pannello ruoli pubblicato in ${channel}, con ${ruoliConfig.roles.length} ruoli di gioco e la verifica del rank.\n` +
        '-# Rilanciando il comando viene aggiornato, non duplicato. Senza `immagine` il banner già caricato resta.',
    });
  },
};
