/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const benvenuto = require('../../../config/benvenuto.config');
const logger = require('../../utils/logger');

const CUSTOM_ID_PREFIX = 'role_toggle';

const STYLES = {
  primary: ButtonStyle.Primary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  secondary: ButtonStyle.Secondary,
};

function buildRoleRow() {
  return new ActionRowBuilder().addComponents(
    benvenuto.roles.map((role) => {
      const button = new ButtonBuilder()
        .setCustomId(`${CUSTOM_ID_PREFIX}:${role.id}`)
        .setLabel(role.label)
        .setStyle(STYLES[role.style] || ButtonStyle.Secondary);

      if (role.emoji) button.setEmoji(role.emoji);
      return button;
    }),
  );
}

/** Assegna o rimuove il ruolo corrispondente al bottone premuto. */
async function handleRoleButton(interaction, roleId) {
  // L'identificativo arriva dal componente: accettiamo solo i ruoli elencati in
  // configurazione, così nessun altro ruolo del server è assegnabile da qui.
  const configured = benvenuto.roles.find((role) => role.id === roleId);
  if (!configured) {
    return interaction.reply({ content: '⚠️ Questo ruolo non è più disponibile.', ephemeral: true });
  }

  const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
  if (!role) {
    return interaction.reply({
      content: `⚠️ Il ruolo **${configured.label}** non esiste più sul server.`,
      ephemeral: true,
    });
  }

  const alreadyHas = interaction.member.roles.cache.has(roleId);

  try {
    if (alreadyHas) {
      await interaction.member.roles.remove(role);
      return interaction.reply({ content: `➖ Ruolo **${configured.label}** rimosso.`, ephemeral: true });
    }

    await interaction.member.roles.add(role);
    return interaction.reply({ content: `➕ Ruolo **${configured.label}** assegnato.`, ephemeral: true });
  } catch (err) {
    logger.error(`Errore assegnazione ruolo ${configured.label} a ${interaction.user.tag}`, err);
    return interaction.reply({
      content:
        `❌ Non riesco a modificare il ruolo **${configured.label}**. ` +
        'Verifica che il ruolo del bot sia più in alto di quel ruolo nella lista del server.',
      ephemeral: true,
    });
  }
}

module.exports = { CUSTOM_ID_PREFIX, buildRoleRow, handleRoleButton };
