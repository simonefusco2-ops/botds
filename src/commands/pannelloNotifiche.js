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
const notificheConfig = require('../../config/notifiche.config');
const liveRolePanel = require('../modules/twitch/liveRolePanel');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'live_notify_panel_message';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pannello-notifiche')
    .setDescription('Pubblica il pannello per attivare le notifiche delle live Twitch')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) => opt.setName('immagine').setDescription('Banner mostrato in cima al pannello')),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    let banner = null;
    try {
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'notifiche');
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const stored = settingsRepository.get(SETTINGS_KEY);
    const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];
    const existing =
      storedMessageId && storedChannelId === channel.id
        ? await channel.messages.fetch(storedMessageId).catch(() => null)
        : null;

    // Senza un'immagine nuova si riallega quella già presente: attachment://
    // vale solo per i file inviati nella stessa chiamata.
    if (!banner && existing) {
      const previous = existing.attachments.first();
      if (previous) banner = await toReuploadable(previous, 'notifiche').catch(() => null);
    }

    const card = buildCard({
      accentColor: COLORS.gold,
      bannerRef: banner?.ref,
      title: notificheConfig.title,
      body: notificheConfig.intro,
      footnote: notificheConfig.footnote,
      rows: [liveRolePanel.buildButtons()],
    });

    const payload = { ...card, files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Pannello notifiche aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content: `✅ Pannello notifiche pubblicato in ${channel}.\n-# Rilanciando il comando viene aggiornato, non duplicato.`,
    });
  },
};
