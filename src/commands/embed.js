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
const {
  COLOR_CHOICES,
  MODAL_CREATE,
  setPending,
  buildMention,
  buildEmbedModal,
} = require('../modules/embedBuilder/embedBuilderService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crea un messaggio grafico con immagine e testo, senza toccare il codice')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) =>
      opt.setName('immagine').setDescription('Immagine grande (banner) mostrata sotto il testo'),
    )
    .addAttachmentOption((opt) =>
      opt.setName('thumbnail').setDescription('Icona piccola in alto a destra (es. logo del team)'),
    )
    .addStringOption((opt) =>
      opt.setName('colore').setDescription('Colore della barra laterale').addChoices(...COLOR_CHOICES),
    )
    .addStringOption((opt) =>
      opt
        .setName('tagga')
        .setDescription('Tagga tutto il server sopra il messaggio')
        .addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }),
    )
    .addMentionableOption((opt) =>
      opt.setName('menziona').setDescription('Un ruolo o un utente da taggare sopra il messaggio'),
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    const mentionable = interaction.options.get('menziona');

    setPending(interaction.user.id, {
      mode: 'create',
      channelId: channel.id,
      image: interaction.options.getAttachment('immagine'),
      thumbnail: interaction.options.getAttachment('thumbnail'),
      colorKey: interaction.options.getString('colore') || 'valorant',
      mention: buildMention({
        everyone: interaction.options.getString('tagga'),
        role: mentionable?.role?.id,
        user: mentionable?.user?.id,
      }),
    });

    await interaction.showModal(buildEmbedModal(MODAL_CREATE));
  },
};
