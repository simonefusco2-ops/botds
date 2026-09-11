/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { YouTubeExtractor } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const logger = require('../../utils/logger');

/**
 * L'estrattore YouTube predefinito si basa sullo scraping ed è instabile.
 * Carichiamo quindi tutti gli altri estrattori e al suo posto registriamo
 * Youtubei, che usa l'API interna di YouTube; se la sua inizializzazione non
 * riesce (per esempio senza rete verso YouTube) si ripiega su quello standard,
 * perché senza un estrattore YouTube la ricerca per titolo non funzionerebbe.
 */
async function loadAudioExtractors(player) {
  await player.extractors.loadDefault((extractor) => extractor !== 'YouTubeExtractor');

  await player.extractors.register(YoutubeiExtractor, {}).catch((err) => {
    logger.warn(`Registrazione estrattore Youtubei fallita: ${err.message}`);
  });

  const youtubeReady = [...player.extractors.store.values()].some((extractor) =>
    extractor.identifier.toLowerCase().includes('youtubei'),
  );

  if (!youtubeReady) {
    logger.warn('Estrattore Youtubei non attivo: ripiego su quello predefinito.');
    await player.extractors.register(YouTubeExtractor, {}).catch((err) => {
      logger.error(`Nessun estrattore YouTube disponibile: ${err.message}`);
    });
  }

  logger.info(
    `Estrattori audio attivi: ${[...player.extractors.store.values()].map((e) => e.identifier).join(', ')}`,
  );
}

module.exports = { loadAudioExtractors };
