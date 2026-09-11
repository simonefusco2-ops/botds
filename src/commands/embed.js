const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const {
  COLOR_CHOICES,
  MODAL_CREATE,
  setPending,
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
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;

    setPending(interaction.user.id, {
      mode: 'create',
      channelId: channel.id,
      image: interaction.options.getAttachment('immagine'),
      thumbnail: interaction.options.getAttachment('thumbnail'),
      colorKey: interaction.options.getString('colore') || 'valorant',
    });

    await interaction.showModal(buildEmbedModal(MODAL_CREATE));
  },
};
