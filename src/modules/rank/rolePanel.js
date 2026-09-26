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
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const ruoliConfig = require('../../../config/ruoli.config');
const rankConfig = require('../../../config/rank.config');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');
const { buildCard } = require('../../utils/cards');
const { applyEmoji } = require('../../utils/emoji');
const iplAccess = require('./iplAccess');
const notify = require('./notify');

/**
 * Pannello "Richiesta rank e ruoli".
 *
 * I ruoli di gioco se li assegna ognuno da solo con i bottoni. Il rank invece
 * passa da una verifica: si incolla il link tracker.gg in una finestra, il bot
 * legge il rank e — sotto la soglia — assegna subito; sopra apre una pratica
 * dove decide lo staff.
 */
const MODAL_ID = 'rank_modal';

/**
 * Il nome della soglia, già in grassetto e con la sua icona.
 *
 * Va inserito in frasi che NON aggiungono altri asterischi attorno: due
 * grassetti annidati (`**Sotto **Ascendente****`) Discord non li chiude, e il
 * testo esce con gli asterischi in mezzo alle parole.
 */
function rankLabel() {
  const rank = rankConfig.ranks.find((entry) => entry.name === rankConfig.approvalFrom);
  if (!rank) return `**${rankConfig.approvalFrom}**`;

  return `${rank.emoji} **${rank.name}**`;
}

function buildRoleRow() {
  return new ActionRowBuilder().addComponents(
    ruoliConfig.roles.slice(0, 5).map((role) =>
      applyEmoji(
        new ButtonBuilder()
          .setCustomId(`rank_role:${role.id}`)
          .setLabel(role.label)
          .setStyle(ButtonStyle.Secondary),
        role.emoji,
      ),
    ),
  );
}

function buildRankRow() {
  return new ActionRowBuilder().addComponents(
    applyEmoji(
      new ButtonBuilder()
        .setCustomId('rank_check')
        .setLabel(ruoliConfig.button.label)
        .setStyle(ButtonStyle.Success),
      ruoliConfig.button.emoji,
    ),
  );
}

/** La scheda completa: banner in cima, ruoli, rank e i due gruppi di bottoni. */
function buildPanel(bannerRef) {
  const body = ruoliConfig.rankBody
    .replaceAll('{soglia}', rankLabel())
    .replaceAll('{sito}', `[${rankConfig.tracker.name}](${rankConfig.tracker.profileUrl})`)
    .replaceAll('{esempio}', rankConfig.tracker.example);

  return buildCard({
    accentColor: COLORS.gold,
    bannerRef,
    title: ruoliConfig.title,
    body: ruoliConfig.intro,
    sections: [
      { name: ruoliConfig.rolesHeading.replace('### ', ''), value: ruoliConfig.rolesBody },
      { name: ruoliConfig.rankHeading.replace('### ', ''), value: body },
    ],
    separateSections: true,
    footnote: ruoliConfig.footer,
    rows: [buildRoleRow(), buildRankRow()],
  });
}

/** Il bottone di un ruolo di gioco: lo mette se non ce l'hai, lo toglie se ce l'hai. */
async function toggleRole(interaction, roleKey) {
  const entry = ruoliConfig.roles.find((role) => role.id === roleKey);
  if (!entry) {
    return interaction.reply({ content: '⚠️ Questo ruolo non esiste più nella configurazione.', flags: MessageFlags.Ephemeral });
  }

  const role =
    interaction.guild.roles.cache.get(entry.roleId) ||
    (await interaction.guild.roles.fetch(entry.roleId).catch(() => null));

  if (!role) {
    logger.warn(`Ruoli: il ruolo ${entry.roleId} (${entry.label}) non esiste nel server.`);
    return interaction.reply({
      content: `⚠️ Il ruolo **${entry.label}** non esiste più: avvisa lo staff.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const has = interaction.member.roles.cache.has(role.id);
  let member = interaction.member;

  // L'evento sui ruoli arriva subito dopo la modifica: zittiamo l'avviso in
  // privato prima di toccare qualcosa, perché qui la risposta a schermo dice già
  // tutto e un DM identico sarebbe solo rumore.
  notify.silence(member.id);

  try {
    // add/remove restituiscono il membro già aggiornato: usiamo quello per la
    // lista dei requisiti, invece di fidarci della cache di prima del clic.
    member = has ? await member.roles.remove(role) : await member.roles.add(role);
  } catch (err) {
    logger.warn(`Ruoli: ${entry.label} non assegnato a ${interaction.user.id}: ${err.message}`);
    return interaction.reply({
      content:
        `⚠️ Non riesco a modificare **${entry.label}**: il ruolo del bot deve stare **più in alto** di quello.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Il ruolo di gioco è metà dei requisiti: l'accesso IPL va ricalcolato subito.
  await iplAccess.sync(member);

  // La risposta arriva sulla stessa schermata del pannello: qui la lista dei due
  // passi serve più che in DM, perché è il momento in cui la persona sta ancora
  // guardando i bottoni e può sistemare quello che manca.
  return interaction.reply({
    content:
      (has ? `➖ Ruolo **${entry.label}** rimosso.` : `➕ Ruolo **${entry.label}** assegnato.`) +
      '\n\n' +
      iplAccess.checklist(member),
    flags: MessageFlags.Ephemeral,
  });
}

/** La finestra dove si incolla il link del tracker. */
function buildModal() {
  return new ModalBuilder()
    .setCustomId(MODAL_ID)
    .setTitle('Verifica del rank')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('tracker')
          .setLabel('Link del tuo profilo tracker.gg')
          .setPlaceholder(rankConfig.tracker.example)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(300),
      ),
    );
}

module.exports = { MODAL_ID, buildPanel, buildRoleRow, buildRankRow, buildModal, toggleRole };
