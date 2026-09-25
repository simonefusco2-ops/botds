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
const voiceRouter = require('./voiceRouter');
const { mountPublicApi } = require('../api/publicApi');

const CONFIGURING_EVENTS = ['match_status_configuring', 'match_status_ready'];
const FINISHED_EVENTS = ['match_status_finished'];

/**
 * Server Express integrato nel bot, in ascolto dei Webhook della Faceit Hub.
 * Risponde subito 200 OK e processa l'evento in modo asincrono, per non
 * bloccare/ritardare le risposte dei webhook Faceit né il thread principale del bot.
 */
function createWebhookServer(client) {
  const app = express();
  app.use(express.json());

  // Sullo stesso server vive l'API di sola lettura che alimenta il sito.
  if (config.apiEnabled) mountPublicApi(app);

  app.post('/webhooks/faceit', (req, res) => {
    if (config.faceitWebhookSecret) {
      const provided = req.headers['x-webhook-secret'] || req.query.secret;
      if (provided !== config.faceitWebhookSecret) {
        logger.warn('Webhook Faceit rifiutato: secret non valido.');
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    res.status(200).json({ ok: true });

    handleEvent(client, req.body).catch((err) => {
      logger.error('Errore gestione evento webhook Faceit', err);
    });
  });

  const server = app.listen(config.faceitWebhookPort, () => {
    logger.info(`Server webhook Faceit in ascolto sulla porta ${config.faceitWebhookPort}`);
  });

  /**
   * La porta occupata significa quasi sempre che il bot è già in esecuzione.
   *
   * Due processi con lo stesso token ricevono entrambi gli stessi eventi da
   * Discord ed eseguono entrambi le azioni: due canali per la stessa partita,
   * due schede della coda, giocatori contati due volte. Prima questo errore
   * veniva solo registrato e il secondo processo restava vivo a fare danni:
   * ora si ferma subito e lo dice chiaramente.
   */
  server.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
      logger.error('Server webhook Faceit: errore', err);
      return;
    }

    logger.error(
      `La porta ${config.faceitWebhookPort} è già occupata: un'altra istanza del bot è già in ` +
        'esecuzione. Questo processo si ferma per non duplicare code e partite. ' +
        'Controlla con "pm2 list" e "ps aux | grep node" che non ce ne siano due.',
    );
    process.exit(1);
  });

  return app;
}

async function handleEvent(client, body) {
  const eventType = body?.event;
  const payload = body?.payload;

  if (!eventType || !payload) {
    logger.warn('Webhook Faceit: payload malformato.', body);
    return;
  }

  logger.info(`Webhook Faceit ricevuto: ${eventType}`);

  if (CONFIGURING_EVENTS.includes(eventType)) {
    await voiceRouter.handleMatchConfiguring(client, payload);
    return;
  }

  if (FINISHED_EVENTS.includes(eventType)) {
    await voiceRouter.handleMatchFinished(client, payload);
    return;
  }
}

module.exports = { createWebhookServer };
