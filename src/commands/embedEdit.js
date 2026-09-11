const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const {
  COLOR_CHOICES,
  MODAL_EDIT,
  setPending,
  buildEmbedModal,
  stringifyFields,
} = require('../modules/embedBuilder/embedBuilderService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-modifica')
    .setDescription('Modifica un messaggio embed già pubblicato dal bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName('messaggio_id').setDescription('ID del messaggio da modificare').setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale in cui si trova il messaggio (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) =>
      opt.setName('immagine').setDescription('Nuova immagine banner (sostituisce quella attuale)'),
    )
    .addAttachmentOption((opt) => opt.setName('thumbnail').setDescription('Nuova icona piccola'))
    .addStringOption((opt) =>
      opt.setName('colore').setDescription('Nuovo colore della barra laterale').addChoices(...COLOR_CHOICES),
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    const messageId = interaction.options.getString('messaggio_id', true);

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      return interaction.reply({
        content: `❌ Nessun messaggio con ID \`${messageId}\` trovato in ${channel}.`,
        ephemeral: true,
      });
    }

    if (message.author.id !== interaction.client.user.id) {
      return interaction.reply({
        content: '❌ Posso modificare solo i messaggi inviati da me.',
        ephemeral: true,
      });
    }

    const existing = message.embeds[0];

    setPending(interaction.user.id, {
      mode: 'edit',
      channelId: channel.id,
      messageId,
      image: interaction.options.getAttachment('immagine'),
      thumbnail: interaction.options.getAttachment('thumbnail'),
      colorKey: interaction.options.getString('colore') || 'valorant',
      existingImageUrl: existing?.image?.url || null,
      existingThumbnailUrl: existing?.thumbnail?.url || null,
    });

    await interaction.showModal(
      buildEmbedModal(MODAL_EDIT, {
        title: existing?.title || '',
        description: existing?.description || '',
        fields: stringifyFields(existing?.fields || []),
        footer: existing?.footer?.text || '',
      }),
    );
  },
};
