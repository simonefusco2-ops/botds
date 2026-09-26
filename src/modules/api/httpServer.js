/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const express = require('express');
const config = require('../../config');
const logger = require('../../utils/logger');
const { mountPublicApi } = require('./publicApi');

/**
 * Server HTTP del bot: ospita l'API di sola lettura per il sito.
 *
 * Resta in ascolto anche con l'API spenta, perché la porta fa da lucchetto
 * contro una seconda istanza del bot (vedi sotto).
 */
function createHttpServer() {
  const app = express();
  if (config.apiEnabled) mountPublicApi(app);

  const server = app.listen(config.httpPort, () => {
    logger.info(`Server HTTP in ascolto sulla porta ${config.httpPort}`);
  });

  /**
   * La porta occupata significa quasi sempre che il bot è già in esecuzione.
   *
   * Due processi con lo stesso token ricevono entrambi gli stessi eventi da
   * Discord ed eseguono entrambi le azioni: due canali per la stessa partita,
   * due schede della coda, giocatori contati due volte. Il secondo processo
   * si ferma subito e lo dice chiaramente.
   */
  server.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
      logger.error('Server HTTP: errore', err);
      return;
    }

    logger.error(
      `La porta ${config.httpPort} è già occupata: un'altra istanza del bot è già in ` +
        'esecuzione. Questo processo si ferma per non duplicare code e partite. ' +
        'Controlla con "pm2 list" e "ps aux | grep node" che non ce ne siano due.',
    );
    process.exit(1);
  });

  return app;
}

module.exports = { createHttpServer };
