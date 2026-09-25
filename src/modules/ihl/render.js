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
    embed.setDescription(
      `**Mappa:** ${lobby.chosen_map}\n` +
        `**Team A** inizia in **${lobby.side_a === 'attack' ? 'Attacco' : 'Difesa'}**` +
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

  if (lobby.state === 'side') {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ihl_side:attack').setLabel('Attacco').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ihl_side:defense').setLabel('Difesa').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
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
              .setCustomId(`ihl_ban:${map.name}`)
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
          .setCustomId('ihl_pick')
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

  if (lobby.state === 'live') {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ihl_winner:a').setLabel('Ha vinto Team A').setEmoji('🔴').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ihl_winner:b').setLabel('Ha vinto Team B').setEmoji('🔵').setStyle(ButtonStyle.Primary),
      ),
    ];
  }

  return [];
}

module.exports = { buildLobbyEmbed, buildLobbyComponents, remainingMaps, mentions };
