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
const socialConfig = require('../../config/social.config');
const socialRepository = require('../database/repositories/socialRepository');
const rssWatcher = require('../modules/social/rssWatcher');
const settingsRepository = require('../database/repositories/settingsRepository');
const { COLORS, SOCIAL_PLATFORMS } = require('../utils/embeds');
const { buildCard } = require('../utils/cards');
const { toReuploadable } = require('../utils/attachments');

const PANEL_SETTINGS_KEY = 'social_panel_message';

const PLATFORM_CHOICES = Object.entries(SOCIAL_PLATFORMS).map(([value, preset]) => ({
  name: preset.label,
  value,
}));

function buildLinkRow() {
  return new ActionRowBuilder().addComponents(
    socialConfig.accounts.slice(0, 5).map((account) => {
      const button = new ButtonBuilder()
        .setLabel(account.label)
        .setStyle(ButtonStyle.Link)
        .setURL(account.url);

      if (account.emoji) button.setEmoji(account.emoji);
      return button;
    }),
  );
}

async function publishPanel(interaction) {
  const channel = interaction.options.getChannel('canale') || interaction.channel;
  await interaction.deferReply({ ephemeral: true });

  let banner = null;
  try {
    banner = await toReuploadable(interaction.options.getAttachment('immagine'), 'social');
  } catch (err) {
    return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
  }

  const stored = settingsRepository.get(PANEL_SETTINGS_KEY);
  const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

  const existing =
    storedMessageId && storedChannelId === channel.id
      ? await channel.messages.fetch(storedMessageId).catch(() => null)
      : null;

  if (!banner && existing) {
    const previous = existing.attachments.first();
    if (previous) banner = await toReuploadable(previous, 'social').catch(() => null);
  }

  const card = buildCard({
    accentColor: COLORS.gold,
    bannerRef: banner?.ref,
    title: socialConfig.title,
    body: socialConfig.intro,
    sections: socialConfig.accounts.map((account) => ({
      name: `${account.emoji}  ${account.label}`,
      value: `${account.description}\n> ➜ [${account.handle}](${account.url})`,
    })),
    separateSections: true,
    footnote: socialConfig.footer,
    rows: [buildLinkRow()],
  });

  const payload = { ...card, files: banner ? [banner.file] : [] };

  if (existing) {
    await existing.edit(payload);
    return interaction.editReply({ content: `✅ Pannello social aggiornato in ${channel}.` });
  }

  const sent = await channel.send(payload);
  settingsRepository.set(PANEL_SETTINGS_KEY, `${channel.id}:${sent.id}`);

  return interaction.editReply({
    content: `✅ Pannello social pubblicato in ${channel}. Rilanciando il comando verrà aggiornato, non duplicato.`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('Pannello dei social e notifiche automatiche dei nuovi post')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('pannello')
        .setDescription('Pubblica la vetrina con tutti i social e i bottoni-link')
        .addChannelOption((opt) =>
          opt
            .setName('canale')
            .setDescription('Canale di destinazione (default: questo canale)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addAttachmentOption((opt) => opt.setName('immagine').setDescription('Banner della vetrina')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('aggiungi')
        .setDescription('Aggiunge un feed RSS da annunciare a ogni nuovo post')
        .addStringOption((opt) =>
          opt.setName('piattaforma').setDescription('Social di provenienza').setRequired(true).addChoices(...PLATFORM_CHOICES),
        )
        .addStringOption((opt) => opt.setName('url').setDescription('URL del feed RSS').setRequired(true))
        .addStringOption((opt) => opt.setName('nome').setDescription('Etichetta mostrata nelle notifiche')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rimuovi')
        .setDescription('Rimuove un feed dalle notifiche')
        .addStringOption((opt) =>
          opt.setName('riferimento').setDescription('URL del feed, oppure la piattaforma').setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('lista').setDescription('Mostra i feed monitorati'))
    .addSubcommand((sub) => sub.setName('controlla').setDescription('Forza subito un controllo dei feed')),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'pannello') return publishPanel(interaction);

    if (subcommand === 'lista') {
      const feeds = socialRepository.list();
      if (!feeds.length) {
        return interaction.reply({
          content: '📭 Nessun feed monitorato. Aggiungine uno con `/social aggiungi`.',
          ephemeral: true,
        });
      }

      const list = feeds
        .map((feed) => {
          const preset = SOCIAL_PLATFORMS[feed.platform] || SOCIAL_PLATFORMS.altro;
          const state = feed.last_item_id ? 'in ascolto' : 'in attesa del primo controllo';
          return `${preset.emoji} **${feed.label || preset.label}** — ${state}\n-# ${feed.feed_url}`;
        })
        .join('\n');

      return interaction.reply({ content: `📡 Feed monitorati:\n${list}`, ephemeral: true });
    }

    if (!rssWatcher.isConfigured()) {
      return interaction.reply({
        content: '⚠️ Manca `SOCIAL_ANNOUNCE_CHANNEL_ID` nel file `.env`: senza canale annunci le notifiche non partono.',
        ephemeral: true,
      });
    }

    if (subcommand === 'controlla') {
      await interaction.deferReply({ ephemeral: true });
      await rssWatcher.poll(client);
      return interaction.editReply({ content: '✅ Controllo eseguito: eventuali nuovi post sono stati pubblicati.' });
    }

    if (subcommand === 'rimuovi') {
      const reference = interaction.options.getString('riferimento', true).trim();
      const removed = socialRepository.remove(reference) ? 1 : socialRepository.removeByLabel(reference);

      return interaction.reply({
        content: removed ? `✅ Rimossi ${removed} feed.` : `⚠️ Nessun feed corrisponde a \`${reference}\`.`,
        ephemeral: true,
      });
    }

    // aggiungi
    const platform = interaction.options.getString('piattaforma', true);
    const url = interaction.options.getString('url', true).trim();
    const label = interaction.options.getString('nome');

    if (!/^https?:\/\//i.test(url)) {
      return interaction.reply({ content: '❌ L\'URL del feed deve iniziare con http:// o https://', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    socialRepository.add(url, platform, label, interaction.user.id);

    // Il primo controllo allinea il feed senza annunciare i post già pubblicati.
    await rssWatcher.poll(client);

    const saved = socialRepository.find(url);
    if (!saved?.last_item_id) {
      socialRepository.remove(url);
      return interaction.editReply({
        content:
          `❌ Il feed non è leggibile: \`${url}\`\n` +
          'Verifica che l\'indirizzo restituisca RSS/Atom valido aprendolo nel browser.',
      });
    }

    return interaction.editReply({
      content: `✅ Feed **${label || SOCIAL_PLATFORMS[platform].label}** aggiunto: i prossimi post verranno annunciati.`,
    });
  },
};
