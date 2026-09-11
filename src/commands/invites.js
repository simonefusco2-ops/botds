const { SlashCommandBuilder } = require('discord.js');
const memberTrackingRepository = require('../database/repositories/memberTrackingRepository');
const { buildInviteLeaderboardEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inviti')
    .setDescription('Mostra la classifica degli inviti o gli inviti di un singolo utente')
    .addUserOption((opt) => opt.setName('utente').setDescription('Mostra solo gli inviti di questo utente')),
  async execute(interaction) {
    const target = interaction.options.getUser('utente');

    if (target) {
      const stats = memberTrackingRepository.countByInviter(target.id);
      return interaction.reply({
        content:
          `📨 ${target} ha invitato **${stats.total}** membri ` +
          `(${stats.stillIn} ancora nel server, ${stats.total - stats.stillIn} usciti).`,
      });
    }

    const rows = memberTrackingRepository.topInviters(10);
    const embed = buildInviteLeaderboardEmbed(rows, interaction.guild.name);
    return interaction.reply({ embeds: [embed] });
  },
};
