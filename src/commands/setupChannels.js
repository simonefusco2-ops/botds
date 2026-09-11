const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const channelsConfig = require('../../config/channels.config');
const logger = require('../utils/logger');
const settingsRepository = require('../database/repositories/settingsRepository');

/** Chiave di settings usata per ricordare il messaggio già pubblicato su un canale, ed editarlo invece di duplicarlo. */
function settingsKey(channelId) {
  return `setup_message_${channelId}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-channels')
    .setDescription('Popola/aggiorna i canali del server con i messaggi informativi preimpostati')
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

        // Se questo canale ha già un messaggio di setup pubblicato in precedenza, lo editiamo
        // invece di inviarne uno nuovo, per evitare di duplicare i messaggi a ogni esecuzione.
        const existingMessageId = settingsRepository.get(settingsKey(entry.channelId));
        let edited = false;

        if (existingMessageId) {
          const existingMessage = await channel.messages.fetch(existingMessageId).catch(() => null);
          if (existingMessage) {
            await existingMessage.edit({ embeds: [embed] });
            edited = true;
          }
        }

        if (!edited) {
          const sent = await channel.send({ embeds: [embed] });
          settingsRepository.set(settingsKey(entry.channelId), sent.id);
        }

        success++;
      } catch (err) {
        logger.error(`Errore invio/aggiornamento embed su canale ${entry.channelId}`, err);
        errors.push(entry.channelId);
      }
    }

    await interaction.editReply({
      content: `✅ Aggiornati ${success} embed di setup.${errors.length ? `\n⚠️ Errori sui canali: ${errors.join(', ')}` : ''}`,
    });
  },
};
