/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ChannelType } = require('discord.js');
const rankConfig = require('../../../config/rank.config');
const logger = require('../../utils/logger');

/**
 * Mostra nel nome della stanza vocale i rank di chi c'è dentro.
 *
 * Entra qualcuno → la sua emoji si aggiunge, esce → sparisce. Il rank si legge
 * dai ruoli Discord, quindi vale per chiunque abbia fatto la verifica.
 *
 * DUE LIMITI DI DISCORD, da tenere a mente leggendo questo file:
 *
 *  1. nei nomi dei canali le emoji del server non esistono — si usano le
 *     `nameEmoji` unicode, non i loghini caricati;
 *  2. un canale si rinomina **due volte ogni dieci minuti**. Rinominare a ogni
 *     entrata e uscita è impossibile: le richieste finirebbero in coda e il
 *     nome resterebbe indietro di minuti. Per questo si aspetta che il viavai
 *     si fermi e si scrive una volta sola, saltando del tutto le scritture che
 *     non cambierebbero niente.
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

/** Le emoji di chi è nella stanza, dal rank più alto al più basso. */
function emojisIn(channel) {
  const order = new Map(rankConfig.ranks.map((rank, index) => [rank.name, index]));

  return [...channel.members.values()]
    .map((member) => rankOf(member))
    .filter(Boolean)
    .sort((a, b) => order.get(b.name) - order.get(a.name))
    .slice(0, settings().maxEmojis)
    .map((rank) => rank.nameEmoji)
    .filter(Boolean);
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

  clearTimeout(pending.get(channel.id));

  const timer = setTimeout(() => {
    pending.delete(channel.id);
    apply(channel).catch((err) => logger.warn(`Vocali: rinomina di ${channel.id} fallita: ${err.message}`));
  }, settings().debounceMs);

  timer.unref?.();
  pending.set(channel.id, timer);
}

async function apply(channel) {
  // La stanza può essere sparita nel frattempo: le vocali di partita si cancellano.
  const fresh = await channel.client.channels.fetch(channel.id).catch(() => null);
  if (!fresh || !watches(fresh)) return;

  const wanted = wantedName(fresh);
  if (wanted === fresh.name) return;

  // Il nome va letto prima: dopo setName l'oggetto porta già quello nuovo.
  const before = fresh.name;
  await fresh.setName(wanted);
  logger.info(`Vocali: "${before}" → "${wanted}".`);
}

/** Chiamata a ogni movimento nei vocali, su entrambi i canali coinvolti. */
function handleVoiceUpdate(oldState, newState) {
  if (!settings().enabled) return;

  for (const channel of [oldState.channel, newState.channel]) {
    if (channel) schedule(channel);
  }
}

module.exports = { handleVoiceUpdate, wantedName, baseName, emojisIn, rankOf, watches, schedule };
