/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const rankConfig = require('../../../config/rank.config');
const ihlConfig = require('../../../config/ihl.config');
const hubConfig = require('../../../config/hub.config');
const logger = require('../../utils/logger');
const ticketRepository = require('../../database/repositories/ticketRepository');
const leagues = require('../ihl/leagues');
const trackerLink = require('./trackerLink');
const rankProvider = require('./rankProvider');
const rolePanel = require('./rolePanel');
const ticketManager = require('../tickets/ticketManager');
const { COLORS } = require('../../utils/embeds');

/**
 * Richiesta del ruolo rank dentro il ticket IPL.
 *
 * Il giocatore incolla il link tracker.gg, il bot ne ricava il Riot ID e chiede
 * il rank al servizio configurato, poi propone allo staff cosa assegnare. Il
 * ruolo lo dà solo un'approvazione umana: la lettura automatica è un aiuto, non
 * una prova d'identità — chiunque può incollare il tracker di un altro.
 */
const PREFIX = 'rank_';

/** Il rank proposto viaggia nell'identificatore, così l'approvazione è esplicita. */
function encode(action, ownerId, rankName) {
  return `${PREFIX}${action}:${ownerId}:${rankName}`;
}

function rankByName(name) {
  return rankConfig.ranks.find((rank) => rank.name === name) || null;
}

function buildCard({ owner, tracker, outcome, chosen }) {
  const rank = chosen || outcome.rank || null;
  const league = rank ? leagues.find(rankProvider.leagueOf(rank)) : null;

  const embed = new EmbedBuilder()
    .setColor(outcome.ok ? COLORS.gold : COLORS.danger)
    .setTitle('🎯  RICHIESTA RUOLO — VERIFICA RANK')
    .setDescription(
      `**Giocatore:** <@${owner}>\n` +
        `**Riot ID:** \`${tracker.riotId}\`\n` +
        `**Tracker:** ${tracker.url}`,
    )
    .setTimestamp();

  if (outcome.ok) {
    embed.addFields(
      {
        name: '📊 Rank rilevato',
        value: `${rank.emoji} **${outcome.label}**` + (outcome.rr != null ? `  ·  ${outcome.rr} RR` : ''),
        inline: true,
      },
      { name: '🏅 Picco', value: outcome.peak || '-# non disponibile', inline: true },
    );
  } else {
    embed.addFields({
      name: '⚠️ Lettura automatica non riuscita',
      value: `${outcome.reason}\n-# Controlla il tracker a mano e scegli il rank qui sotto.`,
    });
  }

  embed.addFields({
    name: '✅ Verrà assegnato',
    value: rank
      ? `${rank.emoji} **${rank.name}** · lega **${league.name}**` +
        (rankConfig.iplRoleId ? `\n-# Più il ruolo IPL per l'accesso alle HUB.` : '')
      : '-# nessun rank scelto: usa il menu qui sotto',
    inline: false,
  });

  embed.setFooter({
    text: 'La lettura è automatica, la decisione no: approva solo se il tracker è davvero suo.',
  });

  return embed;
}

function buildComponents(ownerId, rank) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(encode('pick', ownerId, 'x'))
    .setPlaceholder(rank ? `Cambia rank (ora: ${rank.name})` : 'Scegli il rank da assegnare')
    .addOptions(
      rankConfig.ranks.map((entry) => ({
        label: entry.name,
        value: entry.name,
        emoji: entry.emoji,
        description: `Lega ${leagues.find(entry.league).name}`,
        default: rank?.name === entry.name,
      })),
    );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(encode('ok', ownerId, rank?.name || ''))
      .setLabel('Approva e assegna')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!rank),
    new ButtonBuilder()
      .setCustomId(encode('no', ownerId, ''))
      .setLabel('Rifiuta')
      .setEmoji('⛔')
      .setStyle(ButtonStyle.Danger),
  );

  return [new ActionRowBuilder().addComponents(menu), buttons];
}

/** Solo lo staff decide: i ruoli abilitati sono gli stessi della In-House League. */
function canApprove(member) {
  return ihlConfig.managerRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

/**
 * Un messaggio dentro un ticket IPL: se contiene un link tracker.gg parte la
 * verifica, altrimenti non facciamo nulla (nel ticket si parla anche d'altro).
 */
async function handleMessage(client, message) {
  if (message.author.bot || !message.guild) return;

  const ticket = ticketRepository.findByChannel(message.channel.id);
  if (!ticket || ticket.type !== hubConfig.ticketTypeId) return;

  const tracker = trackerLink.parse(message.content);
  if (!tracker) return;

  const working = await message.channel.send('🔎 Sto controllando il tracker…').catch(() => null);

  const outcome = await rankProvider.fetchRank(tracker);
  const rank = outcome.ok ? outcome.rank : null;

  const payload = {
    content: ihlConfig.managerRoleIds.map((id) => `<@&${id}>`).join(' '),
    embeds: [buildCard({ owner: ticket.owner_id, tracker, outcome })],
    components: buildComponents(ticket.owner_id, rank),
    allowedMentions: { roles: ihlConfig.managerRoleIds },
  };

  if (working) await working.edit({ content: payload.content, ...payload }).catch(() => {});
  else await message.channel.send(payload).catch(() => {});

  logger.info(
    `Rank: richiesta di ${ticket.owner_id} (${tracker.riotId}) → ` +
      (outcome.ok ? `${outcome.label}` : `non letto (${outcome.reason})`),
  );
}

/** Cambio del rank proposto dal menu: aggiorna la scheda senza assegnare nulla. */
async function handlePick(interaction, ownerId) {
  if (!canApprove(interaction.member)) {
    return interaction.reply({ content: '⛔ Solo lo staff può decidere il rank.', ephemeral: true });
  }

  const rank = rankByName(interaction.values[0]);
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const league = leagues.find(rankProvider.leagueOf(rank));

  // Sostituiamo solo il riquadro dell'esito, il resto della scheda resta com'è.
  const fields = embed.data.fields.map((field) =>
    field.name.startsWith('✅')
      ? {
          ...field,
          value:
            `${rank.emoji} **${rank.name}** · lega **${league.name}**\n` +
            `-# Scelto a mano da ${interaction.user}.`,
        }
      : field,
  );

  embed.setFields(fields);

  return interaction.update({ embeds: [embed], components: buildComponents(ownerId, rank) });
}

/** Assegna i ruoli: il rank, l'accesso alle HUB e, se configurato, la lega. */
async function assignRoles(guild, member, rank) {
  const wanted = [rank.roleId, rankConfig.iplRoleId, rankConfig.leagueRoleIds?.[rank.league]].filter(Boolean);
  if (!wanted.length) return { assigned: [], missing: true };

  const assigned = [];
  const failed = [];

  for (const roleId of wanted) {
    const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
    if (!role) {
      failed.push(roleId);
      continue;
    }

    // Togliamo prima gli altri ruoli rank: un giocatore ne ha uno solo.
    await member.roles.add(role).then(() => assigned.push(role)).catch((err) => {
      logger.warn(`Rank: ruolo ${roleId} non assegnato a ${member.id}: ${err.message}`);
      failed.push(roleId);
    });
  }

  return { assigned, failed, missing: false };
}

/** Rimuove gli altri ruoli rank, così non se ne accumulano. */
async function clearOtherRanks(member, keepRoleId) {
  for (const entry of rankConfig.ranks) {
    if (!entry.roleId || entry.roleId === keepRoleId) continue;
    if (!member.roles.cache.has(entry.roleId)) continue;

    await member.roles.remove(entry.roleId).catch((err) => {
      logger.warn(`Rank: vecchio ruolo ${entry.roleId} non rimosso da ${member.id}: ${err.message}`);
    });
  }
}

async function handleApprove(interaction, ownerId, rankName) {
  if (!canApprove(interaction.member)) {
    return interaction.reply({ content: '⛔ Solo lo staff può approvare.', ephemeral: true });
  }

  const rank = rankByName(rankName);
  if (!rank) {
    return interaction.reply({ content: '⚠️ Scegli prima un rank dal menu.', ephemeral: true });
  }

  await interaction.deferReply();

  const member = await interaction.guild.members.fetch(ownerId).catch(() => null);
  if (!member) {
    return interaction.editReply({ content: `⚠️ <@${ownerId}> non è più nel server.` });
  }

  const result = await assignRoles(interaction.guild, member, rank);

  if (result.missing) {
    return interaction.editReply({
      content:
        `⚠️ Rank **${rank.name}** approvato, ma non ho nessun ruolo da assegnare: ` +
        'gli ID in `config/rank.config.js` sono ancora vuoti.',
    });
  }

  await clearOtherRanks(member, rank.roleId);

  const league = leagues.find(rankProvider.leagueOf(rank));
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(COLORS.success)
    .setTitle('✅  RICHIESTA APPROVATA');

  await interaction.message.edit({ embeds: [embed], components: [] }).catch(() => {});

  const failed = result.failed?.length
    ? `\n-# Non sono riuscito ad assegnare ${result.failed.length} ruolo/i: controlla che il ruolo del bot sia più in alto.`
    : '';

  return interaction.editReply({
    content:
      `✅ ${member} approvato da ${interaction.user}: ${rank.emoji} **${rank.name}**, lega **${league.name}**.` +
      `\nRuoli assegnati: ${result.assigned.map((role) => `<@&${role.id}>`).join(' ') || 'nessuno'}${failed}`,
  });
}

async function handleReject(interaction, ownerId) {
  if (!canApprove(interaction.member)) {
    return interaction.reply({ content: '⛔ Solo lo staff può rifiutare.', ephemeral: true });
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(COLORS.danger)
    .setTitle('⛔  RICHIESTA RIFIUTATA');

  await interaction.update({ embeds: [embed], components: [] });

  return interaction.followUp({
    content:
      `⛔ <@${ownerId}>, la richiesta è stata rifiutata da ${interaction.user}.\n` +
      'Manda il link corretto del **tuo** profilo tracker.gg, oppure spiega qui la situazione.',
  });
}

/**
 * Verifica avviata dal pannello: il giocatore ha incollato il suo link.
 *
 * Sotto la soglia il ruolo arriva subito, senza far perdere tempo a nessuno.
 * Da lì in su si apre una pratica con la stessa scheda di approvazione che lo
 * staff già conosce: il rank alto decide l'accesso alla Pro, quindi lo guarda
 * una persona.
 */
async function handleTrackerSubmit(client, interaction) {
  const raw = interaction.fields.getTextInputValue('tracker');
  const tracker = trackerLink.parse(raw);

  if (!tracker) {
    return interaction.reply({
      content:
        '⚠️ Quello non sembra un link a un profilo **tracker.gg**.\n' +
        `Deve assomigliare a: \`${rankConfig.tracker.example}\``,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const outcome = await rankProvider.fetchRank(tracker);

  // Rank non leggibile: non inventiamo niente, passa dallo staff.
  if (!outcome.ok) {
    return escalate(interaction, tracker, outcome, `Rank non letto: ${outcome.reason}`);
  }

  if (rankProvider.needsApproval(outcome.rank)) {
    return escalate(interaction, tracker, outcome, 'Rank alto: serve il via libera dello staff.');
  }

  const result = await assignRoles(interaction.guild, interaction.member, outcome.rank);

  if (result.missing) {
    return interaction.editReply({
      content:
        `✅ Rank rilevato: ${outcome.rank.emoji} **${outcome.label}**, ma non ho ruoli da assegnare: ` +
        'gli ID in `config/rank.config.js` sono ancora vuoti. Avvisa lo staff.',
    });
  }

  await clearOtherRanks(interaction.member, outcome.rank.roleId);

  const league = leagues.find(rankProvider.leagueOf(outcome.rank));
  const failed = result.failed?.length
    ? '\n-# Alcuni ruoli non sono stati assegnati: il ruolo del bot deve stare più in alto.'
    : '';

  logger.info(`Rank: ${interaction.user.id} verificato in automatico (${outcome.label}).`);

  return interaction.editReply({
    content:
      `✅ ${outcome.rank.emoji} **${outcome.label}** verificato: ruolo assegnato, sei nella **${league.name}**.` +
      `\n-# Quando sali di rank rifai la verifica dal pannello.${failed}`,
  });
}

/** Apre la pratica con lo staff e ci pubblica dentro la scheda di approvazione. */
async function escalate(interaction, tracker, outcome, why) {
  const { channel, reused } = await ticketManager.openTicketChannel(
    interaction.guild,
    interaction.user,
    interaction.client.user.id,
    hubConfig.ticketTypeId,
  );

  await channel
    .send({
      content: ihlConfig.managerRoleIds.map((id) => `<@&${id}>`).join(' '),
      embeds: [buildCard({ owner: interaction.user.id, tracker, outcome })],
      components: buildComponents(interaction.user.id, outcome.ok ? outcome.rank : null),
      allowedMentions: { roles: ihlConfig.managerRoleIds },
    })
    .catch((err) => logger.error('Rank: scheda di approvazione non pubblicata', err));

  return interaction.editReply({
    content:
      `📨 ${why}\n` +
      `${reused ? 'Ho aggiunto la verifica alla tua pratica già aperta' : 'Ho aperto una pratica per te'}: ${channel}`,
  });
}

/** Instradamento dei componenti `rank_*`. */
async function handle(client, interaction) {
  const [action, ownerId, rankName] = interaction.customId.slice(PREFIX.length).split(':');

  if (action === 'role') return rolePanel.toggleRole(interaction, ownerId);
  if (action === 'check') return interaction.showModal(rolePanel.buildModal());
  if (action === 'modal') return handleTrackerSubmit(client, interaction);

  if (action === 'pick') return handlePick(interaction, ownerId);
  if (action === 'ok') return handleApprove(interaction, ownerId, rankName);
  if (action === 'no') return handleReject(interaction, ownerId);

  return undefined;
}

module.exports = {
  PREFIX,
  handle,
  handleMessage,
  handleTrackerSubmit,
  buildCard,
  buildComponents,
  canApprove,
  rankByName,
};
