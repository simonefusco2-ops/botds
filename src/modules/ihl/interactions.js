/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const lobbyRepository = require('../../database/repositories/lobbyRepository');
const lobbyManager = require('./lobbyManager');
const queuePanel = require('./queuePanel');
const ihlLeaderboard = require('./leaderboard');
const leagues = require('./leagues');

const PREFIX = 'ihl_';

/**
 * Con più partite contemporanee nello stesso canale il numero della lobby
 * viaggia dentro l'identificatore del bottone: `ihl_ban:12:Ascent`. Il canale
 * da solo non basta più a capire a quale partita si riferisce il click.
 */
function lobbyFrom(id) {
  return lobbyRepository.find(Number(id));
}

/** Verifica che tocchi davvero a chi ha premuto, prima di modificare la lobby. */
async function requireTurn(interaction, lobby, state) {
  if (!lobby || lobby.state !== state) {
    await interaction.reply({ content: '⚠️ Questa fase è già conclusa.', ephemeral: true });
    return false;
  }

  if (lobby.turn !== interaction.user.id) {
    await interaction.reply({ content: `⛔ Non è il tuo turno: tocca a <@${lobby.turn}>.`, ephemeral: true });
    return false;
  }

  return true;
}

async function handle(client, interaction) {
  const [action, ...rest] = interaction.customId.split(':');

  // La lega viaggia nell'identificatore dei bottoni: due campionati vivono in
  // canali diversi e il bot deve sapere subito di quale si tratta.
  if (action === 'ihl_toggle') return queuePanel.toggleQueues(client, interaction, rest[0]);

  // La classifica è sfogliabile da chiunque: nessun controllo di turno o ruolo.
  // Dal pannello pubblico si apre una copia privata; dentro quella si sfoglia.
  if (action === 'ihl_lb') {
    return ihlLeaderboard.turnPage(
      interaction,
      Number(rest[0]) || 0,
      rest[1] || ihlLeaderboard.PUBLIC,
      rest[2],
    );
  }

  if (action === 'ihl_lb_me') return ihlLeaderboard.showOwnPosition(interaction, rest[0]);

  if (action === 'ihl_join') {
    const league = leagues.find(rest[0]);
    if (!queuePanel.isOpen(league)) {
      return interaction.reply({
        content: `🔴 Le code della **${league.name}** sono chiuse in questo momento.`,
        ephemeral: true,
      });
    }
    return lobbyManager.joinQueue(client, interaction, league.id);
  }

  if (action === 'ihl_leave') return lobbyManager.leaveQueue(client, interaction);

  if (action === 'ihl_side') {
    const lobby = lobbyFrom(rest[0]);
    if (!(await requireTurn(interaction, lobby, 'side'))) return;

    await interaction.deferUpdate();
    return lobbyManager.chooseSide(client, lobby.id, rest[1]);
  }

  if (action === 'ihl_ban') {
    const lobby = lobbyFrom(rest[0]);
    if (!(await requireTurn(interaction, lobby, 'ban'))) return;

    await interaction.deferUpdate();
    return lobbyManager.banMap(client, lobby.id, rest.slice(1).join(':'));
  }

  if (action === 'ihl_pick') {
    const lobby = lobbyFrom(rest[0]);
    if (!(await requireTurn(interaction, lobby, 'draft'))) return;

    await interaction.deferUpdate();
    return lobbyManager.pickPlayer(client, lobby.id, interaction.values[0]);
  }

  // Voto del vincitore nel canale privato della partita: vince la maggioranza
  // dei partecipanti, quindi 6 voti su 10.
  if (action === 'ihl_vote') {
    const outcome = await lobbyManager.castVote(client, Number(rest[0]), interaction.user.id, rest[1]);

    if (outcome.error) {
      return interaction.reply({ content: `⚠️ ${outcome.error}`, ephemeral: true });
    }

    if (outcome.settled) {
      return interaction.reply({
        content: outcome.cancelled
          ? '🚫 Maggioranza raggiunta: partita annullata, nessun ELO assegnato.'
          : '✅ Maggioranza raggiunta: risultato registrato.',
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: outcome.tie
        ? '🗳️ Voto registrato, ma siete in parità: se non cambia idea nessuno servirà lo staff con `/ihl risultato`.'
        : rest[1] === 'x'
          ? '🗳️ Voto registrato per **annullare** la partita. Puoi cambiarlo premendo un altro bottone.'
          : `🗳️ Voto registrato per il **Team ${rest[1].toUpperCase()}**. Puoi cambiarlo premendo un altro bottone.`,
      ephemeral: true,
    });
  }

  return undefined;
}

module.exports = { PREFIX, handle };
