/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const modConfig = require('../../../config/moderazione.config');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');
const warnRepository = require('../../database/repositories/warnRepository');
const ticketRepository = require('../../database/repositories/ticketRepository');
const prefilter = require('./prefilter');
const gemini = require('./gemini');

const PREFIX = 'mod_';
const TICKET_TYPE = 'warn';

const short = (text, max = 1000) => (text.length > max ? `${text.slice(0, max - 1)}…` : text) || '-# (vuoto)';

// --- quali messaggi si guardano -------------------------------------------------

function isWatched(message) {
  if (!modConfig.enabled || !message.guild || message.author?.bot || message.system) return false;
  if (!message.content?.trim()) return false;

  const channel = message.channel;
  if (channel.type === ChannelType.DM) return false;
  if (modConfig.excludedChannelIds.includes(channel.id)) return false;
  if (channel.parentId && modConfig.excludedCategoryIds.includes(channel.parentId)) return false;

  // I ticket sono conversazioni con lo staff: lì si discute anche di quello che è stato detto.
  if (ticketRepository.findByChannel(channel.id)) return false;

  const roles = message.member?.roles?.cache;
  if (roles && modConfig.excludedRoleIds.some((id) => roles.has(id))) return false;
  return true;
}

/** Gli ultimi messaggi del canale prima di questo, dal più vecchio, per dare il contesto. */
async function contextOf(message) {
  const before = await message.channel.messages
    .fetch({ limit: modConfig.contextSize, before: message.id })
    .catch(() => null);
  if (!before) return [];

  return [...before.values()]
    .filter((m) => m.content?.trim())
    .reverse()
    .map((m) => ({ author: m.member?.displayName || m.author.username, text: m.content.slice(0, 500) }));
}

// --- log per lo staff ----------------------------------------------------------

async function logChannel(client) {
  if (!modConfig.logChannelId) return null;
  return client.channels.fetch(modConfig.logChannelId).catch(() => null);
}

async function sendLog(client, payload) {
  const channel = await logChannel(client);
  if (!channel) {
    logger.info(`Moderazione: ${payload.embeds?.[0]?.data?.title || 'evento'} (nessun canale di log configurato).`);
    return null;
  }
  return channel.send(payload).catch((err) => {
    logger.warn(`Moderazione: log non pubblicato: ${err.message}`);
    return null;
  });
}

function isStaff(member) {
  return modConfig.warns.staffRoleIds.some((id) => member?.roles?.cache?.has(id));
}

// --- il giro su ogni messaggio --------------------------------------------------

/**
 * Chiamata a ogni messaggio. Il filtro locale è sincrono e gratuito: solo se
 * scatta si va a Gemini e poi si agisce.
 */
async function handleMessage(client, message) {
  if (!isWatched(message)) return null;

  const hits = prefilter.scan(message.content);
  if (!hits.length) return null;

  const context = await contextOf(message);
  const author = message.member?.displayName || message.author.username;
  const verdict = await gemini.classify({ author, text: message.content.slice(0, 1500) }, context, hits);

  if (verdict.verdetto === 'ok') {
    logger.info(`Moderazione: messaggio di ${message.author.id} segnalato (${hits.join(', ')}) ma giudicato ok.`);
    return verdict;
  }

  if (verdict.verdetto === 'dubbio') {
    await sendReview(client, message, verdict, hits);
    return verdict;
  }

  // Elimina: prima il messaggio, poi il warn, così resta visibile il meno possibile.
  const content = message.content;
  await message.delete().catch((err) => logger.warn(`Moderazione: messaggio non cancellato: ${err.message}`));
  await addWarn(client, message.guild, message.author, {
    reason: verdict.motivo,
    category: verdict.categoria,
    content,
    channelId: message.channel.id,
    automatic: true,
  });
  return verdict;
}

/** Un dubbio: il messaggio resta dov'è, lo staff decide con due bottoni. */
async function sendReview(client, message, verdict, hits) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🤔  MESSAGGIO DA VALUTARE')
    .setDescription(short(message.content))
    .addFields(
      { name: 'Autore', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
      { name: 'Canale', value: `${message.channel} · [vai al messaggio](${message.url})`, inline: true },
      { name: 'Categoria', value: verdict.categoria, inline: true },
      { name: 'Motivo', value: short(verdict.motivo || '-', 1024) },
      { name: 'Segnalato per', value: short(hits.join(', '), 1024) },
    )
    .setFooter({ text: 'Il messaggio NON è stato cancellato.' })
    .setTimestamp();

  const ids = `${message.channel.id}:${message.id}:${message.author.id}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}review:warn:${ids}`).setLabel('Elimina e dai warn').setEmoji('⚠️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`${PREFIX}review:ok:${ids}`).setLabel('Va bene').setEmoji('✅').setStyle(ButtonStyle.Success),
  );

  return sendLog(client, { embeds: [embed], components: [row] });
}

// --- warn -----------------------------------------------------------------------

/**
 * Assegna un warn, avvisa la persona e lo staff; al raggiungimento della soglia
 * timeout e ticket. Usata dal filtro automatico, dai bottoni dei log e da /warn.
 */
async function addWarn(client, guild, user, { reason, category = null, content = null, channelId = null, automatic = false, staffId = null }) {
  const { expireDays, threshold } = modConfig.warns;

  warnRepository.add({
    guild_id: guild.id,
    discord_id: user.id,
    reason,
    category,
    content,
    channel_id: channelId,
    automatic: automatic ? 1 : 0,
    staff_id: staffId,
  });

  const active = warnRepository.active(guild.id, user.id, expireDays);
  const count = active.length;

  await user
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.danger)
          .setTitle(`⚠️  WARN ${count}/${threshold} · ${guild.name}`)
          .setDescription(
            `**Motivo:** ${reason}\n` +
              (content ? `**Messaggio:** ${short(content, 500)}\n` : '') +
              `\n-# I warn contano per ${expireDays} giorni. Al ${threshold}° si apre un ticket con lo staff.`,
          ),
      ],
    })
    .catch(() => {});

  await sendLog(client, {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle(`⚠️  WARN ${count}/${threshold}${automatic ? ' · automatico' : ''}`)
        .addFields(
          { name: 'Utente', value: `${user} (\`${user.id}\`)`, inline: true },
          { name: 'Da', value: staffId ? `<@${staffId}>` : 'moderazione automatica', inline: true },
          ...(channelId ? [{ name: 'Canale', value: `<#${channelId}>`, inline: true }] : []),
          { name: 'Motivo', value: short(reason, 1024) },
          ...(content ? [{ name: 'Messaggio cancellato', value: short(content, 1024) }] : []),
        )
        .setTimestamp(),
    ],
    allowedMentions: { parse: [] },
  });

  if (count >= threshold) await escalate(client, guild, user, active);
  return { count, active };
}

/** Terzo warn: timeout e ticket con la persona e lo staff, con l'elenco dei warn. */
async function escalate(client, guild, user, active) {
  const { timeoutHours, expireDays } = modConfig.warns;
  const member = await guild.members.fetch(user.id).catch(() => null);

  const timedOut = await member
    ?.timeout(timeoutHours * 3600 * 1000, `Moderazione: ${active.length} warn, in attesa dello staff`)
    .then(() => true)
    .catch((err) => {
      logger.warn(`Moderazione: timeout non applicato a ${user.id}: ${err.message}`);
      return false;
    });

  // Il ticket lo apre il sistema dei ticket, con lo staff del tipo "warn".
  const { openTicketChannel } = require('../tickets/ticketManager');
  const { channel } = await openTicketChannel(guild, user, client.user.id, TICKET_TYPE).catch((err) => {
    logger.error(`Moderazione: ticket per ${user.id} non aperto`, err);
    return {};
  });
  if (!channel) return;

  const list = active
    .map((w, i) => {
      const when = `<t:${w.created_at}:d>`;
      const who = w.automatic ? 'automatico' : `da <@${w.staff_id}>`;
      return `**${i + 1}.** ${when} · ${who}${w.channel_id ? ` · <#${w.channel_id}>` : ''}\n> ${w.reason}` +
        (w.content ? `\n> -# «${short(w.content, 200)}»` : '');
    })
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(`🚨  ${active.length} WARN NEGLI ULTIMI ${expireDays} GIORNI`)
    .setDescription(
      `${user}, hai raggiunto il limite di warn. ` +
        (timedOut ? `Sei in **timeout per ${timeoutHours} ore** mentre lo staff decide.` : 'Lo staff ora decide cosa fare.') +
        `\n\n${short(list, 3500)}`,
    )
    .setFooter({ text: 'Spiega pure la tua versione qui: lo staff la leggerà prima di decidere.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}decide:archive:${user.id}`).setLabel('Archivia (togli timeout)').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${PREFIX}decide:clear:${user.id}`).setLabel('Azzera i warn').setEmoji('🧹').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${PREFIX}decide:week:${user.id}`).setLabel('Timeout 7 giorni').setEmoji('⏳').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${PREFIX}decide:ban:${user.id}`).setLabel('Ban').setEmoji('🔨').setStyle(ButtonStyle.Danger),
  );

  await channel.send({ embeds: [embed], components: [row], allowedMentions: { users: [user.id] } }).catch((err) => {
    logger.warn(`Moderazione: riepilogo warn non pubblicato nel ticket: ${err.message}`);
  });
}

// --- bottoni ----------------------------------------------------------------------

async function handleButton(client, interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '⛔ Solo lo staff può decidere.', ephemeral: true });
  }

  // mod_review:warn:… / mod_decide:ban:… — il tipo sta dopo il prefisso.
  const [head, action, ...rest] = interaction.customId.split(':');
  const kind = head.slice(PREFIX.length);

  if (kind === 'review') return handleReview(client, interaction, action, rest);
  if (kind === 'decide') return handleDecision(interaction, action, rest[0]);
  return undefined;
}

/** Un dubbio deciso dallo staff: lascia stare, oppure cancella e dai warn. */
// Dubbi già decisi: segnati PRIMA del primo await, così due membri dello staff
// che premono insieme non assegnano due warn per lo stesso messaggio.
const decided = new Set();

async function handleReview(client, interaction, action, [channelId, messageId, userId]) {
  if (decided.has(messageId)) {
    return interaction.reply({ content: '⚠️ Questo messaggio è già stato valutato.', ephemeral: true });
  }
  decided.add(messageId);

  // Conferma subito: cancellare e assegnare il warn può superare i 3 secondi.
  await interaction.deferUpdate();

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const done = (text) =>
    interaction.editReply({ embeds: [embed.setFooter({ text }).setColor(action === 'ok' ? COLORS.success : COLORS.danger)], components: [] });

  if (action === 'ok') return done(`Lasciato com'era da ${interaction.user.username}.`);

  const channel = await client.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);
  const content = message?.content || embed.data.description || null;
  await message?.delete().catch(() => {});

  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return done('Utente non trovato: nessun warn assegnato.');

  const reason = embed.data.fields?.find((f) => f.name === 'Motivo')?.value || 'Messaggio contro il regolamento';
  const category = embed.data.fields?.find((f) => f.name === 'Categoria')?.value || null;

  // Prima si chiude il dubbio, così due membri dello staff non danno due warn.
  await done(`Cancellato e warn assegnato da ${interaction.user.username}.`);
  await addWarn(client, interaction.guild, user, { reason, category, content, channelId, staffId: interaction.user.id });
  return undefined;
}

/** La decisione dello staff nel ticket del terzo warn. */
async function handleDecision(interaction, action, userId) {
  // Conferma subito: timeout e ban sono chiamate a Discord che possono tardare.
  await interaction.deferUpdate();

  const guild = interaction.guild;
  const member = await guild.members.fetch(userId).catch(() => null);
  const by = interaction.user;
  let outcome;

  try {
    if (action === 'archive') {
      await member?.timeout(null, `Decisione di ${by.username}: archiviato`);
      outcome = `✅ **Archiviato** da ${by}: timeout tolto, i warn restano nello storico.`;
    } else if (action === 'clear') {
      const n = warnRepository.revokeAll(guild.id, userId);
      await member?.timeout(null, `Decisione di ${by.username}: warn azzerati`);
      outcome = `🧹 **Warn azzerati** da ${by} (${n}) e timeout tolto.`;
    } else if (action === 'week') {
      await member?.timeout(7 * 24 * 3600 * 1000, `Decisione di ${by.username}: timeout 7 giorni`);
      outcome = `⏳ **Timeout di 7 giorni** deciso da ${by}.`;
    } else if (action === 'ban') {
      await guild.members.ban(userId, { reason: `Decisione di ${by.username} dopo i warn` });
      outcome = `🔨 **Ban** deciso da ${by}.`;
    } else {
      return interaction.followUp({ content: '⚠️ Azione sconosciuta.', ephemeral: true });
    }
  } catch (err) {
    return interaction.followUp({ content: `⚠️ Non riesco: ${err.message}\n-# Controlla i permessi del bot.`, ephemeral: true });
  }

  await interaction.editReply({ components: [] });
  await interaction.channel.send({ content: outcome, allowedMentions: { parse: [] } }).catch(() => {});
  logger.info(`Moderazione: decisione "${action}" su ${userId} da ${by.id}.`);
  return undefined;
}

module.exports = { PREFIX, handleMessage, addWarn, handleButton, isWatched };
