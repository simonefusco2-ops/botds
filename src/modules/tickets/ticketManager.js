/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');
const ticketRepository = require('../../database/repositories/ticketRepository');
const ticketTypes = require('../../../config/tickets.config');
const { buildTicketControlEmbed } = require('../../utils/embeds');

function resolveType(typeId) {
  return ticketTypes.find((type) => type.id === typeId) || ticketTypes[0];
}

function buildControlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Chiudi e Cancella Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId('ticket_transcript')
      .setLabel('Salva Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📄'),
    new ButtonBuilder()
      .setCustomId('ticket_ping')
      .setLabel('Ping Utente in DM')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📨'),
  );
}

/**
 * Crea la stanza del ticket e restituisce il canale.
 *
 * Separata da createTicket perché la pratica non nasce sempre da un bottone:
 * anche la verifica del rank ne apre una, e lì non c'è nessuna risposta da
 * modificare. Se l'utente ne ha già una aperta di quel tipo, torna quella.
 */
async function openTicketChannel(guild, user, botId, typeId) {
  const type = resolveType(typeId);

  const existing = ticketRepository.findOpenByOwnerAndType(guild.id, user.id, type.id);
  if (existing) {
    const channel = await guild.channels.fetch(existing.channel_id).catch(() => null);
    if (channel) return { channel, type, reused: true };

    // Il canale non c'è più: la pratica va chiusa, altrimenti resta un fantasma.
    ticketRepository.close(existing.channel_id);
  }

  const staffRoleId = type.staffRoleId || config.staffRoleId;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: botId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: `${type.id}-${user.username}`.toLowerCase().slice(0, 90),
    type: ChannelType.GuildText,
    parent: type.categoryId || config.ticketCategoryId || undefined,
    permissionOverwrites: overwrites,
    topic: `${type.label} — richiesta di ${user.id}`,
  });

  ticketRepository.create(channel.id, guild.id, user.id, type.id);

  await channel.send({
    content: `${user}${staffRoleId ? ` <@&${staffRoleId}>` : ''}`,
    embeds: [buildTicketControlEmbed(user, type)],
    components: [buildControlRow()],
  });

  return { channel, type, reused: false };
}

async function createTicket(interaction, typeId) {
  const type = resolveType(typeId);

  const existing = ticketRepository.findOpenByOwnerAndType(interaction.guild.id, interaction.user.id, type.id);
  if (existing) {
    return interaction.reply({
      content: `⚠️ Hai già una pratica aperta di tipo **${type.label}**: <#${existing.channel_id}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const { channel } = await openTicketChannel(
    interaction.guild,
    interaction.user,
    interaction.client.user.id,
    type.id,
  );

  await interaction.editReply({ content: `✅ Pratica **${type.label}** aperta: ${channel}` });
}

async function closeTicket(interaction) {
  const ticket = ticketRepository.findByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '⚠️ Questo canale non risulta essere un ticket attivo.', ephemeral: true });
  }

  await interaction.reply({ content: '🔒 Chiusura del ticket in corso... il canale verrà eliminato a breve.' });
  ticketRepository.close(interaction.channel.id);

  setTimeout(() => {
    interaction.channel.delete('Ticket chiuso').catch((err) => logger.error('Errore eliminazione canale ticket', err));
  }, 5000);
}

async function saveTranscript(interaction) {
  const ticket = ticketRepository.findByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '⚠️ Questo canale non risulta essere un ticket attivo.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();
  const lines = sorted.map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`);
  const content = lines.join('\n') || 'Nessun messaggio trovato.';

  const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), {
    name: `transcript-${interaction.channel.name}.txt`,
  });

  if (config.transcriptChannelId) {
    const transcriptChannel = await interaction.guild.channels.fetch(config.transcriptChannelId).catch(() => null);
    if (transcriptChannel) {
      await transcriptChannel.send({
        content: `📄 Transcript di ${interaction.channel.name} (ticket di <@${ticket.owner_id}>)`,
        files: [attachment],
      });
    }
  }

  await interaction.editReply({ content: '✅ Transcript salvato.', files: [attachment] });
}

async function pingUser(interaction) {
  const ticket = ticketRepository.findByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '⚠️ Questo canale non risulta essere un ticket attivo.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const owner = await interaction.client.users.fetch(ticket.owner_id);
    await owner.send(`📨 Lo staff richiede la tua attenzione nel tuo ticket: ${interaction.channel.url}`);
    await interaction.editReply({ content: "✅ DM inviato all'utente." });
  } catch {
    await interaction.editReply({ content: "⚠️ Impossibile inviare il DM (l'utente potrebbe avere i DM disattivati)." });
  }
}

module.exports = {
  openTicketChannel,
  createTicket,
  closeTicket,
  saveTranscript,
  pingUser,
  buildControlRow,
};
