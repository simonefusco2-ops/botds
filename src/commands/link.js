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
const userRepository = require('../database/repositories/userRepository');
const { getPlayerByNickname } = require('../modules/faceit/faceitApi');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Collega il tuo account Discord al tuo profilo Faceit')
    .addStringOption((opt) => opt.setName('faceit_name').setDescription('Il tuo nickname Faceit').setRequired(true)),
  async execute(interaction) {
    const nickname = interaction.options.getString('faceit_name', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const player = await getPlayerByNickname(nickname);
      if (!player) {
        return interaction.editReply({ content: `❌ Nessun giocatore Faceit trovato con nickname \`${nickname}\`.` });
      }

      userRepository.link(interaction.user.id, player.player_id, player.nickname);
      await interaction.editReply({ content: `✅ Account collegato: **${player.nickname}** ↔ ${interaction.user}` });
    } catch (err) {
      await interaction.editReply({ content: `⚠️ Errore durante il collegamento: ${err.message}` });
    }
  },
};
