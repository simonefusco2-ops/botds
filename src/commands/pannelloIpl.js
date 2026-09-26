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
const iplConfig = require('../../config/ipl.config');
const ruoliConfig = require('../../config/ruoli.config');
const rankConfig = require('../../config/rank.config');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'ipl_panel_message';

/** I ruoli di gioco elencati con le loro emoji, uno per riga. */
function rolesList() {
  return ruoliConfig.roles.map((role) => `> ${role.emoji} **${role.label}**`).join('\n');
}

function threshold() {
  const rank = rankConfig.ranks.find((entry) => entry.name === rankConfig.approvalFrom);
  return rank ? `${rank.emoji} **${rank.name}**` : `**${rankConfig.approvalFrom}**`;
}

/** Riempie i segnaposto del testo con i dati veri della configurazione. */
function fill(text, channelId) {
  return text
    .replaceAll('{ruoli}', rolesList())
    .replaceAll('{canale}', `<#${channelId}>`)
    .replaceAll('{soglia}', threshold());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pannello-ipl')
    .setDescription('Pubblica il pannello che spiega come partecipare alle IPL')
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
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'ipl');
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const stored = settingsRepository.get(SETTINGS_KEY);
    const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

    const existing =
      storedMessageId && storedChannelId === channel.id
        ? await channel.messages.fetch(storedMessageId).catch(() => null)
        : null;

    if (!banner && existing) {
      const previous = existing.attachments.first();
      if (previous) banner = await toReuploadable(previous, 'ipl').catch(() => null);
    }

    const roles = ruoliConfig.rolesChannelId;

    const card = buildCard({
      accentColor: COLORS.gold,
      bannerRef: banner?.ref,
      title: iplConfig.title,
      body: fill(iplConfig.intro, roles),
      sections: iplConfig.sections.map((section) => ({
        name: section.name,
        value: fill(section.value, roles),
      })),
      separateSections: true,
      footnote:
        `${iplConfig.leagues}\n\n${iplConfig.automatic}\n\n${iplConfig.closing}\n\n-# ${iplConfig.footer}`,
    });

    const payload = { ...card, files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Pannello IPL aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content:
        `✅ Pannello "come partecipare alle IPL" pubblicato in ${channel}.\n` +
        '-# Rilanciando il comando viene aggiornato, non duplicato.',
    });
  },
};
