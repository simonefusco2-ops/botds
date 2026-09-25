/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */

/** Emoji personalizzata del server, nel formato <:nome:id> o <a:nome:id>. */
const CUSTOM_EMOJI = /^<a?:[A-Za-z0-9_]{2,32}:\d+>$/;

/**
 * Discord accetta sui bottoni solo emoji vere o emoji del server: un carattere
 * che sembra un'emoji ma non lo è (per esempio 𝕏, che è un simbolo matematico)
 * fa fallire l'intero messaggio. Qui il valore viene validato e, se non è
 * utilizzabile, si restituisce null: il bottone perde l'icona ma continua a
 * funzionare, invece di rompere il comando.
 */
function toButtonEmoji(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (CUSTOM_EMOJI.test(trimmed)) return trimmed;

  return /\p{Extended_Pictographic}/u.test(trimmed) ? trimmed : null;
}

/** Applica l'emoji al bottone solo se valida. */
function applyEmoji(button, value) {
  const emoji = toButtonEmoji(value);
  if (emoji) button.setEmoji(emoji);
  return button;
}

module.exports = { toButtonEmoji, applyEmoji };
