/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Riproduce un brano: scrivi il titolo oppure incolla un link YouTube/Spotify')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Titolo della canzone, oppure link a brano o playlist')
        .setRequired(true),
    ),
  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '⚠️ Devi essere connesso a un canale vocale per usare questo comando.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('query', true);

    try {
      // Un link va risolto dall'estrattore del suo servizio, ma il testo libero
      // va cercato esplicitamente su YouTube: in modalità automatica lo
      // intercetta l'estrattore Spotify, che sui titoli liberi non trova nulla.
      const isLink = /^https?:\/\//i.test(query);

      const results = await client.player.search(query, {
        requestedBy: interaction.user,
        searchEngine: isLink ? QueryType.AUTO : QueryType.YOUTUBE_SEARCH,
      });

      if (!results.hasTracks()) {
        return interaction.editReply(`🔍 Nessun risultato per **${query}**. Prova con titolo e artista.`);
      }

      const { track } = await client.player.play(voiceChannel, results, {
        nodeOptions: {
          metadata: { channel: interaction.channel },
          selfDeaf: true,
          volume: 70,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 300_000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 300_000,
        },
      });

      if (results.playlist) {
        return interaction.editReply(
          `🎶 Playlist **${results.playlist.title}** aggiunta alla coda (${results.tracks.length} brani).`,
        );
      }

      await interaction.editReply(`🎶 Aggiunto alla coda: **${track.title}** — ${track.author}`);
    } catch (err) {
      await interaction.editReply(`❌ Errore durante la riproduzione: ${err.message}`);
    }
  },
};
