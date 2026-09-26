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
const rankRequest = require('../modules/rank/rankRequest');

/**
 * Serve alla verifica del rank: dentro una pratica IPL, un link a tracker.gg
 * incollato a mano avvia il controllo esattamente come farebbe il pannello.
 * Chi apre il ticket dal regolamento non deve sapere che esiste un altro modo.
 */
module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    await rankRequest.handleMessage(client, message).catch((err) => {
      logger.error('Errore nella verifica del rank da messaggio', err);
    });
  },
};
