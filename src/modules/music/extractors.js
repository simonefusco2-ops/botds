/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeExtractor } = require('discord-player-youtubei');
const { FFmpeg } = require('@discord-player/ffmpeg');
const logger = require('../../utils/logger');

/**
 * Senza FFmpeg il bot entra in vocale ma resta muto, senza generare errori:
 * lo verifichiamo all'avvio perché il guasto sia visibile nei log.
 */
function checkFFmpeg() {
  const ffmpeg = FFmpeg.resolveSafe();

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
 * Gli estrattori predefiniti coprono Spotify, Apple Music, SoundCloud e affini
 * ma non YouTube, che va registrato a parte: è anche la sorgente su cui vengono
 * riprodotti i brani trovati sugli altri servizi.
 */
async function loadAudioExtractors(player) {
  checkFFmpeg();

  await player.extractors.loadMulti(DefaultExtractors);
  await player.extractors.register(YoutubeExtractor, {});

  const identifiers = [...player.extractors.store.values()].map((extractor) => extractor.identifier);

  if (!identifiers.some((id) => id.toLowerCase().includes('youtube'))) {
    logger.error('Estrattore YouTube non registrato: la ricerca per titolo non funzionerà.');
  }

  logger.info(`Estrattori audio attivi: ${identifiers.join(', ')}`);
}

module.exports = { loadAudioExtractors };
