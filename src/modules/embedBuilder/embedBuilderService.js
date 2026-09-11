/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { toReuploadable } = require('../../utils/attachments');
const { buildCard } = require('../../utils/cards');
const settingsRepository = require('../../database/repositories/settingsRepository');

const PALETTE = {
  valorant: 0xff4655,
  blu: 0x5865f2,
  verde: 0x2ecc71,
  oro: 0xf1c40f,
  viola: 0x9b59b6,
  nero: 0x2b2d31,
  faceit: 0xff5500,
};

const COLOR_CHOICES = [
  { name: 'Rosso Valorant', value: 'valorant' },
  { name: 'Blu Discord', value: 'blu' },
  { name: 'Verde', value: 'verde' },
  { name: 'Oro', value: 'oro' },
  { name: 'Viola', value: 'viola' },
  { name: 'Nero', value: 'nero' },
  { name: 'Arancione Faceit', value: 'faceit' },
];

const MODAL_CREATE = 'embed_modal_create';
const MODAL_EDIT = 'embed_modal_edit';
const PENDING_TTL_MS = 10 * 60 * 1000;

const pending = new Map();

function setPending(userId, data) {
  const previous = pending.get(userId);
  if (previous?.timer) clearTimeout(previous.timer);

  const timer = setTimeout(() => pending.delete(userId), PENDING_TTL_MS);
  timer.unref?.();
  pending.set(userId, { ...data, timer });
}

function takePending(userId) {
  const data = pending.get(userId);
  if (!data) return null;
  if (data.timer) clearTimeout(data.timer);
  pending.delete(userId);
  return data;
}

/** "Titolo | Testo | inline" una per riga -> array di field per l'embed. */
function parseFields(raw) {
  if (!raw) return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 25)
    .map((line) => {
      const [name, value, flag] = line.split('|').map((part) => part?.trim());
      if (!name || !value) return null;
      return {
        name: name.slice(0, 256),
        value: value.replace(/\\n/g, '\n').slice(0, 1024),
        inline: /^(inline|affianco|si|sì)$/i.test(flag || ''),
      };
    })
    .filter(Boolean);
}

/** Formato inverso di parseFields, per precompilare il modal in modifica. */
function stringifyFields(fields = []) {
  return fields
    .map((field) => `${field.name} | ${field.value.replace(/\n/g, '\\n')}${field.inline ? ' | inline' : ''}`)
    .join('\n');
}

function buildCustomCard({ title, description, fieldsRaw, footer, colorKey, guild, imageRef, thumbnailRef }) {
  return buildCard({
    accentColor: PALETTE[colorKey] ?? PALETTE.valorant,
    bannerRef: imageRef,
    thumbnailRef,
    title: title?.slice(0, 256),
    body: description?.replace(/\\n/g, '\n'),
    sections: parseFields(fieldsRaw),
    footnote: footer || guild.name,
  });
}

/** Il contenuto sorgente viene salvato per messaggio, così /embed-modifica può ripresentarlo nel popup. */
function saveCardSource(messageId, data) {
  settingsRepository.set(`card_${messageId}`, JSON.stringify(data));
}

function loadCardSource(messageId) {
  const raw = settingsRepository.get(`card_${messageId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildEmbedModal(customId, prefill = {}) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(customId === MODAL_EDIT ? 'Modifica messaggio' : 'Nuovo messaggio');

  const title = new TextInputBuilder()
    .setCustomId('titolo')
    .setLabel('Titolo')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(256)
    .setRequired(false)
    .setPlaceholder('📜 Regolamento del Team');

  const description = new TextInputBuilder()
    .setCustomId('testo')
    .setLabel('Testo (vai a capo liberamente)')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(false)
    .setPlaceholder('Supporta **grassetto**, *corsivo*, > citazioni, emoji e [link](https://...)');

  const fields = new TextInputBuilder()
    .setCustomId('campi')
    .setLabel('Sezioni — una per riga: Titolo | Testo')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(false)
    .setPlaceholder('1. Rispetto | Rispetta compagni e avversari\n2. Puntualità | In voice 10 min prima | inline');

  const footer = new TextInputBuilder()
    .setCustomId('footer')
    .setLabel('Footer (opzionale)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2048)
    .setRequired(false)
    .setPlaceholder('Staff del Team');

  if (prefill.title) title.setValue(prefill.title);
  if (prefill.description) description.setValue(prefill.description);
  if (prefill.fields) fields.setValue(prefill.fields);
  if (prefill.footer) footer.setValue(prefill.footer);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(fields),
    new ActionRowBuilder().addComponents(footer),
  );

  return modal;
}

async function handleEmbedModalSubmit(interaction) {
  const data = takePending(interaction.user.id);
  if (!data) {
    return interaction.reply({
      content: '⚠️ Sessione scaduta (oltre 10 minuti). Rilancia il comando e riprova.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = await interaction.guild.channels.fetch(data.channelId).catch(() => null);
  if (!channel) {
    return interaction.editReply({ content: '❌ Canale di destinazione non trovato.' });
  }

  const title = interaction.fields.getTextInputValue('titolo')?.trim();
  const description = interaction.fields.getTextInputValue('testo')?.trim();
  const fieldsRaw = interaction.fields.getTextInputValue('campi')?.trim();
  const footer = interaction.fields.getTextInputValue('footer')?.trim();

  if (!title && !description && !fieldsRaw && !data.image) {
    return interaction.editReply({ content: '⚠️ Serve almeno un titolo, un testo, una sezione o un\'immagine.' });
  }

  let message = null;
  if (data.mode === 'edit') {
    message = await channel.messages.fetch(data.messageId).catch(() => null);
    if (!message) {
      return interaction.editReply({ content: '❌ Messaggio da modificare non trovato.' });
    }
  }

  let image = null;
  let thumbnail = null;
  try {
    image = await toReuploadable(data.image, 'banner');
    thumbnail = await toReuploadable(data.thumbnail, 'thumb');

    // In modifica senza nuova immagine: riscarichiamo e riallegiamo quelle già presenti,
    // perché il riferimento attachment:// vale solo per i file allegati a questo invio.
    if (data.mode === 'edit') {
      for (const attachment of message.attachments.values()) {
        const base = attachment.name?.startsWith('thumb') ? 'thumb' : 'banner';
        if (base === 'banner' && !image) image = await toReuploadable(attachment, 'banner');
        if (base === 'thumb' && !thumbnail) thumbnail = await toReuploadable(attachment, 'thumb');
      }
    }
  } catch (err) {
    return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
  }

  const files = [image?.file, thumbnail?.file].filter(Boolean);

  const card = buildCustomCard({
    title,
    description,
    fieldsRaw,
    footer,
    colorKey: data.colorKey,
    guild: interaction.guild,
    imageRef: image?.ref || null,
    thumbnailRef: thumbnail?.ref || null,
  });

  const source = { title, description, fieldsRaw, footer, colorKey: data.colorKey };

  if (message) {
    await message.edit({ ...card, files });
    saveCardSource(message.id, source);
    return interaction.editReply({ content: `✅ Messaggio aggiornato in ${channel}.` });
  }

  const sent = await channel.send({ ...card, files });
  saveCardSource(sent.id, source);

  return interaction.editReply({
    content:
      `✅ Messaggio pubblicato in ${channel}.\n` +
      `ID messaggio: \`${sent.id}\` — usalo con \`/embed-modifica\` per cambiarlo in futuro.`,
  });
}

module.exports = {
  COLOR_CHOICES,
  MODAL_CREATE,
  MODAL_EDIT,
  setPending,
  buildEmbedModal,
  handleEmbedModalSubmit,
  loadCardSource,
};
