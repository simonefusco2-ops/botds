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
const warnRepository = require('../database/repositories/warnRepository');
const { syncWarnRoles } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Revoca un warn: quello indicato o, senza numero, il più recente')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('Di chi').setRequired(true))
    .addIntegerOption((opt) => opt.setName('numero').setDescription('Il numero del warn (lo vedi con /warns)').setMinValue(1)),
  async execute(interaction) {
    const user = interaction.options.getUser('utente', true);
    const id = interaction.options.getInteger('numero');
    const { expireDays, threshold } = modConfig.warns;

    let warn;
    if (id) {
      warn = warnRepository.find(id);
      if (!warn || warn.discord_id !== user.id || warn.guild_id !== interaction.guildId) {
        return interaction.reply({ content: `⚠️ ${user} non ha un warn \`#${id}\`.`, ephemeral: true });
      }
    } else {
      warn = warnRepository.active(interaction.guildId, user.id, expireDays).at(-1);
      if (!warn) return interaction.reply({ content: `⚠️ ${user} non ha warn attivi.`, ephemeral: true });
    }

    if (!warnRepository.revoke(warn.id)) {
      return interaction.reply({ content: `⚠️ Il warn \`#${warn.id}\` era già revocato.`, ephemeral: true });
    }

    const left = warnRepository.active(interaction.guildId, user.id, expireDays).length;
    await syncWarnRoles(interaction.guild, user.id);
    return interaction.reply({
      content: `✅ Warn \`#${warn.id}\` di ${user} revocato. Ora è a **${left}/${threshold}**.`,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
};
