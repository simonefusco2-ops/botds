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
const sito = require('../../config/sito.config');
const iplConfig = require('../../config/ipl.config');
const { applyEmoji } = require('./emoji');

/** La riga con il bottone che apre il sito: un link, quindi nessuna interazione da gestire. */
function buildSiteRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(sito.url).setLabel(sito.label).setEmoji(sito.emoji),
  );
}

/** Sito e richiesta PRO sulla stessa riga: il bottone PRO apre il ticket come il pannello dei ticket. */
function buildAccessRow() {
  const row = buildSiteRow();
  const { label, emoji, ticketTypeId } = iplConfig.proButton || {};
  if (!ticketTypeId) return row;

  return row.addComponents(
    applyEmoji(new ButtonBuilder().setCustomId(`ticket_open:${ticketTypeId}`).setLabel(label).setStyle(ButtonStyle.Success), emoji),
  );
}

module.exports = { buildSiteRow, buildAccessRow };
