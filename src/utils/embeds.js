const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0xff4655, // Valorant red
  success: 0x2ecc71,
  danger: 0xe74c3c,
  info: 0x5865f2,
};

function buildTicketPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎫 Supporto Team')
    .setDescription(
      'Hai bisogno di assistenza dallo staff? Clicca il bottone qui sotto per aprire un ticket privato.',
    )
    .setFooter({ text: 'Il team staff risponderà al più presto.' });
  return { embed };
}

function buildTicketControlEmbed(user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🎫 Ticket Aperto')
    .setDescription(`Ciao ${user}, grazie per averci contattato.\nUno staff member ti risponderà a breve.`)
    .addFields({ name: 'Creato da', value: `${user}`, inline: true })
    .setTimestamp();
  return { embed };
}

function buildLeaderboardEmbed(rows) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🏆 Classifica In-House League')
    .setTimestamp();

  if (!rows.length) {
    embed.setDescription('Nessun dato disponibile. Gioca una partita Faceit per entrare in classifica!');
    return embed;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const description = rows
    .map((row, i) => {
      const rank = medals[i] || `#${i + 1}`;
      const winrate = row.matches_played > 0 ? ((row.wins / row.matches_played) * 100).toFixed(1) : '0.0';
      return `${rank} <@${row.discord_id}> — **${row.wins}** vittorie / ${row.matches_played} partite (${winrate}%)`;
    })
    .join('\n');

  embed.setDescription(description);
  return embed;
}

module.exports = { COLORS, buildTicketPanelEmbed, buildTicketControlEmbed, buildLeaderboardEmbed };
