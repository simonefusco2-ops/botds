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
