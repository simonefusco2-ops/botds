/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modConfig = require('../../config/moderazione.config');
const moderation = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Assegna un warn a mano: al terzo si apre il ticket con lo staff')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('Chi riceve il warn').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('motivo').setDescription('Il motivo, mandato anche in DM').setRequired(true).setMaxLength(300),
    ),
  async execute(interaction, client) {
    const user = interaction.options.getUser('utente', true);
    if (user.bot) return interaction.reply({ content: '⚠️ Ai bot non si danno warn.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    const { count } = await moderation.addWarn(client, interaction.guild, user, {
      reason: interaction.options.getString('motivo', true),
      channelId: interaction.channelId,
      staffId: interaction.user.id,
    });

    const { threshold } = modConfig.warns;
    return interaction.editReply({
      content:
        `⚠️ Warn assegnato a ${user}: ora è a **${count}/${threshold}**.` +
        (count >= threshold ? '\n-# Limite raggiunto: timeout e ticket aperti.' : ''),
    });
  },
};
