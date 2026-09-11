/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
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
