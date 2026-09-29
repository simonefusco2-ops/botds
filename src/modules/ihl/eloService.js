/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const ihlConfig = require('../../../config/ihl.config');
const ihlRepository = require('../../database/repositories/ihlRepository');

function total(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

/** Probabilità che la squadra A vinca, dai totali ELO delle due squadre. */
function expectedScore(totalA, totalB) {
  return 1 / (1 + 10 ** ((totalB - totalA) / ihlConfig.elo.scale));
}

/** Punti a chi vince: mai sopra kFactor, mai sotto minDelta. */
function gain(expectedOfWinner) {
  const { kFactor, minDelta } = ihlConfig.elo;
  return Math.min(kFactor, Math.max(minDelta, Math.round(kFactor * (1 - expectedOfWinner))));
}

/**
 * Come nelle ranked: più sei in alto, più una sconfitta costa. Il fattore
 * dipende dall'ELO di chi perde prima della partita; la vittoria non cambia.
 */
function lossFactor(elo) {
  const band = ihlConfig.elo.lossBands.find((entry) => entry.below == null || elo < entry.below);
  return band ? band.factor : 1;
}

/** Quanto perde un singolo giocatore, dalla sconfitta di squadra e dal suo ELO. */
function personalLoss(teamLoss, elo) {
  return Math.max(ihlConfig.elo.minDelta, Math.round(teamLoss * lossFactor(elo)));
}

/**
 * Cosa si gioca ogni squadra prima di cominciare: quanto prende se vince e,
 * per la sconfitta, il minimo e il massimo fra i suoi giocatori (dipende dalla
 * fascia di ognuno).
 */
function stakes(teamAElos, teamBElos) {
  const totalA = total(teamAElos);
  const totalB = total(teamBElos);
  const expectedA = expectedScore(totalA, totalB);

  const aWins = gain(expectedA);
  const bWins = gain(1 - expectedA);

  const range = (teamLoss, elos) => {
    const losses = elos.map((elo) => personalLoss(teamLoss, elo));
    return { min: Math.min(...losses), max: Math.max(...losses) };
  };

  return {
    totalA,
    totalB,
    a: { win: aWins, lose: range(bWins, teamAElos) },
    b: { win: bWins, lose: range(aWins, teamBElos) },
  };
}

/** Applica il risultato a tutti i giocatori e restituisce il dettaglio per il riepilogo. */
function applyMatchResult(league, teamA, teamB, winner) {
  const playersA = ihlRepository.getMany(league, teamA);
  const playersB = ihlRepository.getMany(league, teamB);

  const expectedA = expectedScore(total(playersA.map((p) => p.elo)), total(playersB.map((p) => p.elo)));
  // Punti di squadra: chi vince li prende tutti, chi perde li perde scalati per fascia.
  const teamGain = winner === 'a' ? gain(expectedA) : gain(1 - expectedA);

  const changes = [];

  for (const [team, players] of [['a', playersA], ['b', playersB]]) {
    const won = team === winner;
    for (const player of players) {
      const delta = won ? teamGain : -personalLoss(teamGain, player.elo);
      ihlRepository.applyResult(league, player.discord_id, delta, won);
      changes.push({ discordId: player.discord_id, before: player.elo, delta, team });
    }
  }

  return changes;
}

module.exports = { expectedScore, stakes, lossFactor, applyMatchResult };
