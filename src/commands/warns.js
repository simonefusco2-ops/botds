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
const modConfig = require('../../config/moderazione.config');
const warnRepository = require('../database/repositories/warnRepository');
const { COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Mostra i warn di un utente: quelli attivi e lo storico')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('Di chi').setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('utente', true);
    const { expireDays, threshold } = modConfig.warns;

    const active = warnRepository.active(interaction.guildId, user.id, expireDays);
    const activeIds = new Set(active.map((w) => w.id));
    const history = warnRepository.history(interaction.guildId, user.id, 10);

    const line = (w) => {
      const state = w.revoked ? '~~revocato~~' : activeIds.has(w.id) ? '🔴 attivo' : '⚪ scaduto';
      const who = w.automatic ? 'automatico' : `<@${w.staff_id}>`;
      return `\`#${w.id}\` <t:${w.created_at}:d> · ${state} · ${who}\n> ${w.reason.slice(0, 180)}`;
    };

    const embed = new EmbedBuilder()
      .setColor(active.length >= threshold ? COLORS.danger : COLORS.gold)
      .setTitle(`⚠️  WARN DI ${user.username.toUpperCase()}`)
      .setDescription(
        `**${active.length}/${threshold}** attivi negli ultimi ${expireDays} giorni.\n\n` +
          (history.length ? history.map(line).join('\n') : '-# Nessun warn.'),
      )
      .setFooter({ text: 'Usa il numero con /unwarn per revocarne uno.' });

    return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
  },
};
