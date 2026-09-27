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
const notificheConfig = require('../../../config/notifiche.config');
const logger = require('../../utils/logger');

const PREFIX = 'live_notify';

function buildButtons() {
  const { on, off } = notificheConfig.buttons;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}:on`).setLabel(on.label).setEmoji(on.emoji).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${PREFIX}:off`).setLabel(off.label).setEmoji(off.emoji).setStyle(ButtonStyle.Secondary),
  );
}

/** Dà o toglie il ruolo delle notifiche live a chi preme. */
async function handle(interaction, action) {
  const { roleId, replies } = notificheConfig;
  const has = interaction.member.roles.cache.has(roleId);

  if (action === 'on' && has) return interaction.reply({ content: replies.alreadyOn, ephemeral: true });
  if (action === 'off' && !has) return interaction.reply({ content: replies.alreadyOff, ephemeral: true });

  try {
    if (action === 'on') await interaction.member.roles.add(roleId, 'Pannello notifiche live');
    else await interaction.member.roles.remove(roleId, 'Pannello notifiche live');
  } catch (err) {
    // Quasi sempre è la gerarchia: il ruolo del bot sotto quello delle notifiche.
    logger.error(`Notifiche live: ruolo non ${action === 'on' ? 'assegnato' : 'tolto'} a ${interaction.user.id}`, err);
    return interaction.reply({
      content: '⚠️ Non riesco a cambiare il ruolo: avvisa lo staff (il ruolo del bot deve stare sopra).',
      ephemeral: true,
    });
  }

  return interaction.reply({ content: action === 'on' ? replies.on : replies.off, ephemeral: true });
}

module.exports = { PREFIX, buildButtons, handle };
