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

/**
 * Le schede della In-House League, divise per destinazione.
 *
 * - CODA      → canale del pannello: solo la lista di chi è in coda.
 * - PARTITA   → canale privato della partita: check-in, coinflip, lato, ban,
 *               draft e voto del vincitore, tutti sulla stessa scheda.
 * - AVVISO    → canale del pannello: una riga che rimanda alla partita e che a
 *               fine gara diventa il riepilogo del risultato.
 *
 * Tenere le fasi fuori dal canale delle code è voluto: lì si entra in coda e
 * basta, senza bottoni di partite altrui a creare confusione.
 */

const STATE_TITLES = {
  checkin: '🎧  CHECK-IN',
  side: '🧭  SCELTA DEL LATO',
  ban: '🗺️  BAN DELLE MAPPE',
  draft: '📋  SCELTA DEI GIOCATORI',
  live: '🔴  PARTITA IN CORSO',
  closed: '🏁  PARTITA CONCLUSA',
};

function mentions(ids) {
  return ids.length ? ids.map((id) => `<@${id}>`).join('\n') : '-# nessuno';
}

function inline(ids) {
  return ids.length ? ids.map((id) => `<@${id}>`).join(' ') : '-# nessuno';
}

/** Le mappe ancora in gioco fra quelle estratte per questa partita. */
function remainingMaps(lobby) {
  const pool = lobby.map_pool?.length
    ? ihlConfig.maps.filter((map) => lobby.map_pool.includes(map.name))
    : ihlConfig.maps;

  return pool.filter((map) => !lobby.banned_maps.includes(map.name));
}

function countVotes(lobby) {
  const votes = Object.values(lobby.votes || {});
  return { a: votes.filter((v) => v === 'a').length, b: votes.filter((v) => v === 'b').length };
}

/** Quanti voti servono per assegnare l'ELO: la maggioranza dei partecipanti. */
function votesNeeded(lobby) {
  return Math.floor(lobby.players.length / 2) + 1;
}

function pendingVoters(lobby) {
  const votes = lobby.votes || {};
  return lobby.players.filter((id) => !votes[id]);
}

// --- coda -------------------------------------------------------------------

function buildQueueEmbed(lobby) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🎮  CODA IN FORMAZIONE')
    .setDescription(
      `**${lobby.players.length}/${ihlConfig.queueSize}** in coda\n\n${mentions(lobby.players)}`,
    )
    .setFooter({ text: `Coda #${lobby.id} · al decimo giocatore si apre la stanza della partita` })
    .setTimestamp();
}

function buildQueueComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ihl_join').setLabel('Entra in coda').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ihl_leave').setLabel('Esci').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

// --- avviso nel canale delle code -------------------------------------------

/**
 * Sostituisce la scheda della coda quando la partita parte, e a fine gara
 * diventa il riepilogo: nel canale resta la storia dei risultati, non i bottoni.
 */
function buildNoticeEmbed(lobby, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(extra.result ? COLORS.success : COLORS.gold)
    .setFooter({ text: `Partita #${lobby.id}` })
    .setTimestamp();

  if (extra.result) {
    return embed.setTitle(`🏁  PARTITA #${lobby.id}  ·  ${lobby.chosen_map || 'mappa n/d'}`).setDescription(extra.result);
  }

  return embed
    .setTitle(`🎮  PARTITA #${lobby.id} AVVIATA`)
    .setDescription(
      (lobby.text_channel_id
        ? `Tutto si svolge in <#${lobby.text_channel_id}>: check-in, mappe, squadre e voto.\n`
        : '') + `-# ${inline(lobby.players)}`,
    );
}

// --- scheda della partita ---------------------------------------------------

function buildMatchEmbed(lobby, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(lobby.state === 'closed' ? COLORS.success : COLORS.gold)
    .setTitle(`${STATE_TITLES[lobby.state] || 'IN-HOUSE LEAGUE'}  ·  PARTITA #${lobby.id}`)
    .setFooter({ text: `Partita #${lobby.id}` })
    .setTimestamp();

  if (lobby.state === 'checkin') {
    const present = extra.present || [];
    const missing = lobby.players.filter((id) => !present.includes(id));

    embed.setDescription(
      `Entrate tutti nel vocale <#${lobby.checkin_voice_id}>.\n` +
        '**La partita parte solo quando ci siete tutti e dieci**, e da lì vi sposto nelle vocali delle squadre.',
    );
    embed.addFields(
      { name: `✅ Dentro — ${present.length}/${lobby.players.length}`, value: inline(present) },
      { name: `⌛ Mancano — ${missing.length}`, value: inline(missing) },
    );

    if (extra.substitutable) {
      embed.addFields({
        name: '🔁 Sostituzione disponibile',
        value:
          'Sono passati i minuti d\'attesa: lo staff può rimpiazzare chi manca con\n' +
          `\`/ihl sostituisci codice:${lobby.id} esce:@assente entra:@riserva\``,
      });
    }

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
      `🪙 **Lancio della moneta:** tocca a <@${lobby.turn}> scegliere da che lato iniziare.\n` +
        '-# Alla scadenza del tempo decide il bot.',
    );
  }

  if (lobby.state === 'ban') {
    const left = remainingMaps(lobby);
    embed.setDescription(
      `Squadre fatte. Turno di <@${lobby.turn}>: banna una mappa.\n\n` +
        `**Ancora in gioco:** ${left.map((m) => m.name).join(' · ')}\n` +
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
    const { a, b } = countVotes(lobby);

    embed.setDescription(
      extra.result ||
        `**Mappa:** ${lobby.chosen_map}\n` +
          `**Team A** inizia in **${lobby.side_a === 'attack' ? 'Attacco' : 'Difesa'}**\n\n` +
          `Finita la partita votate il vincitore qui sotto: con **${votesNeeded(lobby)} voti** ` +
          'l\'ELO viene assegnato subito.\n-# Nessuna scadenza: votate quando avete finito, ' +
          'anche fra ore.',
    );

    embed.addFields(
      { name: `🔴 Team A — ${a} voti`, value: mentions(lobby.team_a), inline: true },
      { name: `🔵 Team B — ${b} voti`, value: mentions(lobby.team_b), inline: true },
    );

    if (lobby.state === 'live') {
      const pending = pendingVoters(lobby);
      embed.addFields({
        name: `🗳️ Devono ancora votare — ${pending.length}`,
        value: pending.length ? inline(pending) : '-# hanno votato tutti',
      });
    }

    return embed;
  }

  if (lobby.state !== 'side') {
    embed.addFields(
      { name: '🔴 Team A', value: mentions(lobby.team_a), inline: true },
      { name: '🔵 Team B', value: mentions(lobby.team_b), inline: true },
    );
  }

  return embed;
}

function buildMatchComponents(lobby) {
  // Il numero della lobby viaggia nell'identificatore: con più partite insieme
  // il canale da solo non basta a capire a quale si riferisce il click.
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

  if (lobby.state === 'live') {
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

  // Check-in e partita chiusa non hanno nulla da premere.
  return [];
}

module.exports = {
  buildQueueEmbed,
  buildQueueComponents,
  buildNoticeEmbed,
  buildMatchEmbed,
  buildMatchComponents,
  countVotes,
  votesNeeded,
  pendingVoters,
  remainingMaps,
  mentions,
  inline,
};
