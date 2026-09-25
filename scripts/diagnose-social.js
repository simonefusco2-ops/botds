/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */

/**
 * Diagnostica dei feed social, da riga di comando: `npm run diagnose-social`.
 *
 * Dice per ogni feed cosa risponde davvero il server, quante voci contiene,
 * quali sono le più recenti e se il bot le considera già viste. Serve a
 * distinguere i tre casi che da Discord sembrano identici: il ponte RSS non
 * risponde, il feed risponde ma è vecchio, il feed è nuovo ma il bot lo ha già
 * annunciato.
 */
require('dotenv').config();
const Parser = require('rss-parser');
const config = require('../src/config');
const socialRepository = require('../src/database/repositories/socialRepository');
const { sortNewestFirst, itemId } = require('../src/modules/social/rssWatcher');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IvpiterBot/1.0)' },
});

function line(char = '─') {
  console.log(char.repeat(72));
}

async function rawResponse(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IvpiterBot/1.0)' },
    });
    const body = await response.text();
    return {
      status: response.status,
      type: response.headers.get('content-type') || '(nessuno)',
      ms: Date.now() - started,
      body,
    };
  } catch (err) {
    // fetch riassume tutto in "fetch failed": la causa vera sta annidata.
    const cause = err.cause?.message || err.cause?.code;
    return { error: cause ? `${err.message} (${cause})` : err.message, ms: Date.now() - started };
  }
}

async function diagnose(feed) {
  line();
  console.log(`${feed.platform.toUpperCase()}  ·  ${feed.label || '(senza etichetta)'}`);
  console.log(`URL       ${feed.feed_url}`);
  console.log(`Già visto ${feed.last_item_id || '(nessuno: il prossimo controllo si allinea in silenzio)'}`);
  line('·');

  const raw = await rawResponse(feed.feed_url);

  if (raw.error) {
    console.log(`❌ Il server non risponde: ${raw.error}`);
    console.log('   → il ponte RSS è giù o l\'indirizzo è sbagliato. Il bot non può farci niente.');
    return;
  }

  console.log(`HTTP ${raw.status} · ${raw.type} · ${raw.body.length} byte in ${raw.ms}ms`);

  if (raw.status !== 200) {
    console.log(`❌ Risposta non valida. Inizio del corpo:\n   ${raw.body.slice(0, 300).replace(/\s+/g, ' ')}`);
    return;
  }

  if (!/^\s*<\?xml|<rss|<feed/i.test(raw.body)) {
    console.log('❌ La risposta non è RSS/Atom (probabilmente una pagina HTML o un errore del ponte):');
    console.log(`   ${raw.body.slice(0, 300).replace(/\s+/g, ' ')}`);
    return;
  }

  let parsed;
  try {
    parsed = await parser.parseString(raw.body);
  } catch (err) {
    console.log(`❌ XML non interpretabile: ${err.message}`);
    return;
  }

  const original = parsed.items || [];
  const items = sortNewestFirst(original);

  console.log(`✅ Feed valido: "${parsed.title || '(senza titolo)'}" con ${items.length} voci.`);

  if (!items.length) {
    console.log('⚠️  Nessuna voce: il ponte risponde ma non sta restituendo post.');
    return;
  }

  if (itemId(original[0]) !== itemId(items[0])) {
    console.log('⚠️  Il feed elenca i post dal più vecchio: il bot li riordina per data.');
  }

  console.log('\nLe voci più recenti:');
  for (const item of items.slice(0, 3)) {
    console.log(`  · ${item.isoDate || item.pubDate || '(senza data)'}  ${(item.title || '').slice(0, 60)}`);
    console.log(`    id: ${itemId(item)}`);
  }

  const latestId = itemId(items[0]);

  console.log('');
  if (!feed.last_item_id) {
    console.log('➡️  Feed nuovo: il prossimo controllo memorizza questo stato SENZA annunciare.');
    console.log('    I post verranno annunciati dal successivo in poi.');
  } else if (feed.last_item_id === latestId) {
    console.log('➡️  Nessuna novità: il post più recente è quello già annunciato.');
    console.log('    Se hai appena pubblicato, il ponte RSS non si è ancora aggiornato: riprova fra qualche minuto.');
  } else {
    const known = items.findIndex((item) => itemId(item) === feed.last_item_id);
    const count = known === -1 ? 1 : known;
    console.log(`➡️  Ci sono ${count} post da annunciare: il prossimo controllo li pubblica.`);
  }
}

(async () => {
  const feeds = socialRepository.list();

  console.log('\nDIAGNOSTICA FEED SOCIAL — IVPITER\n');
  console.log(`Canale annunci   ${config.socialAnnounceChannelId || '❌ NON CONFIGURATO (SOCIAL_ANNOUNCE_CHANNEL_ID)'}`);
  console.log(`Tag              ${config.socialMention}`);
  console.log(`Controllo ogni   ${config.socialPollSeconds}s`);
  console.log(`Feed registrati  ${feeds.length}`);

  if (!feeds.length) {
    console.log('\n❌ Nessun feed registrato: aggiungine uno con /social aggiungi.\n');
    return;
  }

  for (const feed of feeds) await diagnose(feed);

  line();
  console.log('');
})();
