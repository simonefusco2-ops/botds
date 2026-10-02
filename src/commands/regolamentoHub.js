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
const { buildAccessRow } = require('../utils/siteButton');
const hub = require('../../config/hub.config');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const settingsRepository = require('../database/repositories/settingsRepository');

const SETTINGS_KEY = 'regolamento_hub_message';

/** Il regolamento non ha bottoni: rimanda al canale dove si fa la richiesta. */
function fill(text) {
  return text.replaceAll('{canale}', `<#${hub.rolesChannelId}>`);
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
      // Leghe, sanzioni e istruzioni per l'accesso chiudono la scheda.
      footnote: fill(`${hub.leagues}\n\n${hub.warning}\n\n${hub.request}\n\n-# ${hub.footer}`),
      rows: [buildAccessRow()],
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
        `✅ Regolamento HUB pubblicato in ${channel}.\n` +
        '-# Rilanciando il comando viene aggiornato, non duplicato. Senza `immagine` il banner già caricato resta.',
    });
  },
};
