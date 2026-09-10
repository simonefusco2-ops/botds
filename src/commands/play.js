const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Riproduce un brano o una playlist da YouTube o Spotify')
    .addStringOption((opt) => opt.setName('query').setDescription('Link o nome del brano/playlist').setRequired(true)),
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
      const { track } = await client.player.play(voiceChannel, query, {
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
      await interaction.editReply(`🎶 Aggiunto alla coda: **${track.title}**`);
    } catch (err) {
      await interaction.editReply(`❌ Errore durante la riproduzione: ${err.message}`);
    }
  },
};
