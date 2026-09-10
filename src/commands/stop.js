const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Interrompe la riproduzione e svuota la coda'),
  async execute(interaction, client) {
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '📭 Nessuna riproduzione attiva.', ephemeral: true });
    }

    queue.delete();
    await interaction.reply({ content: '⏹️ Riproduzione interrotta e coda svuotata.' });
  },
};
