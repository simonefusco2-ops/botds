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

const PREFIX = 'ihl_';

function currentLobby(interaction) {
  return lobbyRepository.findOpenInChannel(interaction.channelId);
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
  const [action, argument] = interaction.customId.split(':');

  if (action === 'ihl_toggle') return queuePanel.toggleQueues(client, interaction);

  // La classifica è sfogliabile da chiunque: nessun controllo di turno o ruolo.
  if (action === 'ihl_lb') return ihlLeaderboard.turnPage(interaction, Number(argument) || 0);

  if (action === 'ihl_join') {
    if (!queuePanel.isOpen()) {
      return interaction.reply({ content: '🔴 Le code sono chiuse in questo momento.', ephemeral: true });
    }
    return lobbyManager.joinQueue(client, interaction);
  }

  if (action === 'ihl_leave') return lobbyManager.leaveQueue(client, interaction);

  if (action === 'ihl_side') {
    const lobby = currentLobby(interaction);
    if (!(await requireTurn(interaction, lobby, 'side'))) return;

    await interaction.deferUpdate();
    return lobbyManager.chooseSide(client, lobby.id, argument);
  }

  if (action === 'ihl_ban') {
    const lobby = currentLobby(interaction);
    if (!(await requireTurn(interaction, lobby, 'ban'))) return;

    await interaction.deferUpdate();
    return lobbyManager.banMap(client, lobby.id, argument);
  }

  if (action === 'ihl_pick') {
    const lobby = currentLobby(interaction);
    if (!(await requireTurn(interaction, lobby, 'draft'))) return;

    await interaction.deferUpdate();
    return lobbyManager.pickPlayer(client, lobby.id, interaction.values[0]);
  }

  if (action === 'ihl_winner') {
    const lobby = currentLobby(interaction);
    if (!lobby || lobby.state !== 'live') {
      return interaction.reply({ content: '⚠️ Nessuna partita in corso da chiudere.', ephemeral: true });
    }

    // Il risultato lo dichiarano i capitani o lo staff.
    const isCaptain = [lobby.captain_a, lobby.captain_b].includes(interaction.user.id);
    if (!isCaptain && !queuePanel.canManage(interaction.member)) {
      return interaction.reply({
        content: '⛔ Solo i capitani o lo staff possono dichiarare il vincitore.',
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();
    return lobbyManager.finishMatch(client, lobby.id, argument);
  }

  return undefined;
}

module.exports = { PREFIX, handle };
