const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0xff4655, // Valorant red
  success: 0x2ecc71,
  danger: 0xe74c3c,
  info: 0x5865f2,
  gold: 0xc9a227, // oro imperiale, usato per i pannelli ufficiali
};

const PANEL_DEFAULT_TITLE = '⚡  CURIA  ⚡';

const PANEL_DEFAULT_DESCRIPTION = [
  '*«Quod ad omnes pertinet, ab omnibus audiatur.»*',
  '-# Ciò che riguarda tutti, da tutti sia ascoltato.',
  '',
  '**Ogni richiesta trova udienza.** Scegli la materia qui sotto: verrà aperta una stanza',
  'privata, visibile soltanto a te e allo staff.',
].join('\n');

function buildTicketPanelEmbed({ types, title, description, imageRef, guild } = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(title || PANEL_DEFAULT_TITLE)
    .setDescription(description || PANEL_DEFAULT_DESCRIPTION);

  if (types?.length) {
    embed.addFields({
      name: '​',
      value: types.map((type) => `${type.emoji}  **${type.label}**\n-# ${type.description}`).join('\n\n'),
    });
  }

  if (imageRef) embed.setImage(imageRef);
  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ size: 256 }));

  embed.setFooter({ text: 'Il Senato risponde a ogni convocazione' });

  return embed;
}

function buildTicketControlEmbed(user, type) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setAuthor({ name: 'Pratica aperta', iconURL: user.displayAvatarURL() })
    .setTitle(`${type.emoji}  ${type.label}`)
    .setDescription(
      `Benvenuto ${user}, la tua richiesta è stata **registrata**.\n` +
        'Lo staff è stato convocato e ti risponderà in questa stanza.',
    )
    .addFields({ name: 'Cosa serve sapere', value: type.intro })
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: 'I bottoni qui sotto gestiscono la pratica' })
    .setTimestamp();

  return embed;
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

function buildNowPlayingEmbed(track) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: '🎶 Ora in riproduzione' })
    .setTitle(track.title)
    .setURL(track.url || null)
    .addFields(
      { name: 'Artista/Canale', value: track.author || 'Sconosciuto', inline: true },
      { name: 'Durata', value: track.duration || 'N/D', inline: true },
    );

  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  if (track.requestedBy) embed.setFooter({ text: `Richiesto da ${track.requestedBy.tag || track.requestedBy.username}` });

  return embed;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function discordTimestamp(date, style = 'f') {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

/** ms -> "3g 4h 12m", per la permanenza sul server. */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'N/D';

  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);

  const parts = [];
  if (days) parts.push(`${days}g`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);
  return parts.join(' ');
}

const INVITE_SOURCE_LABELS = {
  bot: 'Bot aggiunto tramite OAuth2',
  unknown: 'Non determinato (vanity URL, ricerca server o invito creato prima dell\'avvio del bot)',
};

function buildMemberJoinEmbed({ member, invite, inviterStats, memberCount }) {
  const createdAt = member.user.createdAt;
  const isNewAccount = Date.now() - createdAt.getTime() < SEVEN_DAYS_MS;

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '🟢 Nuovo membro', iconURL: member.user.displayAvatarURL() })
    .setTitle(member.user.tag)
    .setDescription(`${member} • \`${member.id}\``)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      {
        name: 'Account creato',
        value: `${discordTimestamp(createdAt, 'D')} (${discordTimestamp(createdAt, 'R')})`,
        inline: false,
      },
      { name: 'Membri totali', value: `${memberCount}`, inline: true },
    )
    .setTimestamp();

  if (invite.code) {
    embed.addFields({ name: 'Invito usato', value: `\`${invite.code}\``, inline: true });
  } else {
    embed.addFields({
      name: 'Invito usato',
      value: INVITE_SOURCE_LABELS[invite.source] || INVITE_SOURCE_LABELS.unknown,
      inline: false,
    });
  }

  if (invite.inviterId) {
    const stats = inviterStats ? ` — ${inviterStats.total} inviti (${inviterStats.stillIn} ancora nel server)` : '';
    embed.addFields({ name: 'Invitato da', value: `<@${invite.inviterId}>${stats}`, inline: false });
  }

  if (isNewAccount) {
    embed.addFields({
      name: '⚠️ Attenzione',
      value: 'Account Discord creato da meno di 7 giorni.',
      inline: false,
    });
  }

  return embed;
}

function buildMemberLeaveEmbed({ member, tracking, memberCount, roles }) {
  const joinedAt = tracking?.joined_at ? new Date(tracking.joined_at) : member.joinedAt;

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setAuthor({ name: '🔴 Membro uscito', iconURL: member.user.displayAvatarURL() })
    .setTitle(member.user.tag)
    .setDescription(`${member} • \`${member.id}\``)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields({ name: 'Membri totali', value: `${memberCount}`, inline: true })
    .setTimestamp();

  if (joinedAt) {
    embed.addFields(
      {
        name: 'Era entrato',
        value: `${discordTimestamp(joinedAt, 'D')} (${discordTimestamp(joinedAt, 'R')})`,
        inline: false,
      },
      { name: 'Permanenza', value: formatDuration(Date.now() - joinedAt.getTime()), inline: true },
    );
  }

  if (tracking?.inviter_id) {
    const code = tracking.invite_code ? ` con \`${tracking.invite_code}\`` : '';
    embed.addFields({ name: 'Era stato invitato da', value: `<@${tracking.inviter_id}>${code}`, inline: false });
  }

  if (roles?.length) {
    embed.addFields({ name: 'Ruoli', value: roles.slice(0, 20).join(' ').slice(0, 1024), inline: false });
  }

  return embed;
}

function buildInviteLeaderboardEmbed(rows, guildName) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📨 Classifica inviti')
    .setFooter({ text: guildName })
    .setTimestamp();

  if (!rows.length) {
    embed.setDescription('Nessun invito tracciato finora.');
    return embed;
  }

  const medals = ['🥇', '🥈', '🥉'];
  embed.setDescription(
    rows
      .map((row, i) => {
        const rank = medals[i] || `#${i + 1}`;
        return `${rank} <@${row.inviter_id}> — **${row.total}** inviti (${row.still_in} ancora nel server)`;
      })
      .join('\n'),
  );

  return embed;
}

function buildTwitchLiveEmbed({ stream, user }) {
  const embed = new EmbedBuilder()
    .setColor(0x9146ff)
    .setAuthor({
      name: `${stream.user_name || stream.user_login} è in diretta su Twitch!`,
      iconURL: user?.profile_image_url,
      url: `https://twitch.tv/${stream.user_login}`,
    })
    .setTitle(stream.title?.slice(0, 256) || 'Live')
    .setURL(`https://twitch.tv/${stream.user_login}`)
    .addFields(
      { name: 'Gioco', value: stream.game_name || 'N/D', inline: true },
      { name: 'Spettatori', value: `${stream.viewer_count ?? 0}`, inline: true },
    )
    .setFooter({ text: 'Twitch' })
    .setTimestamp(stream.started_at ? new Date(stream.started_at) : new Date());

  if (user?.profile_image_url) embed.setThumbnail(user.profile_image_url);

  const preview = stream.thumbnail_url?.replace('{width}', '1280').replace('{height}', '720');
  // Le anteprime Twitch hanno URL fisso: il parametro di cache-busting evita che
  // Discord mostri il fotogramma di una diretta precedente.
  if (preview) embed.setImage(`${preview}?t=${Date.now()}`);

  return embed;
}

module.exports = {
  COLORS,
  buildTwitchLiveEmbed,
  buildTicketPanelEmbed,
  buildTicketControlEmbed,
  buildLeaderboardEmbed,
  buildNowPlayingEmbed,
  buildMemberJoinEmbed,
  buildMemberLeaveEmbed,
  buildInviteLeaderboardEmbed,
  formatDuration,
};
