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
 * Cosa si gioca ogni squadra prima di cominciare: quanto prende se vince e
 * quanto perde se perde. È simmetrico: la vittoria di A vale la sconfitta di B.
 */
function stakes(teamAElos, teamBElos) {
  const totalA = total(teamAElos);
  const totalB = total(teamBElos);
  const expectedA = expectedScore(totalA, totalB);

  const aWins = gain(expectedA);
  const bWins = gain(1 - expectedA);
  return { totalA, totalB, a: { win: aWins, lose: bWins }, b: { win: bWins, lose: aWins } };
}

/** La variazione per le due squadre, dato il vincitore. */
function computeDelta(teamAElos, teamBElos, winner) {
  const s = stakes(teamAElos, teamBElos);
  const deltaA = winner === 'a' ? s.a.win : -s.a.lose;
  return { deltaA, deltaB: -deltaA };
}

/** Applica il risultato a tutti i giocatori e restituisce il dettaglio per il riepilogo. */
function applyMatchResult(league, teamA, teamB, winner) {
  const playersA = ihlRepository.getMany(league, teamA);
  const playersB = ihlRepository.getMany(league, teamB);

  const { deltaA, deltaB } = computeDelta(
    playersA.map((p) => p.elo),
    playersB.map((p) => p.elo),
    winner,
  );

  const changes = [];

  for (const player of playersA) {
    ihlRepository.applyResult(league, player.discord_id, deltaA, winner === 'a');
    changes.push({ discordId: player.discord_id, before: player.elo, delta: deltaA, team: 'a' });
  }

  for (const player of playersB) {
    ihlRepository.applyResult(league, player.discord_id, deltaB, winner === 'b');
    changes.push({ discordId: player.discord_id, before: player.elo, delta: deltaB, team: 'b' });
  }

  return changes;
}

module.exports = { expectedScore, stakes, computeDelta, applyMatchResult };
