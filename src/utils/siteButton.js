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

/** La riga con il bottone che apre il sito: un link, quindi nessuna interazione da gestire. */
function buildSiteRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(sito.url).setLabel(sito.label).setEmoji(sito.emoji),
  );
}

module.exports = { buildSiteRow };
