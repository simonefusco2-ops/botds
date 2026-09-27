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
const logger = require('../utils/logger');

// Discord cancella al massimo 100 messaggi per richiesta, e solo quelli con
// meno di 14 giorni: i più vecchi vanno tolti a mano uno per uno.
const BATCH = 100;
const MAX = 1000;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Cancella gli ultimi messaggi di questo canale')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('quantita')
        .setDescription(`Quanti messaggi cancellare (1-${MAX})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX),
    )
    .addUserOption((opt) =>
      opt.setName('utente').setDescription('Solo i messaggi di questa persona (fra gli ultimi N)'),
    ),
  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel?.bulkDelete || channel.type === ChannelType.DM) {
      return interaction.reply({ content: '⚠️ Qui non posso cancellare messaggi.', ephemeral: true });
    }

    const amount = interaction.options.getInteger('quantita', true);
    const user = interaction.options.getUser('utente');

    // La cancellazione di tanti messaggi supera i 3 secondi concessi per rispondere.
    await interaction.deferReply({ ephemeral: true });

    let deleted = 0;
    let tooOld = 0;
    let scanned = 0;
    let before;

    try {
      // Si scorre il canale a blocchi di 100, dal più recente: con il filtro
      // per utente "gli ultimi N" sono gli ultimi N messaggi del canale.
      while (scanned < amount) {
        const batch = await channel.messages.fetch({ limit: Math.min(BATCH, amount - scanned), before });
        if (!batch.size) break;

        scanned += batch.size;
        before = batch.last().id;

        const now = Date.now();
        const targets = batch.filter((message) => !user || message.author.id === user.id);
        const fresh = targets.filter((message) => now - message.createdTimestamp < FOURTEEN_DAYS);
        tooOld += targets.size - fresh.size;

        if (fresh.size) {
          const removed = await channel.bulkDelete(fresh, true);
          deleted += removed.size;
        }

        if (batch.size < BATCH) break;
      }
    } catch (err) {
      logger.error(`/clear in ${channel.id} interrotto`, err);
      return interaction.editReply({
        content: `⚠️ Mi sono fermato dopo **${deleted}** messaggi: ${err.message}\n-# Serve il permesso **Gestisci messaggi**.`,
      });
    }

    logger.info(`/clear: ${interaction.user.tag} ha cancellato ${deleted} messaggi in #${channel.name}.`);

    return interaction.editReply({
      content:
        `🧹 Cancellati **${deleted}** messaggi` +
        (user ? ` di ${user}` : '') +
        '.' +
        (tooOld ? `\n-# ${tooOld} avevano più di 14 giorni: Discord non permette di cancellarli in blocco.` : ''),
    });
  },
};
