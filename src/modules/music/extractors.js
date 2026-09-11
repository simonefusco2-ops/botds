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
const { findFFmpeg } = require('@discord-player/ffmpeg');
const logger = require('../../utils/logger');

/**
 * Senza FFmpeg il bot entra in vocale ma resta muto, senza generare errori:
 * lo verifichiamo all'avvio perché il guasto sia visibile nei log.
 */
function checkFFmpeg() {
  const ffmpeg = findFFmpeg();

  if (ffmpeg?.command) {
    logger.info(`FFmpeg trovato: ${ffmpeg.command}`);
    return;
  }

  logger.error(
    'FFmpeg non trovato: il bot entrerà nel canale vocale senza riprodurre audio. ' +
      'Installa il pacchetto con "npm install ffmpeg-static" oppure ffmpeg di sistema.',
  );
}

/**
 * L'estrattore YouTube predefinito si basa sullo scraping ed è instabile.
 * Carichiamo quindi tutti gli altri estrattori e al suo posto registriamo
 * Youtubei, che usa l'API interna di YouTube; se la sua inizializzazione non
 * riesce (per esempio senza rete verso YouTube) si ripiega su quello standard,
 * perché senza un estrattore YouTube la ricerca per titolo non funzionerebbe.
 */
async function loadAudioExtractors(player) {
  checkFFmpeg();

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
