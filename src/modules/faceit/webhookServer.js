const express = require('express');
const config = require('../../config');
const logger = require('../../utils/logger');
const voiceRouter = require('./voiceRouter');
const leaderboardManager = require('../leaderboard/leaderboardManager');

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

  app.listen(config.faceitWebhookPort, () => {
    logger.info(`Server webhook Faceit in ascolto sulla porta ${config.faceitWebhookPort}`);
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
    leaderboardManager.processMatchResult(payload);
    await leaderboardManager.updateLeaderboardMessage(client);
    await voiceRouter.handleMatchFinished(client, payload);
    return;
  }
}

module.exports = { createWebhookServer };
