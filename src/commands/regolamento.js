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
const regolamento = require('../../config/regolamento.config');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'regolamento_message';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regolamento')
    .setDescription('Pubblica o aggiorna il regolamento del server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) => opt.setName('immagine').setDescription('Banner mostrato in cima al regolamento')),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    let banner = null;
    try {
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'regolamento');
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const stored = settingsRepository.get(SETTINGS_KEY);
    const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

    const existing =
      storedMessageId && storedChannelId === channel.id
        ? await channel.messages.fetch(storedMessageId).catch(() => null)
        : null;

    // Senza una nuova immagine in fase di aggiornamento riallegiamo quella presente:
    // il riferimento attachment:// vale solo per i file inviati con la stessa chiamata.
    if (!banner && existing) {
      const previous = existing.attachments.first();
      if (previous) {
        banner = await toReuploadable(previous, 'regolamento').catch(() => null);
      }
    }

    const card = buildCard({
      accentColor: COLORS.gold,
      bannerRef: banner?.ref,
      title: regolamento.title,
      body: regolamento.intro,
      sections: regolamento.rules.map((rule) => ({
        name: `${rule.emoji}  ${rule.name}`,
        value: `-# ${rule.subtitle}\n${rule.text}`,
      })),
      separateSections: true,
      footnote: regolamento.footer,
    });

    const payload = { ...card, files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Regolamento aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content: `✅ Regolamento pubblicato in ${channel}. Rilanciando il comando verrà aggiornato, non duplicato.`,
    });
  },
};
