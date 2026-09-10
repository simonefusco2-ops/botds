const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Salta il brano corrente'),
  async execute(interaction, client) {
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '📭 Nessuna traccia in riproduzione.', ephemeral: true });
    }

    const skipped = queue.node.skip();
    await interaction.reply({ content: skipped ? '⏭️ Brano saltato.' : '⚠️ Impossibile saltare il brano.' });
  },
};
