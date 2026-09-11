const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const ticketTypes = require('../../config/tickets.config');
const { buildTicketPanelEmbed } = require('../utils/embeds');
const { toReuploadable } = require('../utils/attachments');

const STYLES = {
  primary: ButtonStyle.Primary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  secondary: ButtonStyle.Secondary,
};

/** Massimo 5 bottoni per riga: i tipi oltre il quinto finiscono nella riga successiva. */
function buildTypeRows() {
  const rows = [];

  for (let i = 0; i < ticketTypes.length; i += 5) {
    const row = new ActionRowBuilder().addComponents(
      ticketTypes.slice(i, i + 5).map((type) =>
        new ButtonBuilder()
          .setCustomId(`ticket_open:${type.id}`)
          .setLabel(type.label)
          .setEmoji(type.emoji)
          .setStyle(STYLES[type.style] || ButtonStyle.Secondary),
      ),
    );
    rows.push(row);
  }

  return rows;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Pubblica il pannello di apertura ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale dove pubblicare il pannello (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addAttachmentOption((opt) =>
      opt.setName('immagine').setDescription('Banner da mostrare nel pannello'),
    )
    .addStringOption((opt) => opt.setName('titolo').setDescription('Titolo personalizzato del pannello'))
    .addStringOption((opt) =>
      opt.setName('testo').setDescription('Testo personalizzato (usa \\n per andare a capo)'),
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    let image = null;
    try {
      image = await toReuploadable(interaction.options.getAttachment('immagine'), 'ticket-panel');
    } catch (err) {
      return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
    }

    const embed = buildTicketPanelEmbed({
      types: ticketTypes,
      title: interaction.options.getString('titolo'),
      description: interaction.options.getString('testo')?.replace(/\\n/g, '\n'),
      imageRef: image?.ref,
      guild: interaction.guild,
    });

    await channel.send({
      embeds: [embed],
      components: buildTypeRows(),
      files: image ? [image.file] : [],
    });

    await interaction.editReply({ content: `✅ Pannello pubblicato in ${channel}.` });
  },
};
