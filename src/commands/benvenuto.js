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
const benvenuto = require('../../config/benvenuto.config');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const { buildRoleRow } = require('../modules/welcome/roleButtons');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'benvenuto_message';

/** I riferimenti <#id> vengono resi da Discord come link blu cliccabili al canale. */
function buildSections() {
  const channelLinks = [benvenuto.rulesChannelId, benvenuto.socialChannelId];

  return benvenuto.steps.map((step, index) => ({
    name: `${step.emoji}  ${step.name}`,
    value: `${step.text}\n> ➜ <#${channelLinks[index]}>`,
  }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('benvenuto')
    .setDescription('Pubblica o aggiorna il messaggio di benvenuto con i ruoli selezionabili')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) => opt.setName('immagine').setDescription('Banner mostrato in cima al messaggio')),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    let banner = null;
    try {
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'benvenuto');
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
      if (previous) banner = await toReuploadable(previous, 'benvenuto').catch(() => null);
    }

    const card = buildCard({
      accentColor: COLORS.gold,
      bannerRef: banner?.ref,
      title: benvenuto.title,
      body: benvenuto.intro,
      sections: [
        ...buildSections(),
        { name: benvenuto.rolesTitle, value: `-# ${benvenuto.rolesHint}` },
      ],
      separateSections: true,
      footnote: benvenuto.footer,
      rows: [buildRoleRow()],
    });

    const payload = { ...card, files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Messaggio di benvenuto aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(SETTINGS_KEY, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content: `✅ Messaggio di benvenuto pubblicato in ${channel}. Rilanciando il comando verrà aggiornato, non duplicato.`,
    });
  },
};
