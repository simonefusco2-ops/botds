/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { buildMention } = require('../modules/embedBuilder/embedBuilderService');
const logger = require('../utils/logger');

// Limiti dei sondaggi nativi di Discord: oltre, rifiuta l'intero messaggio.
const MAX_ANSWERS = 10;
const MAX_ANSWER_LENGTH = 55;
const MAX_HOURS = 768; // 32 giorni

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sondaggio')
    .setDescription('Pubblica un sondaggio di Discord, con la possibilità di taggare')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName('domanda').setDescription('La domanda del sondaggio').setRequired(true).setMaxLength(300),
    )
    .addStringOption((opt) =>
      opt
        .setName('risposte')
        .setDescription(`Le risposte separate da | (da 2 a ${MAX_ANSWERS}), es. Sì | No | Forse`)
        .setRequired(true)
        .setMaxLength(1000),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('durata')
        .setDescription(`Per quante ore resta aperto (default 24, massimo ${MAX_HOURS})`)
        .setMinValue(1)
        .setMaxValue(MAX_HOURS),
    )
    .addBooleanOption((opt) => opt.setName('multipla').setDescription('Si possono scegliere più risposte'))
    .addStringOption((opt) =>
      opt
        .setName('tagga')
        .setDescription('Tagga tutto il server sopra il sondaggio')
        .addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }),
    )
    .addMentionableOption((opt) => opt.setName('menziona').setDescription('Un ruolo o un utente da taggare'))
    .addChannelOption((opt) =>
      opt
        .setName('canale')
        .setDescription('Canale di destinazione (default: questo canale)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canale') || interaction.channel;
    const answers = interaction.options
      .getString('risposte', true)
      .split('|')
      .map((answer) => answer.trim())
      .filter(Boolean);

    if (answers.length < 2 || answers.length > MAX_ANSWERS) {
      return interaction.reply({
        content: `⚠️ Servono da 2 a ${MAX_ANSWERS} risposte, separate da \`|\`. Esempio: \`Sì | No | Forse\``,
        ephemeral: true,
      });
    }

    const tooLong = answers.find((answer) => answer.length > MAX_ANSWER_LENGTH);
    if (tooLong) {
      return interaction.reply({
        content: `⚠️ Ogni risposta può avere al massimo ${MAX_ANSWER_LENGTH} caratteri: «${tooLong.slice(0, 60)}…» è troppo lunga.`,
        ephemeral: true,
      });
    }

    const mentionable = interaction.options.get('menziona');
    const mention = buildMention({
      everyone: interaction.options.getString('tagga'),
      role: mentionable?.role?.id,
      user: mentionable?.user?.id,
    });

    await interaction.deferReply({ ephemeral: true });

    try {
      await channel.send({
        content: mention?.line,
        poll: {
          question: { text: interaction.options.getString('domanda', true) },
          answers: answers.map((text) => ({ text })),
          duration: interaction.options.getInteger('durata') || 24,
          allowMultiselect: interaction.options.getBoolean('multipla') || false,
        },
        allowedMentions: mention?.allowedMentions || { parse: [] },
      });
    } catch (err) {
      logger.error(`/sondaggio in ${channel.id} non pubblicato`, err);
      return interaction.editReply({
        content: `❌ Sondaggio non pubblicato: ${err.message}\n-# Il bot deve poter scrivere e creare sondaggi in ${channel}.`,
      });
    }

    return interaction.editReply({ content: `✅ Sondaggio pubblicato in ${channel}.` });
  },
};
