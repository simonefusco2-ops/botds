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
const ihlConfig = require('../../../config/ihl.config');
const { COLORS } = require('../../utils/embeds');

const STATE_TITLES = {
  queue: '🎮  CODA IN FORMAZIONE',
  side: '🧭  SCELTA DEL LATO',
  ban: '🗺️  BAN DELLE MAPPE',
  draft: '📋  SCELTA DEI GIOCATORI',
  live: '🔴  PARTITA IN CORSO',
  closed: '🏁  PARTITA CONCLUSA',
};

function mentions(ids) {
  return ids.length ? ids.map((id) => `<@${id}>`).join('\n') : '-# nessuno';
}

/** Le mappe ancora in gioco fra quelle estratte per questa partita. */
function remainingMaps(lobby) {
  const pool = lobby.map_pool?.length
    ? ihlConfig.maps.filter((map) => lobby.map_pool.includes(map.name))
    : ihlConfig.maps;

  return pool.filter((map) => !lobby.banned_maps.includes(map.name));
}

function buildLobbyEmbed(lobby, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(lobby.state === 'closed' ? COLORS.success : COLORS.gold)
    .setTitle(STATE_TITLES[lobby.state] || 'IN-HOUSE LEAGUE')
    .setFooter({ text: `Lobby #${lobby.id}` })
    .setTimestamp();

  if (lobby.state === 'queue') {
    embed.setDescription(
      `**${lobby.players.length}/${ihlConfig.queueSize}** in coda\n\n${mentions(lobby.players)}`,
    );
    return embed;
  }

  if (lobby.captain_a) {
    embed.addFields(
      { name: '🔴 Capitano A', value: `<@${lobby.captain_a}>`, inline: true },
      { name: '🔵 Capitano B', value: `<@${lobby.captain_b}>`, inline: true },
    );
  }

  if (lobby.state === 'side') {
    embed.setDescription(
      `<@${lobby.turn}> ha l'ELO più alto: sceglie da che lato iniziare.\n` +
        `-# Alla scadenza del tempo decide il bot.`,
    );
  }

  if (lobby.state === 'ban') {
    const left = remainingMaps(lobby);
    embed.setDescription(
      `Turno di <@${lobby.turn}>: banna una mappa.\n\n` +
        `**Ancora in gioco:** ${left.map((m) => `${m.emoji} ${m.name}`).join(' · ')}\n` +
        (lobby.banned_maps.length ? `-# Bannate: ${lobby.banned_maps.join(', ')}` : ''),
    );
  }

  if (lobby.state === 'draft') {
    const picked = [...lobby.team_a, ...lobby.team_b];
    const available = lobby.players.filter((id) => !picked.includes(id));
    embed.setDescription(`Turno di <@${lobby.turn}>: scegli un giocatore.`);
    embed.addFields({ name: 'Disponibili', value: mentions(available) });
  }

  if (lobby.state === 'live' || lobby.state === 'closed') {
    // Il voto del vincitore vive nel canale privato della partita: qui lo linkiamo.
    const room =
      lobby.state === 'live' && lobby.text_channel_id
        ? `\n-# Votate il vincitore in <#${lobby.text_channel_id}>.`
        : '';

    embed.setDescription(
      `**Mappa:** ${lobby.chosen_map}\n` +
        `**Team A** inizia in **${lobby.side_a === 'attack' ? 'Attacco' : 'Difesa'}**` +
        room +
        (extra.result ? `\n\n${extra.result}` : ''),
    );
  }

  if (lobby.state !== 'queue' && lobby.state !== 'side') {
    embed.addFields(
      { name: '🔴 Team A', value: mentions(lobby.team_a), inline: true },
      { name: '🔵 Team B', value: mentions(lobby.team_b), inline: true },
    );
  }

  return embed;
}

function buildLobbyComponents(lobby) {
  if (lobby.state === 'queue') {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ihl_join').setLabel('Entra in coda').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ihl_leave').setLabel('Esci').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
      ),
    ];
  }

  // Con più partite contemporanee il numero della lobby viaggia nell'identificatore
  // del bottone: il canale da solo non basta più a capire a quale si riferisce.
  if (lobby.state === 'side') {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ihl_side:${lobby.id}:attack`)
          .setLabel('Attacco')
          .setEmoji('⚔️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ihl_side:${lobby.id}:defense`)
          .setLabel('Difesa')
          .setEmoji('🛡️')
          .setStyle(ButtonStyle.Primary),
      ),
    ];
  }

  if (lobby.state === 'ban') {
    const left = remainingMaps(lobby);
    const rows = [];
    for (let i = 0; i < left.length; i += 5) {
      rows.push(
        new ActionRowBuilder().addComponents(
          left.slice(i, i + 5).map((map) =>
            new ButtonBuilder()
              .setCustomId(`ihl_ban:${lobby.id}:${map.name}`)
              .setLabel(map.name)
              .setEmoji(map.emoji)
              .setStyle(ButtonStyle.Secondary),
          ),
        ),
      );
    }
    return rows;
  }

  if (lobby.state === 'draft') {
    const picked = [...lobby.team_a, ...lobby.team_b];
    const available = lobby.players.filter((id) => !picked.includes(id));
    if (!available.length) return [];

    return [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`ihl_pick:${lobby.id}`)
          .setPlaceholder('Scegli un giocatore')
          .addOptions(
            available.slice(0, 25).map((id) => ({
              label: (lobby.names?.[id] || id).slice(0, 100),
              value: id,
            })),
          ),
      ),
    ];
  }

  // In partita si vota nel canale dedicato, non qui: la scheda in coda resta informativa.
  return [];
}

function countVotes(lobby) {
  const votes = Object.values(lobby.votes || {});
  return { a: votes.filter((v) => v === 'a').length, b: votes.filter((v) => v === 'b').length };
}

/** Chi deve ancora esprimersi: è la lista che il bot ritagga a metà tempo. */
function pendingVoters(lobby) {
  const votes = lobby.votes || {};
  return lobby.players.filter((id) => !votes[id]);
}

/** Scheda di voto pubblicata nel canale privato della partita. */
function buildVoteEmbed(lobby, extra = {}) {
  const { a, b } = countVotes(lobby);
  const needed = Math.floor(lobby.players.length / 2) + 1;

  const deadline = lobby.vote_deadline
    ? `\nAllo scadere del tempo (<t:${lobby.vote_deadline}:R>) vince chi ha più voti.`
    : '';

  const embed = new EmbedBuilder()
    .setColor(extra.result ? COLORS.success : COLORS.gold)
    .setTitle(`🎮  PARTITA #${lobby.id}  ·  ${lobby.chosen_map}`)
    .setDescription(
      extra.result ||
        `Al termine votate chi ha vinto: con **${needed} voti** la partita si chiude subito.` +
          deadline +
          `\n-# Team A inizia in ${lobby.side_a === 'attack' ? 'Attacco' : 'Difesa'}.`,
    )
    .addFields(
      { name: `🔴 Team A — ${a} voti`, value: mentions(lobby.team_a), inline: true },
      { name: `🔵 Team B — ${b} voti`, value: mentions(lobby.team_b), inline: true },
    )
    .setFooter({ text: `Lobby #${lobby.id}` })
    .setTimestamp();

  // Finché la partita è aperta si vede a occhio chi sta tenendo tutti in attesa.
  if (!extra.result) {
    const pending = pendingVoters(lobby);
    embed.addFields({
      name: `🗳️ Devono ancora votare — ${pending.length}`,
      value: pending.length ? pending.map((id) => `<@${id}>`).join(' ') : '-# hanno votato tutti',
    });
  }

  return embed;
}

function buildVoteComponents(lobby) {
  const { a, b } = countVotes(lobby);

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ihl_vote:${lobby.id}:a`)
        .setLabel(`Ha vinto Team A (${a})`)
        .setEmoji('🔴')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ihl_vote:${lobby.id}:b`)
        .setLabel(`Ha vinto Team B (${b})`)
        .setEmoji('🔵')
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

module.exports = {
  buildLobbyEmbed,
  buildLobbyComponents,
  buildVoteEmbed,
  buildVoteComponents,
  countVotes,
  pendingVoters,
  remainingMaps,
  mentions,
};
