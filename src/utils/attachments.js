/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { AttachmentBuilder } = require('discord.js');

/**
 * Gli URL degli allegati caricati tramite slash command sono firmati e scadono:
 * scarichiamo il file e lo ricarichiamo insieme al messaggio, così l'immagine
 * resta visibile per sempre nell'embed che la referenzia.
 */
async function toReuploadable(attachment, baseName) {
  if (!attachment) return null;

  const response = await fetch(attachment.url);
  if (!response.ok) throw new Error(`download immagine fallito (HTTP ${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = (attachment.name?.split('.').pop() || 'png').toLowerCase();
  const fileName = `${baseName}.${extension}`;

  return {
    file: new AttachmentBuilder(buffer, { name: fileName }),
    ref: `attachment://${fileName}`,
  };
}

module.exports = { toReuploadable };
