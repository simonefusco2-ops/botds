/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ChannelType, Routes } = require('discord.js');
const rankConfig = require('../../../config/rank.config');
const logger = require('../../utils/logger');

/**
 * Mostra nel nome della stanza vocale i rank di chi c'è dentro.
 *
 * Entra qualcuno → la sua emoji si aggiunge, esce → sparisce. Il rank si legge
 * dai ruoli Discord, quindi vale per chiunque abbia fatto la verifica.
 *
 * Si scrive nello **stato del canale vocale** (`PUT /channels/{id}/voice-status`),
 * la riga che Discord mostra sotto il nome: accetta le emoji del server — quindi
 * i loghini veri dei rank — e non ha il tetto delle rinomine, così la lista sta
 * dietro al viavai quasi in tempo reale.
 *
 * Il ripiego `mode: 'name'` rinomina il canale, ma lì valgono due limiti di
 * Discord: nei nomi le emoji del server non esistono (si usano le `nameEmoji`
 * unicode) e un canale si rinomina solo due volte ogni dieci minuti, quindi la
 * lista resta indietro. Per questo lo stato è la modalità predefinita.
 *
 * In entrambi i casi le scritture sono raggruppate: si aspetta che il viavai si
 * fermi e si scrive una volta sola, saltando quelle che non cambierebbero nulla.
 */

/** Rinomine in attesa, per canale: l'ultima vince. */
const pending = new Map();

function settings() {
  return rankConfig.voiceRanks || { enabled: false };
}

/** Vero se di questa stanza ci occupiamo. */
function watches(channel) {
  const { enabled, channelIds, categoryIds } = settings();

  if (!enabled || !channel || channel.type !== ChannelType.GuildVoice) return false;
  if (channelIds?.length) return channelIds.includes(channel.id);
  if (categoryIds?.length) return categoryIds.includes(channel.parentId);

  return true;
}

/** Il rank di un membro, letto dai ruoli che ha addosso. */
function rankOf(member) {
  return rankConfig.ranks.find((rank) => rank.roleId && member.roles.cache.has(rank.roleId)) || null;
}

/** I rank di chi è nella stanza, dal più alto al più basso. */
function ranksIn(channel) {
  const order = new Map(rankConfig.ranks.map((rank, index) => [rank.name, index]));

  return [...channel.members.values()]
    .map((member) => rankOf(member))
    .filter(Boolean)
    .sort((a, b) => order.get(b.name) - order.get(a.name))
    .slice(0, settings().maxEmojis);
}

/** Le emoji unicode, le uniche che funzionano nei nomi dei canali. */
function emojisIn(channel) {
  return ranksIn(channel)
    .map((rank) => rank.nameEmoji)
    .filter(Boolean);
}

/** Lo stato da scrivere sotto il nome: qui le emoji del server si vedono. */
function wantedStatus(channel) {
  return ranksIn(channel)
    .map((rank) => rank.emoji)
    .filter(Boolean)
    .join(' ');
}

/**
 * Il nome senza la coda delle emoji, per non impilarle a ogni passaggio.
 * Si toglie dal fondo tutto ciò che potremmo aver scritto noi: separatore,
 * spazi ed emoji dei rank.
 */
function baseName(name) {
  const known = new Set(rankConfig.ranks.map((rank) => rank.nameEmoji).filter(Boolean));
  const separator = settings().separator.trim();

  let base = name;
  let changed = true;

  while (changed) {
    changed = false;

    for (const emoji of known) {
      if (base.endsWith(emoji)) {
        base = base.slice(0, -emoji.length);
        changed = true;
      }
    }

    const trimmed = base.replace(/\s+$/u, '');
    if (trimmed !== base) {
      base = trimmed;
      changed = true;
    }

    if (separator && base.endsWith(separator)) {
      base = base.slice(0, -separator.length);
      changed = true;
    }
  }

  return base || name;
}

/** Come dovrebbe chiamarsi la stanza adesso. */
function wantedName(channel) {
  const base = baseName(channel.name);
  const emojis = emojisIn(channel);
  if (!emojis.length) return base;

  const full = `${base}${settings().separator}${emojis.join('')}`;
  return full.length <= 100 ? full : full.slice(0, 100);
}

/**
 * Programma la rinomina. Ogni movimento rimanda l'esecuzione: finché la gente
 * entra ed esce non si scrive niente, e quando si calma si scrive una volta.
 */
function schedule(channel) {
  if (!watches(channel)) return;

  const { mode, debounceMs, renameDebounceMs } = settings();
  const wait = mode === 'name' ? renameDebounceMs : debounceMs;

  clearTimeout(pending.get(channel.id));

  const timer = setTimeout(() => {
    pending.delete(channel.id);
    apply(channel).catch((err) => logger.warn(`Vocali: aggiornamento di ${channel.id} fallito: ${err.message}`));
  }, wait);

  timer.unref?.();
  pending.set(channel.id, timer);
}

/** L'ultimo stato scritto per canale: evita di riscrivere lo stesso. */
const lastStatus = new Map();

async function apply(channel) {
  // La stanza può essere sparita nel frattempo: le vocali di partita si cancellano.
  const fresh = await channel.client.channels.fetch(channel.id).catch(() => null);
  if (!fresh || !watches(fresh)) {
    lastStatus.delete(channel.id);
    return;
  }

  if (settings().mode === 'name') return applyName(fresh);
  return applyStatus(fresh);
}

/**
 * Scrive lo stato del canale. discord.js non ha ancora un metodo dedicato, ma
 * la rotta esiste: la chiamiamo direttamente.
 */
async function applyStatus(channel) {
  const wanted = wantedStatus(channel);
  if (lastStatus.get(channel.id) === wanted) return;

  try {
    await channel.client.rest.put(Routes.channelVoiceStatus(channel.id), { body: { status: wanted } });
    lastStatus.set(channel.id, wanted);
    logger.info(`Vocali: stato di "${channel.name}" → "${wanted || '(vuoto)'}".`);
  } catch (err) {
    // 403 qui significa quasi sempre che manca "Imposta stato canale vocale".
    const hint = err.status === 403 ? ' — al bot manca il permesso "Imposta stato canale vocale".' : '';
    logger.warn(`Vocali: stato di "${channel.name}" non aggiornato: ${err.message}${hint}`);
  }
}

async function applyName(channel) {
  const wanted = wantedName(channel);
  if (wanted === channel.name) return;

  // Il nome va letto prima: dopo setName l'oggetto porta già quello nuovo.
  const before = channel.name;
  await channel.setName(wanted);
  logger.info(`Vocali: "${before}" → "${wanted}".`);
}

/** Chiamata a ogni movimento nei vocali, su entrambi i canali coinvolti. */
function handleVoiceUpdate(oldState, newState) {
  if (!settings().enabled) return;

  for (const channel of [oldState.channel, newState.channel]) {
    if (channel) schedule(channel);
  }
}

module.exports = {
  handleVoiceUpdate,
  wantedStatus,
  wantedName,
  baseName,
  ranksIn,
  emojisIn,
  rankOf,
  watches,
  schedule,
};
