/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const ticketManager = require('../modules/tickets/ticketManager');
const {
  MODAL_CREATE,
  MODAL_EDIT,
  handleEmbedModalSubmit,
} = require('../modules/embedBuilder/embedBuilderService');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === MODAL_CREATE || interaction.customId === MODAL_EDIT) {
          await handleEmbedModalSubmit(interaction);
        }
        return;
      }

      // Ogni handler va atteso qui dentro: restituendo la promise senza await,
      // un errore sfuggirebbe al catch e l'utente non vedrebbe alcun messaggio.
      if (interaction.isButton()) {
        const [action, argument] = interaction.customId.split(':');

        switch (action) {
          case 'ticket_open':
            await ticketManager.createTicket(interaction, argument);
            return;
          case 'ticket_close':
            await ticketManager.closeTicket(interaction);
            return;
          case 'ticket_transcript':
            await ticketManager.saveTranscript(interaction);
            return;
          case 'ticket_ping':
            await ticketManager.pingUser(interaction);
            return;
          default:
            return;
        }
      }
    } catch (err) {
      logger.error('Errore gestione interazione', err);

      const payload = {
        content: `⚠️ Errore durante l'elaborazione: ${err.message || 'errore sconosciuto'}`,
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  },
};
