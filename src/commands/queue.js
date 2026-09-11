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
  data: new SlashCommandBuilder().setName('queue').setDescription('Mostra la coda musicale corrente'),
  async execute(interaction, client) {
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '📭 Nessuna traccia in riproduzione.', ephemeral: true });
    }

    const tracks = queue.tracks.toArray().slice(0, 10);
    const list = tracks.map((t, i) => `${i + 1}. ${t.title} — ${t.author}`).join('\n') || 'Coda vuota.';

    await interaction.reply({
      content: `▶️ **In riproduzione:** ${queue.currentTrack.title}\n\n**Prossimi brani:**\n${list}`,
    });
  },
};
