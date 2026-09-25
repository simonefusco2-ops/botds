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

function average(values) {
  if (!values.length) return ihlConfig.elo.starting;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Probabilità di vittoria attesa secondo la formula Elo. */
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Calcola la variazione di punti confrontando la media delle due squadre:
 * battere una squadra più forte vale di più, perderci contro costa meno.
 */
function computeDelta(teamAElos, teamBElos, winner) {
  const expectedA = expectedScore(average(teamAElos), average(teamBElos));
  const scoreA = winner === 'a' ? 1 : 0;

  const deltaA = Math.round(ihlConfig.elo.kFactor * (scoreA - expectedA));
  return { deltaA, deltaB: -deltaA };
}

/** Applica il risultato a tutti i giocatori e restituisce il dettaglio per il riepilogo. */
function applyMatchResult(teamA, teamB, winner) {
  const playersA = ihlRepository.getMany(teamA);
  const playersB = ihlRepository.getMany(teamB);

  const { deltaA, deltaB } = computeDelta(
    playersA.map((p) => p.elo),
    playersB.map((p) => p.elo),
    winner,
  );

  const changes = [];

  for (const player of playersA) {
    ihlRepository.applyResult(player.discord_id, deltaA, winner === 'a');
    changes.push({ discordId: player.discord_id, before: player.elo, delta: deltaA, team: 'a' });
  }

  for (const player of playersB) {
    ihlRepository.applyResult(player.discord_id, deltaB, winner === 'b');
    changes.push({ discordId: player.discord_id, before: player.elo, delta: deltaB, team: 'b' });
  }

  return changes;
}

module.exports = { expectedScore, computeDelta, applyMatchResult };
