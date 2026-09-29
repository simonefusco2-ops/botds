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

/**
 * Correzione rispetto alla lobby: chi è sopra la media delle dieci persone
 * vince meno e perde di più, chi è sotto il contrario. Così un giocatore forte
 * non sale facile giocando in lobby più deboli. Entro ±max.
 */
function lobbyShift(elo, lobbyAverage) {
  const { spread, max } = ihlConfig.elo.lobbyAdjust || {};
  if (!spread) return 0;
  return Math.max(-max, Math.min(max, (elo - lobbyAverage) / spread));
}

/** Il tetto vale anche per il singolo, dopo fasce e correzione di lobby. */
function bounded(value) {
  const { kFactor, minDelta } = ihlConfig.elo;
  return Math.min(kFactor, Math.max(minDelta, Math.round(value)));
}

/** Quanto vince un singolo giocatore, dalla vittoria di squadra e dalla sua posizione nella lobby. */
function personalGain(teamGain, elo, lobbyAverage) {
  return bounded(teamGain * (1 - lobbyShift(elo, lobbyAverage)));
}

/** Quanto perde un singolo giocatore: fascia di ELO e posizione nella lobby insieme. */
function personalLoss(teamLoss, elo, lobbyAverage) {
  return bounded(teamLoss * lossFactor(elo) * (1 + lobbyShift(elo, lobbyAverage)));
}

function range(values) {
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Cosa si gioca ogni squadra prima di cominciare: per vittoria e sconfitta il
 * minimo e il massimo fra i suoi giocatori, perché dipendono da ognuno.
 */
function stakes(teamAElos, teamBElos) {
  const totalA = total(teamAElos);
  const totalB = total(teamBElos);
  const expectedA = expectedScore(totalA, totalB);
  const average = (totalA + totalB) / (teamAElos.length + teamBElos.length);

  const aWins = gain(expectedA);
  const bWins = gain(1 - expectedA);

  const side = (elos, teamGain, teamLoss) => ({
    win: range(elos.map((elo) => personalGain(teamGain, elo, average))),
    lose: range(elos.map((elo) => personalLoss(teamLoss, elo, average))),
  });

  return { totalA, totalB, a: side(teamAElos, aWins, bWins), b: side(teamBElos, bWins, aWins) };
}

/** Applica il risultato a tutti i giocatori e restituisce il dettaglio per il riepilogo. */
function applyMatchResult(league, teamA, teamB, winner) {
  const playersA = ihlRepository.getMany(league, teamA);
  const playersB = ihlRepository.getMany(league, teamB);
  const all = [...playersA, ...playersB];

  const expectedA = expectedScore(total(playersA.map((p) => p.elo)), total(playersB.map((p) => p.elo)));
  const average = total(all.map((p) => p.elo)) / all.length;
  // Punti di squadra, poi ognuno li riceve corretti per fascia e posizione nella lobby.
  const teamGain = winner === 'a' ? gain(expectedA) : gain(1 - expectedA);

  const changes = [];

  for (const [team, players] of [['a', playersA], ['b', playersB]]) {
    const won = team === winner;
    for (const player of players) {
      const delta = won
        ? personalGain(teamGain, player.elo, average)
        : -personalLoss(teamGain, player.elo, average);
      ihlRepository.applyResult(league, player.discord_id, delta, won);
      changes.push({ discordId: player.discord_id, before: player.elo, delta, team });
    }
  }

  return changes;
}

module.exports = { expectedScore, stakes, lossFactor, applyMatchResult };
