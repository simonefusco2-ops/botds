/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */

/**
 * Maiuscoletto Unicode (ᴄᴏᴅᴇ ᴀᴘᴇʀᴛᴇ).
 *
 * Utile per i nomi dei canali: Discord converte in minuscolo le lettere ASCII,
 * mentre questi caratteri restano come sono. Non esiste un maiuscoletto per la
 * X, che resta quindi invariata.
 */
const MAP = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
  j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ',
  s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
};

/** Converte solo le lettere latine: emoji, cifre e separatori restano intatti. */
function toSmallCaps(text) {
  if (!text) return text;

  return [...String(text)]
    .map((char) => MAP[char.toLowerCase()] ?? char)
    .join('');
}

module.exports = { toSmallCaps };
