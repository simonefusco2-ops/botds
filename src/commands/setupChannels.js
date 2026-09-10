const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const channelsConfig = require('../../config/channels.config');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-channels')
    .setDescription('Popola i canali del server con i messaggi informativi preimpostati')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let success = 0;
    const errors = [];

    for (const entry of channelsConfig) {
      if (!entry.channelId) continue;
      try {
        const channel = await interaction.guild.channels.fetch(entry.channelId);
        const embed = new EmbedBuilder()
          .setColor(entry.color || 0x5865f2)
          .setTitle(entry.title)
          .setDescription(entry.description)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() ?? undefined });

        if (entry.fields?.length) embed.addFields(entry.fields);
        if (entry.image) embed.setImage(entry.image);
        if (entry.thumbnail) embed.setThumbnail(entry.thumbnail);

        await channel.send({ embeds: [embed] });
        success++;
      } catch (err) {
        logger.error(`Errore invio embed su canale ${entry.channelId}`, err);
        errors.push(entry.channelId);
      }
    }

    await interaction.editReply({
      content: `✅ Inviati ${success} embed di setup.${errors.length ? `\n⚠️ Errori sui canali: ${errors.join(', ')}` : ''}`,
    });
  },
};
