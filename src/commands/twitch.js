/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const twitchApi = require('../modules/twitch/twitchApi');
const twitchWatcher = require('../modules/twitch/twitchWatcher');
const twitchRepository = require('../database/repositories/twitchRepository');
const twitchConfig = require('../../config/twitch.config');

const GROUP_CHOICES = Object.entries(twitchConfig.groups).map(([value, group]) => ({ name: group.label, value }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Gestisce gli streamer Twitch da annunciare quando vanno in diretta')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('aggiungi')
        .setDescription('Aggiunge uno streamer alle notifiche')
        .addStringOption((opt) =>
          opt.setName('canale').setDescription('Nome del canale Twitch o link completo').setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('tipo')
            .setDescription('Streamer IPL: annuncio nel canale IPL, tag solo a IPL PRO e OPEN')
            .addChoices(...GROUP_CHOICES),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rimuovi')
        .setDescription('Rimuove uno streamer dalle notifiche')
        .addStringOption((opt) => opt.setName('canale').setDescription('Nome del canale Twitch').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('lista').setDescription('Mostra gli streamer monitorati'))
    .addSubcommand((sub) =>
      sub
        .setName('prova')
        .setDescription('Invia una notifica di prova per verificare canale e menzione')
        .addStringOption((opt) => opt.setName('canale').setDescription('Nome del canale Twitch').setRequired(true)),
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'lista') {
      const streamers = twitchRepository.list();
      if (!streamers.length) {
        return interaction.reply({
          content: '📭 Nessuno streamer monitorato. Aggiungine uno con `/twitch aggiungi`.',
          ephemeral: true,
        });
      }

      const list = streamers
        .map(
          (s) =>
            `• **${s.display_name || s.login}** (https://twitch.tv/${s.login}) · ${twitchWatcher.groupOf(s.category).label}` +
            (s.is_live ? ' 🔴 in diretta' : ''),
        )
        .join('\n');

      return interaction.reply({ content: `📺 Streamer monitorati:\n${list}`, ephemeral: true });
    }

    if (!twitchWatcher.isConfigured()) {
      return interaction.reply({
        content:
          '⚠️ Twitch non è configurato: servono `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET` nel file `.env`.',
        ephemeral: true,
      });
    }

    const login = twitchApi.normalizeLogin(interaction.options.getString('canale', true));
    await interaction.deferReply({ ephemeral: true });

    if (subcommand === 'rimuovi') {
      const removed = twitchRepository.remove(login);
      return interaction.editReply({
        content: removed
          ? `✅ **${login}** rimosso dalle notifiche.`
          : `⚠️ **${login}** non era nella lista.`,
      });
    }

    let user;
    try {
      user = await twitchApi.getUserByLogin(login);
    } catch (err) {
      return interaction.editReply({
        content: `❌ Errore nel contattare Twitch: ${err.response?.data?.message || err.message}`,
      });
    }

    if (!user) {
      return interaction.editReply({ content: `❌ Il canale Twitch \`${login}\` non esiste.` });
    }

    if (subcommand === 'aggiungi') {
      const category = interaction.options.getString('tipo') || 'generale';
      const group = twitchWatcher.groupOf(category);
      twitchRepository.add(login, user.display_name, interaction.user.id, category);
      return interaction.editReply({
        content:
          `✅ **${user.display_name}** aggiunto come **${group.label}**: riceverete una notifica a ogni sua diretta.` +
          `\n-# Annunci ${group.channelId ? `in <#${group.channelId}>` : 'nel canale annunci'}` +
          (group.roleIds?.length ? `, tag a ${group.roleIds.map((id) => `<@&${id}>`).join(' ')}.` : '.'),
      });
    }

    if (subcommand === 'prova') {
      await twitchWatcher.announce(
        client,
        {
          id: 'test',
          user_login: user.login,
          user_name: user.display_name,
          title: 'Notifica di prova — questa non è una diretta reale',
          game_name: 'VALORANT',
          viewer_count: 0,
          started_at: new Date().toISOString(),
        },
        user,
        twitchRepository.find(login)?.category || 'generale',
      );
      return interaction.editReply({ content: '✅ Notifica di prova inviata nel canale del suo gruppo.' });
    }
  },
};
