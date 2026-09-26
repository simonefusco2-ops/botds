/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const ruoliConfig = require('../../../config/ruoli.config');
const iplAccess = require('./iplAccess');

/**
 * L'avviso che parte quando i ruoli di qualcuno cambiano da fuori: lo staff che
 * assegna un rank a mano, un altro bot, una sincronizzazione.
 *
 * Dal pannello e dalle pratiche il messaggio lo manda già chi fa l'operazione,
 * con la risposta sotto gli occhi della persona: quelle strade chiamano `silence`
 * e qui non scriviamo due volte la stessa cosa.
 */
const FINESTRA_MS = 60_000;
const recenti = new Map();

/** «Ho già avvisato io»: vale per un minuto, il tempo dell'evento sui ruoli. */
function silence(memberId) {
  recenti.set(memberId, Date.now());
}

function muted(memberId) {
  const quando = recenti.get(memberId);
  if (!quando) return false;

  if (Date.now() - quando > FINESTRA_MS) {
    recenti.delete(memberId);
    return false;
  }

  return true;
}

/** Fotografia dei requisiti, da confrontare prima e dopo il cambio di ruoli. */
function snapshot(member) {
  const { league, rank, games } = iplAccess.entitlement(member);

  return { league, rank: rank?.name || null, games: games.map((game) => game.id).sort().join(',') };
}

function send(member, content) {
  return member
    .send({ content })
    .then(() => true)
    .catch(() => false);
}

/**
 * Confronta prima e dopo e avvisa in privato solo quando è cambiato qualcosa
 * che la persona deve sapere.
 *
 * @returns {Promise<string|null>} il tipo di avviso mandato, per i log e i test
 */
async function announce(member, before) {
  if (!member || member.user?.bot) return null;

  const after = snapshot(member);
  if (before.league === after.league && before.rank === after.rank && before.games === after.games) {
    return null;
  }

  if (muted(member.id)) return null;

  const lista = iplAccess.checklist(member);
  const ruoli = ruoliConfig.roles.map((role) => role.label).join(' / ');

  // Accesso appena aperto: è la notizia buona, e chiude il discorso.
  if (after.league && !before.league) {
    await send(
      member,
      `🎟️ **Accesso IPL ${after.league.toUpperCase()} attivo!**\n` +
        'Hai entrambi i requisiti: puoi entrare nelle code.\n\n' +
        lista,
    );

    return 'accesso';
  }

  // Accesso perso: meglio dirglielo subito, non quando prova a codare.
  if (before.league && !after.league) {
    await send(
      member,
      '🔒 **Accesso IPL sospeso.**\n' +
        `Ti manca ${iplAccess.missing(member).join(' e ')}: rimettilo in ${iplAccess.panelLink()} e torni dentro.\n\n` +
        lista,
    );

    return 'sospeso';
  }

  // Rank arrivato (spesso assegnato a mano dallo staff) ma manca il Passo 1:
  // è il caso che la gente non capisce, quindi lo diciamo a chiare lettere.
  if (after.rank && after.rank !== before.rank && !after.league) {
    await send(
      member,
      `📊 **Rank aggiornato: ${after.rank}**\n` +
        `⚠️ **Non basta.** Per le IPL serve anche **un ruolo di gioco** (${ruoli}): ` +
        `prendilo in ${iplAccess.panelLink()} e l'accesso arriva da solo.\n\n` +
        lista,
    );

    return 'manca-ruolo';
  }

  // Ruolo di gioco preso da fuori, ma senza rank verificato.
  if (after.games && after.games !== before.games && !after.rank) {
    await send(
      member,
      '🎮 **Ruolo di gioco aggiornato.**\n' +
        `⚠️ Ti manca il **rank verificato**: fallo in ${iplAccess.panelLink()} col link del tuo tracker.gg.\n\n` +
        lista,
    );

    return 'manca-rank';
  }

  return null;
}

module.exports = { announce, snapshot, silence, muted, FINESTRA_MS };
