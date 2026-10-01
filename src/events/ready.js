/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { Events } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');
const inviteTracker = require('../modules/memberLog/inviteTracker');
const twitchWatcher = require('../modules/twitch/twitchWatcher');
const rssWatcher = require('../modules/social/rssWatcher');
const ihlLobbyManager = require('../modules/ihl/lobbyManager');
const separators = require('../modules/separators/separators');
const moderation = require('../modules/moderation/moderation');

module.exports = {
  // In discord.js 14.22+ l'evento si chiama clientReady: 'ready' è deprecato.
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Bot connesso come ${client.user.tag}`);

    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (guild) await inviteTracker.primeCache(guild);

    // I timer della IHL vivono in memoria: dopo un riavvio vanno riarmati.
    await ihlLobbyManager.resumeLobbies(client).catch((err) => {
      logger.error('Errore nel ripristino delle partite IHL', err);
    });
    await ihlLobbyManager.pruneQueues(client).catch((err) => {
      logger.error('Errore nel ripulire le code IHL', err);
    });

    // I ruoli Warn 1/2 scendono da soli quando i warn scadono: controllo ogni ora.
    moderation.startRoleSweep(client, guild);

    // Senza await: su tutto il server richiede tempo, e il resto non deve aspettare.
    if (guild) {
      separators.syncAll(guild).catch((err) => logger.error('Errore nei separatori all\'avvio', err));
    }

    twitchWatcher.start(client);
    rssWatcher.start(client);
  },
};
