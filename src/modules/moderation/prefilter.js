/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
const modConfig = require('../../../config/moderazione.config');

// Chi vuole aggirare il filtro scrive n3gr0 o n1gg@: si riportano alle lettere.
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

/** Minuscolo, senza accenti, con i numeri al posto delle lettere riportati a lettere. */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[013457@$]/g, (ch) => LEET[ch] || ch);
}

const words = (modConfig.prefilter.words || []).map((w) => new RegExp(`(?:^|[^a-z])(?:${w})(?=$|[^a-z])`, 'i'));

// "n e g r o", "n.e.g.r.o": le lettere della parola con qualsiasi separatore in
// mezzo, ma la parola deve finire lì. Schiacciare tutto il testo troverebbe
// "negro" anche dentro "negroni".
const squashed = (modConfig.prefilter.squashed || []).map(
  (w) => new RegExp(`(?:^|[^a-z])${[...w.toLowerCase()].join('[^a-z]*')}(?=$|[^a-z])`, 'i'),
);

/**
 * Le espressioni sospette trovate nel messaggio, o un array vuoto. Il testo si
 * controlla normalizzato; le parole più gravi anche spezzate da spazi o simboli.
 */
function scan(text) {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const plain = normalize(raw);
  const hits = new Set();

  words.forEach((re, i) => {
    if (re.test(plain)) hits.add(modConfig.prefilter.words[i]);
  });

  squashed.forEach((re, i) => {
    if (re.test(plain)) hits.add(modConfig.prefilter.squashed[i]);
  });

  return [...hits];
}

module.exports = { scan, normalize };
