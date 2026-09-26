/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const ihlRepository = require('../database/repositories/ihlRepository');
const lobbyRepository = require('../database/repositories/lobbyRepository');
const queuePanel = require('../modules/ihl/queuePanel');
const ihlConfig = require('../../config/ihl.config');
const leagues = require('../modules/ihl/leagues');
const ihlLeaderboard = require('../modules/ihl/leaderboard');
const lobbyManager = require('../modules/ihl/lobbyManager');
const { COLORS } = require('../utils/embeds');

/** L'opzione con cui si sceglie il campionato. */
function leagueOption(opt, required = false) {
  return opt
    .setName('lega')
    .setDescription('Campionato di riferimento')
    .setRequired(required)
    .addChoices(...leagues.choices());
}

/** La lega indicata nel comando, o quella predefinita. */
function leagueOf(interaction) {
  return leagues.find(interaction.options.getString('lega'));
}

const STAFF_ONLY = ['pannello', 'classifica', 'annulla', 'elo-modifica', 'risultato', 'sostituisci', 'sblocca', 'rimuovi'];

const STATE_LABELS = {
  queue: 'in coda',
  checkin: 'check-in nel vocale',
  side: 'scelta del lato',
  ban: 'ban delle mappe',
  draft: 'draft',
  live: 'in corso',
};

function buildProfileEmbed(user, player, history, league) {
  const winrate = player.matches ? Math.round((player.wins / player.matches) * 100) : 0;

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setAuthor({ name: `${user.username} · ${league.name}`, iconURL: user.displayAvatarURL() })
    .setTitle(`📊  ${player.elo} ELO  ·  #${ihlRepository.rankOf(league.id, player.elo)} in classifica`)
    .setDescription(`**${player.wins}** vittorie · **${player.losses}** sconfitte · **${winrate}%** winrate`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  if (!history.length) {
    embed.addFields({ name: 'Storico', value: '-# Nessuna partita disputata.' });
    return embed;
  }

  embed.addFields({
    name: `Ultime ${history.length} partite`,
    value: history
      .map((match) => {
        const delta = match.elo_after - match.elo_before;
        const sign = delta >= 0 ? '+' : '';
        const date = `<t:${Math.floor(new Date(`${match.played_at}Z`).getTime() / 1000)}:R>`;

        if (match.voided) {
          return `🚫 \`#${match.lobby_id}\` ~~${match.map || 'Mappa n/d'} ${sign}${delta}~~ · annullata  ${date}`;
        }

        const icon = match.won ? '🟢' : '🔴';
        return `${icon} \`#${match.lobby_id}\` ${match.map || 'Mappa n/d'} · **${sign}${delta}** → ${match.elo_after}  ${date}`;
      })
      .join('\n'),
  });

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ihl')
    .setDescription('In-House League: profilo, classifica e gestione')
    .addSubcommand((sub) =>
      sub
        .setName('profilo')
        .setDescription('Mostra ELO, statistiche e storico partite')
        .addUserOption((opt) => opt.setName('giocatore').setDescription('Default: te stesso'))
        .addStringOption((opt) => leagueOption(opt)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('classifica')
        .setDescription('Pubblica il pannello classifica sfogliabile (staff)')
        .addStringOption((opt) => leagueOption(opt, true))
        .addChannelOption((opt) =>
          opt
            .setName('canale')
            .setDescription('Canale della classifica (default: questo canale)')
            .addChannelTypes(ChannelType.GuildText),
        )
        .addAttachmentOption((opt) =>
          opt.setName('immagine').setDescription('Banner mostrato in cima alla classifica'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('pannello')
        .setDescription('Pubblica il pannello con lo stato delle code (staff)')
        // Discord pretende le opzioni obbligatorie prima di quelle facoltative.
        .addStringOption((opt) => leagueOption(opt, true))
        .addChannelOption((opt) =>
          opt
            .setName('canale')
            .setDescription('Canale del pannello (default: questo canale)')
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('elo-modifica')
        .setDescription("Corregge l'ELO di un giocatore (staff)")
        .addUserOption((opt) => opt.setName('giocatore').setDescription('Giocatore da correggere').setRequired(true))
        .addIntegerOption((opt) => opt.setName('valore').setDescription('Punti da impostare o da sommare').setRequired(true))
        .addStringOption((opt) => leagueOption(opt, true))
        .addStringOption((opt) =>
          opt
            .setName('modo')
            .setDescription('Default: imposta')
            .addChoices({ name: 'Imposta a', value: 'set' }, { name: 'Somma (anche negativo)', value: 'add' }),
        )
        .addStringOption((opt) => opt.setName('motivo').setDescription('Annotato nella risposta')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('partite')
        .setDescription('Elenca le partite e le code attive con il loro codice'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('risultato')
        .setDescription('Dichiara il vincitore di una partita, utile se il voto finisce in parità (staff)')
        .addIntegerOption((opt) =>
          opt.setName('codice').setDescription('Numero della partita').setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('squadra')
            .setDescription('Squadra vincitrice')
            .setRequired(true)
            .addChoices({ name: '🔴 Team A', value: 'a' }, { name: '🔵 Team B', value: 'b' }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('sostituisci')
        .setDescription('Rimpiazza chi non si presenta al check-in (staff)')
        .addIntegerOption((opt) =>
          opt.setName('codice').setDescription('Numero della partita').setRequired(true),
        )
        .addUserOption((opt) => opt.setName('esce').setDescription('Chi non si è presentato').setRequired(true))
        .addUserOption((opt) => opt.setName('entra').setDescription('Chi prende il suo posto').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rimuovi')
        .setDescription('Toglie un giocatore dalla coda in cui si trova (staff)')
        .addUserOption((opt) => opt.setName('giocatore').setDescription('Chi togliere').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('sblocca')
        .setDescription('Rimette in pari una partita bloccata senza annullarla (staff)')
        .addIntegerOption((opt) =>
          opt.setName('codice').setDescription('Numero della partita; se omesso usa quella di questo canale'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('annulla')
        .setDescription('Annulla una partita e rimuove le vocali (staff)')
        .addIntegerOption((opt) =>
          opt.setName('codice').setDescription('Numero della lobby; se omesso usa quella di questo canale'),
        ),
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    // Il comando è visibile a tutti, ma le azioni di gestione restano allo staff.
    if (STAFF_ONLY.includes(subcommand) && !queuePanel.canManage(interaction.member)) {
      return interaction.reply({
        content: '⛔ Riservato a Developer, Owner e Staff IVPITER.',
        ephemeral: true,
      });
    }

    if (subcommand === 'profilo') {
      const target = interaction.options.getUser('giocatore') || interaction.user;
      const league = leagueOf(interaction);
      const player = ihlRepository.get(league.id, target.id);
      const history = ihlRepository.history(league.id, target.id, 10);

      return interaction.reply({
        embeds: [buildProfileEmbed(target, player, history, league)],
        ephemeral: true,
      });
    }

    if (subcommand === 'classifica') {
      const channel = interaction.options.getChannel('canale') || interaction.channel;
      const image = interaction.options.getAttachment('immagine');
      const league = leagueOf(interaction);

      await interaction.deferReply({ ephemeral: true });

      try {
        await ihlLeaderboard.publish(client, channel, image, league);
      } catch (err) {
        return interaction.editReply({ content: `❌ Errore sull'immagine: ${err.message}` });
      }

      return interaction.editReply({
        content:
          `✅ Classifica **${league.name}** pubblicata in ${channel}: si aggiorna da sola a fine partita` +
          (image ? ' e il banner resta al suo posto.' : '.') +
          '\n-# Ogni lega ha la sua classifica: pubblicale in due canali diversi.',
      });
    }

    if (subcommand === 'pannello') return queuePanel.publishPanel(interaction, leagueOf(interaction));

    // Con più code e partite in parallelo serve un modo per leggere i codici.
    if (subcommand === 'partite') {
      const active = lobbyRepository.listActive();

      if (!active.length) {
        return interaction.reply({ content: '-# Nessuna coda o partita attiva.', ephemeral: true });
      }

      const lines = active.map((entry) => {
        const league = leagues.find(entry.league);
        const state = STATE_LABELS[entry.state] || entry.state;
        const extra =
          entry.state === 'queue'
            ? `${entry.players.length}/${ihlConfig.queueSize} giocatori`
            : entry.chosen_map || 'mappa da definire';
        const room = entry.text_channel_id ? ` · <#${entry.text_channel_id}>` : '';
        return `\`#${entry.id}\` · ${league.emoji} ${league.name} · ${state} · ${extra}${room}`;
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.gold)
            .setTitle('🎮  PARTITE E CODE ATTIVE')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Usa il codice con /ihl risultato o /ihl annulla' }),
        ],
        ephemeral: true,
      });
    }

    if (subcommand === 'sostituisci') {
      const code = interaction.options.getInteger('codice', true);
      const out = interaction.options.getUser('esce', true);
      const replacement = interaction.options.getUser('entra', true);

      await interaction.deferReply({ ephemeral: true });

      const outcome = await lobbyManager.substitutePlayer(client, code, out.id, replacement.id);
      if (outcome.error) return interaction.editReply({ content: `⚠️ ${outcome.error}` });

      return interaction.editReply({
        content: `✅ Nella partita **#${code}** ${replacement} prende il posto di ${out}.`,
      });
    }

    if (subcommand === 'risultato') {
      const code = interaction.options.getInteger('codice', true);
      const winner = interaction.options.getString('squadra', true);
      const lobby = lobbyRepository.find(code);

      if (!lobby || lobby.state !== 'live') {
        return interaction.reply({
          content: `⚠️ La partita \`#${code}\` non è in corso: non c'è nulla da chiudere.`,
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      await lobbyManager.finishMatch(client, lobby.id, winner);
      return interaction.editReply({
        content: `✅ Partita **#${lobby.id}** chiusa con vittoria **Team ${winner.toUpperCase()}**.`,
      });
    }

    if (subcommand === 'rimuovi') {
      const target = interaction.options.getUser('giocatore', true);
      await interaction.deferReply({ ephemeral: true });

      const removed = await lobbyManager.removeFromQueues(client, target.id);
      if (removed.length) {
        return interaction.editReply({
          content: `✅ ${target} tolto dalla coda ${removed.map((lobby) => `**#${lobby.id}**`).join(', ')}.`,
        });
      }

      // Una partita già avviata non è una coda: lì serve la sostituzione.
      const busy = lobbyManager.busyIn(target.id);
      return interaction.editReply({
        content: busy
          ? `⚠️ ${target} non è in coda ma nella partita **#${busy.id}**: usa \`/ihl sostituisci\`.`
          : `⚠️ ${target} non è in nessuna coda.`,
      });
    }

    if (subcommand === 'sblocca') {
      // Di solito lo si lancia dal canale della partita: lì il codice è superfluo.
      const code =
        interaction.options.getInteger('codice') ??
        lobbyRepository.listActive().find((entry) => entry.text_channel_id === interaction.channelId)?.id;

      if (!code) {
        return interaction.reply({
          content: '⚠️ Indica il `codice` della partita, oppure lancia il comando dal suo canale.',
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const outcome = await lobbyManager.unstickLobby(client, code);
      if (outcome.error) return interaction.editReply({ content: `⚠️ ${outcome.error}` });

      return interaction.editReply({
        content: `🔧 Partita **#${code}** rimessa in pari: ${outcome.done.join(', ')}.`,
      });
    }

    if (subcommand === 'elo-modifica') {
      const target = interaction.options.getUser('giocatore', true);
      const value = interaction.options.getInteger('valore', true);
      const mode = interaction.options.getString('modo') || 'set';
      const reason = interaction.options.getString('motivo');

      const league = leagueOf(interaction);
      const before = ihlRepository.get(league.id, target.id).elo;
      const after = ihlRepository.setElo(league.id, target.id, mode === 'add' ? before + value : value).elo;

      await interaction.reply({
        content:
          `✅ ELO di ${target} in **${league.name}**: **${before} → ${after}**` +
          (reason ? `\n-# Motivo: ${reason}` : '') +
          `\n-# Modifica di ${interaction.user}`,
      });

      return ihlLeaderboard.refresh(client, league.id);
    }

    // annulla
    const code = interaction.options.getInteger('codice');

    // Senza codice prendiamo l'ultima partita avviata in questo canale: la coda
    // ancora in raccolta non è una partita da annullare.
    const lobby = code
      ? lobbyRepository.find(code)
      : lobbyRepository
          .listActive()
          .filter((entry) => entry.channel_id === interaction.channelId && entry.state !== 'queue')
          .pop();

    if (!lobby) {
      return interaction.reply({
        content: code
          ? `⚠️ Nessuna partita con codice \`${code}\`.`
          : '⚠️ Nessuna partita avviata in questo canale: indica il codice con `/ihl partite`.',
        ephemeral: true,
      });
    }

    const alreadyVoided = lobby.state === 'closed' && !ihlRepository.matchesOfLobby(lobby.id).length;
    if (alreadyVoided) {
      return interaction.reply({
        content: `⚠️ La partita **#${lobby.id}** è già stata annullata o non ha assegnato punti.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();
    const { refunded } = await lobbyManager.cancelLobby(client, lobby.id);

    if (!refunded.length) {
      return interaction.editReply({
        content: `🚫 Partita **#${lobby.id}** annullata da ${interaction.user}: vocali rimosse, nessun punto era stato assegnato.`,
      });
    }

    const summary = refunded
      .map((row) => {
        const delta = row.elo_after - row.elo_before;
        const sign = -delta >= 0 ? '+' : '';
        return `<@${row.discord_id}> ${sign}${-delta}`;
      })
      .join(' · ');

    return interaction.editReply({
      content:
        `🚫 Partita **#${lobby.id}** annullata da ${interaction.user}.\n` +
        `💸 **Rimborsi applicati a ${refunded.length} giocatori:**\n${summary}`,
    });
  },
};
