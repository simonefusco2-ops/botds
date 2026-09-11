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
      // QueryType.AUTO: un link viene aperto direttamente, il testo libero
      // viene cercato (i brani Spotify vengono comunque riprodotti da YouTube).
      const results = await client.player.search(query, {
        requestedBy: interaction.user,
        searchEngine: QueryType.AUTO,
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
