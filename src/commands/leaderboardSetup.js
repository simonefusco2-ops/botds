const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const leaderboardManager = require('../modules/leaderboard/leaderboardManager');
const settingsRepository = require('../database/repositories/settingsRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard-setup')
    .setDescription('Inizializza la classifica persistente IHL nel canale corrente')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    settingsRepository.set('leaderboard_channel_id', interaction.channel.id);
    settingsRepository.set('leaderboard_message_id', '');
    await leaderboardManager.updateLeaderboardMessage(client);

    await interaction.editReply({ content: '✅ Classifica inizializzata in questo canale.' });
  },
};
