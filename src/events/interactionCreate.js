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
          return handleEmbedModalSubmit(interaction);
        }
        return;
      }

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case 'ticket_open':
            return ticketManager.createTicket(interaction);
          case 'ticket_close':
            return ticketManager.closeTicket(interaction);
          case 'ticket_transcript':
            return ticketManager.saveTranscript(interaction);
          case 'ticket_ping':
            return ticketManager.pingUser(interaction);
          default:
            return;
        }
      }
    } catch (err) {
      logger.error('Errore gestione interazione', err);
      const payload = { content: '⚠️ Si è verificato un errore durante l\'elaborazione della richiesta.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  },
};
