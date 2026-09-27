/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { EmbedBuilder } = require('discord.js');
const sanzioniConfig = require('../../../config/sanzioni.config');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');
const sanctionRepository = require('../../database/repositories/sanctionRepository');
const ihlRepository = require('../../database/repositories/ihlRepository');
const lobbyRepository = require('../../database/repositories/lobbyRepository');
const leagues = require('./leagues');

const UNITS = { m: 60, h: 3600, g: 86400, d: 86400 };

/**
 * "30m", "12h", "3g", anche combinati ("1g12h"). Restituisce i secondi, o null
 * se il testo non è una durata valida o supera il massimo.
 */
function parseDuration(text) {
  const clean = String(text || '').toLowerCase().replace(/\s+/g, '');
  if (!/^(\d+[mhgd])+$/.test(clean)) return null;

  const seconds = [...clean.matchAll(/(\d+)([mhgd])/g)].reduce((sum, [, n, unit]) => sum + Number(n) * UNITS[unit], 0);
  if (!seconds || seconds > sanzioniConfig.maxDays * 86400) return null;
  return seconds;
}

/** 90000 → "1 g 1 h": leggibile nell'annuncio. */
function formatDuration(seconds) {
  const parts = [];
  for (const [label, size] of [['g', 86400], ['h', 3600], ['min', 60]]) {
    const n = Math.floor(seconds / size);
    if (n) parts.push(`${n} ${label}`);
    seconds -= n * size;
  }
  return parts.join(' ') || '0 min';
}

/** Stanza dei richiami, e in ogni caso un DM all'interessato. */
async function announce(client, userId, embed) {
  const channel = sanzioniConfig.richiamiChannelId
    ? await client.channels.fetch(sanzioniConfig.richiamiChannelId).catch(() => null)
    : null;

  if (channel) {
    await channel
      .send({ content: `<@${userId}>`, embeds: [embed], allowedMentions: { users: [userId] } })
      .catch((err) => logger.warn(`Richiami: annuncio non pubblicato: ${err.message}`));
  } else if (sanzioniConfig.richiamiChannelId) {
    logger.warn(`Richiami: canale ${sanzioniConfig.richiamiChannelId} non raggiungibile.`);
  }

  const user = await client.users.fetch(userId).catch(() => null);
  await user?.send({ embeds: [embed] }).catch(() => {});
}

// --- sospensioni ---------------------------------------------------------------

/**
 * Sospende dalle code. Chi è in una coda in raccolta ne viene tolto subito;
 * una partita già avviata invece prosegue (la gestisce lo staff).
 */
async function suspend(client, { userId, seconds, reason, staffId }) {
  const until = Math.floor(Date.now() / 1000) + seconds;
  sanctionRepository.add({ kind: 'sospensione', discord_id: userId, until, reason, staff_id: staffId });

  // Richiesto qui e non in cima: lobbyManager usa questo modulo per il controllo in coda.
  const removed = await require('./lobbyManager').removeFromQueues(client, userId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('⛔  SOSPENSIONE DALLE CODE')
    .addFields(
      { name: 'Giocatore', value: `<@${userId}>`, inline: true },
      { name: 'Durata', value: formatDuration(seconds), inline: true },
      { name: 'Fino a', value: `<t:${until}:f> (<t:${until}:R>)`, inline: true },
      { name: 'Motivazione', value: reason.slice(0, 1024) },
    )
    .setFooter({ text: 'Sanzione applicata dallo staff IVPITER' })
    .setTimestamp();

  await announce(client, userId, embed);
  return { until, removedFrom: removed.map((lobby) => lobby.id) };
}

function activeSuspension(userId) {
  return sanctionRepository.activeSuspension(userId);
}

async function revoke(client, { userId, staffId }) {
  const count = sanctionRepository.revokeSuspensions(userId);
  if (!count) return 0;

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('✅  SOSPENSIONE REVOCATA')
    .setDescription(`<@${userId}> può di nuovo entrare in coda.`)
    .setFooter({ text: 'Revoca dello staff IVPITER' })
    .setTimestamp();

  await announce(client, userId, embed);
  logger.info(`Richiami: sospensione di ${userId} revocata da ${staffId}.`);
  return count;
}

// --- troll ---------------------------------------------------------------------

/**
 * Rimborso per troll su una partita già chiusa con il risultato: chi ha perso
 * torna all'ELO di prima, i vincitori tengono solo il bonus, chi ha trollato
 * perde la penalità.
 */
async function trollRefund(client, { lobbyId, trollId, reason, staffId }) {
  const lobby = lobbyRepository.find(lobbyId);
  if (!lobby) return { error: `Nessuna partita con codice \`${lobbyId}\`.` };
  if (!lobby.players.includes(trollId)) return { error: `<@${trollId}> non ha giocato la partita #${lobbyId}.` };
  if (sanctionRepository.trollOfLobby(lobbyId)) return { error: `La partita #${lobbyId} è già stata rimborsata per troll.` };

  if (lobby.state !== 'closed' || !ihlRepository.matchesOfLobby(lobbyId).length) {
    return {
      error:
        `La partita #${lobbyId} non ha un risultato con ELO assegnato. Se è ancora in corso chiudila prima ` +
        'con `/ihl risultato`; se è stata annullata non c\'è ELO da rimborsare.',
    };
  }

  const { penalty, winnerBonus } = sanzioniConfig.troll;
  const rows = ihlRepository.trollRefund(lobbyId, trollId, penalty, winnerBonus);
  if (!rows.length) return { error: `La partita #${lobbyId} non ha ELO da rimborsare.` };

  sanctionRepository.add({ kind: 'troll', discord_id: trollId, league: lobby.league, lobby_id: lobbyId, reason, staff_id: staffId });

  const line = (row) => {
    const total = row.refund + row.extra;
    const sign = total >= 0 ? '+' : '';
    return `<@${row.discord_id}> ${sign}${total}`;
  };
  const troll = rows.find((row) => row.discord_id === trollId);
  const winners = rows.filter((row) => row.won && row.discord_id !== trollId);
  const losers = rows.filter((row) => !row.won && row.discord_id !== trollId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(`🤡  TROLL · PARTITA #${lobbyId} · ${leagues.find(lobby.league).name}`)
    .setDescription(
      `**Giocatore:** <@${trollId}>\n**Motivazione:** ${reason}\n\n` +
        `La partita è stata annullata. Chi ha perso riprende l'ELO perso, chi ha vinto ` +
        `tiene solo **+${winnerBonus}**, chi ha trollato perde **${penalty}** punti.`,
    )
    .addFields(
      { name: '🤡 Troll', value: line(troll) },
      { name: '🏆 Vincitori', value: winners.map(line).join('\n') || '-# nessuno', inline: true },
      { name: '💸 Rimborsati', value: losers.map(line).join('\n') || '-# nessuno', inline: true },
    )
    .setFooter({ text: 'Variazione rispetto all\'ELO che avevano dopo la partita' })
    .setTimestamp();

  await announce(client, trollId, embed);
  await require('./leaderboard').refresh(client, lobby.league).catch(() => {});

  return { rows, embed };
}

// --- obbligo di registrazione -------------------------------------------------

/** L'avviso sulle clip nel canale della partita, taggando i dieci. */
async function postClipNotice(channel, lobby) {
  const clip = sanzioniConfig.clip;
  if (!clip?.enabled || !channel) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(clip.title)
    .setDescription(clip.text.replaceAll('{partita}', lobby.id))
    .setFooter({ text: clip.footer.replaceAll('{partita}', lobby.id) });

  await channel
    .send({
      content: lobby.players.map((id) => `<@${id}>`).join(' '),
      embeds: [embed],
      allowedMentions: { users: lobby.players },
    })
    .catch((err) => logger.warn(`IHL lobby ${lobby.id}: avviso clip non pubblicato: ${err.message}`));
}

module.exports = {
  parseDuration,
  formatDuration,
  suspend,
  activeSuspension,
  revoke,
  trollRefund,
  postClipNotice,
};
