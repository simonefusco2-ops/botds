/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ticketTypes = require('../../config/tickets.config');
const ticketManager = require('../modules/tickets/ticketManager');
const { COLORS } = require('../utils/embeds');
const logger = require('../utils/logger');

const TYPE_ID = 'convocazione';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('convoca')
    .setDescription('Apre un ticket con una persona dentro, come se l\'avesse aperto lei')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('Chi convocare').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('motivo').setDescription('Perché lo convocate: compare nel ticket').setRequired(true).setMaxLength(1000),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('utente', true);
    const reason = interaction.options.getString('motivo', true);
    if (user.bot) return interaction.reply({ content: '⚠️ Un bot non si convoca.', ephemeral: true });

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: `⚠️ ${user} non è nel server.`, ephemeral: true });

    // Aprire il canale può superare i 3 secondi concessi da Discord.
    await interaction.deferReply({ ephemeral: true });

    const type = ticketTypes.find((entry) => entry.id === TYPE_ID) || {};
    const { channel, reused } = await ticketManager.openTicketChannel(interaction.guild, user, interaction.client.user.id, TYPE_ID);

    // Il tag nel contenuto: su un ticket già aperto è l'unica notifica che riceve.
    await channel.send({
      content: `${user}`,
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle(type.summonTitle || '📣  CONVOCAZIONE')
          .setDescription(reason)
          .addFields({ name: 'Convocato da', value: `${interaction.user}` })
          .setTimestamp(),
      ],
      allowedMentions: { users: [user.id] },
    });

    const dm = await user
      .send({ content: (type.summonDm || 'Sei stato convocato dallo staff: {canale}').replaceAll('{canale}', `${channel}`) })
      .then(() => true)
      .catch(() => false);

    logger.info(`Convocazione: ${user.id} convocato da ${interaction.user.id} in ${channel.id}.`);

    return interaction.editReply({
      content:
        `✅ ${user} convocato in ${channel}${reused ? ' (aveva già una convocazione aperta: riusata)' : ''}.` +
        (dm ? '' : '\n-# DM non recapitato: ha i messaggi privati chiusi, ma il tag nel ticket gli arriva.'),
    });
  },
};
