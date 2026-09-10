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
const { buildTicketControlEmbed } = require('../../utils/embeds');

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

async function createTicket(interaction) {
  const guild = interaction.guild;
  const existing = ticketRepository.findOpenByOwner(guild.id, interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `⚠️ Hai già un ticket aperto: <#${existing.channel_id}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (config.staffRoleId) {
    overwrites.push({
      id: config.staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase().slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId || undefined,
    permissionOverwrites: overwrites,
    topic: `Ticket di ${interaction.user.id}`,
  });

  ticketRepository.create(channel.id, guild.id, interaction.user.id);

  const { embed } = buildTicketControlEmbed(interaction.user);
  await channel.send({
    content: `${interaction.user} ${config.staffRoleId ? `<@&${config.staffRoleId}>` : ''}`,
    embeds: [embed],
    components: [buildControlRow()],
  });

  await interaction.editReply({ content: `✅ Ticket creato: ${channel}` });
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

module.exports = { createTicket, closeTicket, saveTranscript, pingUser, buildControlRow };
