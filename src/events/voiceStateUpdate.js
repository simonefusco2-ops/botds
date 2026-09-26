/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const logger = require('../utils/logger');
const lobbyRepository = require('../database/repositories/lobbyRepository');
const lobbyManager = require('../modules/ihl/lobbyManager');
const voiceRanks = require('../modules/rank/voiceRanks');

/**
 * Serve al check-in della In-House League: la partita parte solo quando tutti e
 * dieci sono davvero nel vocale di ritrovo, quindi ogni entrata e ogni uscita
 * vanno registrate. Guardiamo entrambi i canali coinvolti, perché uscire
 * dal ritrovo deve aggiornare la scheda esattamente come entrarci.
 */
module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    // Le emoji dei rank nel nome della stanza seguono chi entra e chi esce.
    voiceRanks.handleVoiceUpdate(oldState, newState);

    const channels = new Set([oldState.channelId, newState.channelId].filter(Boolean));
    if (!channels.size) return;

    for (const channelId of channels) {
      const lobby = lobbyRepository.findByCheckinVoice(channelId);
      if (!lobby) continue;

      await lobbyManager.handleCheckinChange(client, lobby.id).catch((err) => {
        logger.error(`IHL lobby ${lobby.id}: errore durante il check-in`, err);
      });
    }
  },
};
