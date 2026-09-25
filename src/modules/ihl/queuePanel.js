/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ihlConfig = require('../../../config/ihl.config');
const logger = require('../../utils/logger');
const settingsRepository = require('../../database/repositories/settingsRepository');
const lobbyRepository = require('../../database/repositories/lobbyRepository');
const lobbyManager = require('./lobbyManager');
const { COLORS } = require('../../utils/embeds');
const { toSmallCaps } = require('../../utils/smallCaps');

const PANEL_KEY = 'ihl_panel_message';
const OPEN_KEY = 'ihl_queues_open';
const ANNOUNCE_KEY = 'ihl_announce_message';

/** Nome del canale secondo lo stato, in maiuscoletto se richiesto dalla configurazione. */
function channelName(open) {
  const names = ihlConfig.queueChannelNames;
  const raw = open ? names.open : names.closed;
  return names.smallCaps ? toSmallCaps(raw) : raw;
}

/**
 * Rinomina il canale senza aspettarla.
 *
 * Discord consente **due rinomine ogni dieci minuti per canale**: oltre quel
 * limite discord.js non fallisce, mette la richiesta in coda e resta in attesa
 * per minuti. Aspettandola, annuncio e scheda della coda partivano solo dopo —
 * cioè, all'atto pratico, non arrivavano. Il nome è un dettaglio estetico:
 * si aggiorna quando Discord lo permette, intanto il resto va avanti.
 */
function renameChannel(channel, open) {
  const name = channelName(open);

  // Niente richiesta se il nome è già quello: il limite non si spreca.
  if (channel.name === name) return;

  channel
    .setName(name)
    .then(() => logger.info(`IHL: canale rinominato in ${name}.`))
    .catch((err) =>
      logger.warn(
        `IHL: rinomina canale non riuscita (${err.message}). ` +
          'Discord ne consente due ogni dieci minuti: il nome si aggiornerà al prossimo cambio.',
      ),
    );
}

function isOpen() {
  return settingsRepository.get(OPEN_KEY) === '1';
}

/** Solo i ruoli elencati in configurazione possono aprire o chiudere. */
function canManage(member) {
  return ihlConfig.managerRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function buildPanel(open) {
  const embed = new EmbedBuilder()
    .setColor(open ? COLORS.success : COLORS.danger)
    .setTitle(open ? '🟢  CODE APERTE' : '🔴  CODE CHIUSE')
    .setDescription(
      open
        ? 'Le code sono **aperte**: entra in vocale e premi il bottone per metterti in lista.\n' +
            `Al raggiungimento di **${ihlConfig.queueSize} giocatori** partono capitani, ban delle mappe e draft.`
        : 'Le code sono **chiuse**. Lo staff le aprirà a breve: resta sintonizzato.',
    )
    .setFooter({ text: 'In-House League · IVPITER' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ihl_toggle')
      .setLabel(open ? 'Chiudi le code' : 'Apri le code')
      .setEmoji(open ? '🔒' : '🔓')
      .setStyle(open ? ButtonStyle.Danger : ButtonStyle.Success),
  );

  return { embeds: [embed], components: [row] };
}

async function publishPanel(interaction) {
  const channel = interaction.options.getChannel('canale') || interaction.channel;
  const payload = buildPanel(isOpen());

  const stored = settingsRepository.get(PANEL_KEY);
  const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

  if (storedMessageId && storedChannelId === channel.id) {
    const existing = await channel.messages.fetch(storedMessageId).catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return interaction.reply({ content: `✅ Pannello code aggiornato in ${channel}.`, ephemeral: true });
    }
  }

  const sent = await channel.send(payload);
  settingsRepository.set(PANEL_KEY, `${channel.id}:${sent.id}`);
  return interaction.reply({ content: `✅ Pannello code pubblicato in ${channel}.`, ephemeral: true });
}

async function refreshPanel(client) {
  const stored = settingsRepository.get(PANEL_KEY);
  if (!stored) return;

  const [channelId, messageId] = stored.split(':');
  const channel = await client.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);
  await message?.edit(buildPanel(isOpen())).catch(() => {});
}

async function toggleQueues(client, interaction) {
  if (!canManage(interaction.member)) {
    return interaction.reply({
      content: '⛔ Solo Developer, Owner e Staff possono aprire o chiudere le code.',
      ephemeral: true,
    });
  }

  const opening = !isOpen();
  settingsRepository.set(OPEN_KEY, opening ? '1' : '0');

  await interaction.deferUpdate();
  await refreshPanel(client);

  const channel = interaction.channel;
  renameChannel(channel, opening);

  if (!opening) {
    await clearSessionMessages(client, channel);
    return;
  }

  const announcement = await channel.send({
    content:
      '@everyone\n' +
      '🟢 **LE CODE SONO APERTE!**\n' +
      'Entrate in un canale vocale se volete codare: il bot vi sposterà automaticamente ' +
      'nelle vocali delle due squadre quando il draft sarà completo.\n' +
      `Premete **Entra in coda** qui sotto — si parte a **${ihlConfig.queueSize} giocatori**.`,
    allowedMentions: { parse: ['everyone'] },
  });

  settingsRepository.set(ANNOUNCE_KEY, announcement.id);

  // La scheda della coda vive sotto l'annuncio, così è sempre l'ultimo messaggio utile.
  const lobby = lobbyManager.getOrCreateLobby(interaction.guildId, channel.id);
  await lobbyManager.renderQueue(client, lobby);
}

/**
 * Alla chiusura il canale torna pulito: restano solo il pannello con il bottone
 * e nient'altro. Una lobby già avviata non viene toccata, perché la partita in
 * corso deve poter arrivare al risultato anche a code chiuse.
 */
async function clearSessionMessages(client, channel) {
  const announcementId = settingsRepository.get(ANNOUNCE_KEY);
  if (announcementId) {
    const announcement = await channel.messages.fetch(announcementId).catch(() => null);
    await announcement?.delete().catch(() => {});
    settingsRepository.set(ANNOUNCE_KEY, '');
  }

  // Sparisce la coda ancora in raccolta; le partite avviate conservano il loro
  // avviso, perché devono poter arrivare al risultato anche a code chiuse, e il
  // riepilogo che ne prende il posto è la storia di cosa è successo.
  for (const lobby of lobbyRepository.listWithMessage(channel.id)) {
    if (lobby.state !== 'queue') continue;

    const card = await channel.messages.fetch(lobby.message_id).catch(() => null);
    await card?.delete().catch(() => {});

    lobbyRepository.update(lobby.id, { state: 'closed', message_id: null });
  }
}

module.exports = {
  publishPanel,
  refreshPanel,
  toggleQueues,
  clearSessionMessages,
  isOpen,
  canManage,
  PANEL_KEY,
  OPEN_KEY,
};
