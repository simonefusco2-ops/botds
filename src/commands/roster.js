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
const rosterConfig = require('../../config/roster.config');
const { COLORS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');
const settingsRepository = require('../database/repositories/settingsRepository');

const DIVISION_CHOICES = Object.entries(rosterConfig.divisions).map(([value, division]) => ({
  name: division.label,
  value,
}));

/** Compone la voce di un membro: i campi non valorizzati vengono omessi. */
function formatMember(member, index) {
  const number = index === null ? '' : `\`${String(index + 1).padStart(2, '0')}\`  `;

  const lines = [`${number}**${member.nickname}**${member.realName ? `  ·  ${member.realName}` : ''}`];
  if (member.bio) lines.push(member.bio);

  const links = (member.links || []).filter((link) => link.url);
  if (links.length) {
    lines.push(links.map((link) => `${link.emoji} [${link.label}](${link.url})`).join('  ·  '));
  }

  return lines.join('\n');
}

function buildSections(division) {
  const sections = division.players.map((player, index) => ({
    name: `${player.emoji}  ${player.role}`,
    value: formatMember(player, index),
  }));

  for (const member of division.staff || []) {
    sections.push({ name: `${member.emoji}  ${member.role}`, value: formatMember(member, null) });
  }

  return sections;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Pubblica o aggiorna la scheda del roster')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName('divisione').setDescription('Roster da pubblicare').setRequired(true).addChoices(...DIVISION_CHOICES),
    )
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) => opt.setName('immagine').setDescription('Foto o banner del roster')),
  async execute(interaction) {
    const divisionKey = interaction.options.getString('divisione', true);
    const division = rosterConfig.divisions[divisionKey];
    const channel = interaction.options.getChannel('canale') || interaction.channel;

    await interaction.deferReply({ ephemeral: true });

    let banner = null;
    try {
      banner = await toReuploadable(interaction.options.getAttachment('immagine'), `roster-${divisionKey}`);
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const settingsKey = `roster_message_${divisionKey}`;
    const stored = settingsRepository.get(settingsKey);
    const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

    const existing =
      storedMessageId && storedChannelId === channel.id
        ? await channel.messages.fetch(storedMessageId).catch(() => null)
        : null;

    if (!banner && existing) {
      const previous = existing.attachments.first();
      if (previous) banner = await toReuploadable(previous, `roster-${divisionKey}`).catch(() => null);
    }

    const card = buildCard({
      accentColor: COLORS.gold,
      bannerRef: banner?.ref,
      title: division.title,
      body: division.slogan,
      sections: buildSections(division),
      separateSections: true,
      footnote: division.footer,
    });

    const payload = { ...card, files: banner ? [banner.file] : [] };

    if (existing) {
      await existing.edit(payload);
      return interaction.editReply({ content: `✅ Roster **${division.label}** aggiornato in ${channel}.` });
    }

    const sent = await channel.send(payload);
    settingsRepository.set(settingsKey, `${channel.id}:${sent.id}`);

    return interaction.editReply({
      content: `✅ Roster **${division.label}** pubblicato in ${channel}. Rilanciando il comando verrà aggiornato, non duplicato.`,
    });
  },
};
