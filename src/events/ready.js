/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const config = require('../config');
const logger = require('../utils/logger');
const inviteTracker = require('../modules/memberLog/inviteTracker');
const twitchWatcher = require('../modules/twitch/twitchWatcher');
const rssWatcher = require('../modules/social/rssWatcher');
const ihlLobbyManager = require('../modules/ihl/lobbyManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot connesso come ${client.user.tag}`);

    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (guild) await inviteTracker.primeCache(guild);

    // I timer della IHL vivono in memoria: dopo un riavvio vanno riarmati.
    await ihlLobbyManager.resumeLobbies(client).catch((err) => {
      logger.error('Errore nel ripristino delle partite IHL', err);
    });

    twitchWatcher.start(client);
    rssWatcher.start(client);
  },
};
