/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ihlConfig = require('../../../config/ihl.config');
const logger = require('../../utils/logger');
const settingsRepository = require('../../database/repositories/settingsRepository');
const lobbyRepository = require('../../database/repositories/lobbyRepository');
const lobbyManager = require('./lobbyManager');
const { COLORS } = require('../../utils/embeds');
const leagues = require('./leagues');

const PANEL_KEY = 'ihl_panel_message';
const OPEN_KEY = 'ihl_queues_open';
const ANNOUNCE_KEY = 'ihl_announce_message';

// Ogni lega ricorda le sue cose: pannello, stato delle code, annunci.
const panelKey = (league) => leagues.settingsKey(PANEL_KEY, league.id);
const openKey = (league) => leagues.settingsKey(OPEN_KEY, league.id);

/**
 * Rinomina il canale senza aspettarla.
 *
 * Discord consente **due rinomine ogni dieci minuti per canale**: oltre quel
 * limite discord.js non fallisce, mette la richiesta in coda e resta in attesa
 * per minuti. Aspettandola, annuncio e scheda della coda partivano solo dopo —
 * cioè, all'atto pratico, non arrivavano. Il nome è un dettaglio estetico:
 * si aggiorna quando Discord lo permette, intanto il resto va avanti.
 */
function renameChannel(channel, league, open) {
  const name = leagues.channelName(league, open);

  // Niente richiesta se il nome è già quello: il limite non si spreca.
  if (channel.name === name) {
    logger.info(`IHL: canale già chiamato "${name}", rinomina non necessaria.`);
    return;
  }

  // Senza "Gestire i canali" su questo canale la richiesta partirebbe per
  // essere rifiutata: meglio dirlo chiaramente nei log.
  const me = channel.guild?.members?.me;
  if (me && !channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(
      `IHL: rinomina impossibile, al bot manca il permesso "Gestire i canali" su #${channel.name}.`,
    );
    return;
  }

  const started = Date.now();
  logger.info(`IHL: richiesta rinomina "${channel.name}" → "${name}".`);

  channel
    .setName(name)
    .then(() => logger.info(`IHL: canale rinominato in "${name}" dopo ${Math.round((Date.now() - started) / 1000)}s.`))
    .catch((err) =>
      logger.warn(
        `IHL: rinomina non riuscita dopo ${Math.round((Date.now() - started) / 1000)}s: ${err.message}. ` +
          'Discord ne consente due ogni dieci minuti per canale.',
      ),
    );
}

function isOpen(league) {
  return settingsRepository.get(openKey(league)) === '1';
}

/** Solo i ruoli elencati in configurazione possono aprire o chiudere. */
function canManage(member) {
  return ihlConfig.managerRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function buildPanel(league, open) {
  const embed = new EmbedBuilder()
    .setColor(open ? COLORS.success : COLORS.danger)
    .setTitle(`${open ? '🟢' : '🔴'}  ${league.name}  ·  CODE ${open ? 'APERTE' : 'CHIUSE'}`)
    .setDescription(
      open
        ? 'Le code sono **aperte**: entra in vocale e premi il bottone per metterti in lista.\n' +
            `Al raggiungimento di **${ihlConfig.queueSize} giocatori** partono capitani, ban delle mappe e draft.`
        : 'Le code sono **chiuse**. Lo staff le aprirà a breve: resta sintonizzato.',
    )
    .setFooter({ text: `In-House League · ${league.name}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ihl_toggle:${league.id}`)
      .setLabel(open ? 'Chiudi le code' : 'Apri le code')
      .setEmoji(open ? '🔒' : '🔓')
      .setStyle(open ? ButtonStyle.Danger : ButtonStyle.Success),
  );

  return { embeds: [embed], components: [row] };
}

async function publishPanel(interaction, league) {
  const channel = interaction.options.getChannel('canale') || interaction.channel;
  const payload = buildPanel(league, isOpen(league));

  const stored = settingsRepository.get(panelKey(league));
  const [storedChannelId, storedMessageId] = stored ? stored.split(':') : [];

  if (storedMessageId && storedChannelId === channel.id) {
    const existing = await channel.messages.fetch(storedMessageId).catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return interaction.reply({
        content: `✅ Pannello **${league.name}** aggiornato in ${channel}.`,
        ephemeral: true,
      });
    }
  }

  const sent = await channel.send(payload);
  settingsRepository.set(panelKey(league), `${channel.id}:${sent.id}`);

  return interaction.reply({
    content:
      `✅ Pannello **${league.name}** pubblicato in ${channel}.\n` +
      '-# Ogni lega ha il suo canale, la sua classifica e il suo ELO: tienile separate.',
    ephemeral: true,
  });
}

async function refreshPanel(client, league) {
  const stored = settingsRepository.get(panelKey(league));
  if (!stored) return;

  const [channelId, messageId] = stored.split(':');
  const channel = await client.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);
  await message?.edit(buildPanel(league, isOpen(league))).catch(() => {});
}

async function toggleQueues(client, interaction, leagueId) {
  if (!canManage(interaction.member)) {
    return interaction.reply({
      content: '⛔ Solo Developer, Owner e Staff possono aprire o chiudere le code.',
      ephemeral: true,
    });
  }

  const league = leagues.find(leagueId);
  const opening = !isOpen(league);
  settingsRepository.set(openKey(league), opening ? '1' : '0');

  await interaction.deferUpdate();
  await refreshPanel(client, league);

  const channel = interaction.channel;
  renameChannel(channel, league, opening);

  // Si riparte sempre da una coda sola: eventuali schede rimaste da prima
  // vengono chiuse ed eliminate, così nel canale non ne convivono due.
  await clearSessionMessages(client, channel);
  if (!opening) return;

  const lobby = lobbyManager.getOrCreateLobby(league.id, interaction.guildId, channel.id);
  await lobbyManager.renderQueue(client, lobby, { announce: true });
}

/**
 * Elimina ogni scheda della coda presente nel canale, guardando i messaggi veri
 * invece di fidarsi degli ID memorizzati.
 *
 * Il bot ricorda un solo messaggio per coda: se quel riferimento si perde — una
 * fetch fallita che fa ripubblicare la scheda, un riavvio a metà operazione, un
 * messaggio cancellato a mano — la scheda vecchia resta lì per sempre e il
 * canale finisce con due code visibili. Scorrendo i messaggi recenti le
 * troviamo comunque, da qualunque causa arrivino.
 *
 * Il pannello con il bottone e le cronache delle partite non si toccano.
 */
async function purgeQueueMessages(client, channel) {
  // I pannelli di tutte le leghe restano intoccabili, non solo quello in uso.
  const panelIds = leagues.all().map((league) => {
    const stored = settingsRepository.get(panelKey(league));
    return stored ? stored.split(':')[1] : null;
  });

  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!recent) return;

  for (const message of recent.values()) {
    if (message.author?.id !== client.user.id) continue;
    if (panelIds.includes(message.id)) continue;

    const embed = message.embeds?.[0];
    const isQueueCard =
      (embed?.footer?.text || '').startsWith('Coda #') || (embed?.title || '').includes('CODA IN FORMAZIONE');
    // Gli annunci separati non si mandano più, ma possono essere rimasti.
    const isAnnouncement = (message.content || '').includes('LE CODE SONO APERTE');

    if (!isQueueCard && !isAnnouncement) continue;

    await message.delete().catch(() => {});
  }
}

/**
 * Alla chiusura il canale torna pulito: restano solo il pannello con il bottone
 * e nient'altro. Una lobby già avviata non viene toccata, perché la partita in
 * corso deve poter arrivare al risultato anche a code chiuse.
 */
async function clearSessionMessages(client, channel) {
  // Gli annunci separati non si mandano più, ma uno vecchio può essere ancora lì.
  const announcementId = settingsRepository.get(ANNOUNCE_KEY);
  if (announcementId) {
    const announcement = await channel.messages.fetch(announcementId).catch(() => null);
    await announcement?.delete().catch(() => {});
    settingsRepository.set(ANNOUNCE_KEY, '');
  }

  // Spariscono tutte le code ancora in raccolta, anche quelle rimaste indietro:
  // nel canale non deve restarne nemmeno una. Le partite avviate non si toccano,
  // devono poter arrivare al risultato anche a code chiuse.
  for (const lobby of lobbyRepository.listActive()) {
    if (lobby.state !== 'queue' || lobby.channel_id !== channel.id) continue;
    lobbyRepository.update(lobby.id, { state: 'closed', message_id: null });
  }

  await purgeQueueMessages(client, channel);
}

module.exports = {
  publishPanel,
  refreshPanel,
  toggleQueues,
  clearSessionMessages,
  purgeQueueMessages,
  isOpen,
  canManage,
  PANEL_KEY,
  OPEN_KEY,
};
