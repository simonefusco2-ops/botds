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
const logger = require('../../utils/logger');

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM = [
  'Sei il moderatore di IVPITER, una community italiana di Valorant su Discord.',
  'Ricevi un messaggio segnalato da un filtro automatico di parole, insieme agli ultimi messaggi del canale.',
  'Il filtro è volutamente sensibile: la maggior parte dei messaggi che ricevi è innocua.',
  '',
  'Il server è informale. Sono NORMALI e vanno lasciati (verdetto "ok"):',
  '- parolacce, prese in giro e trash talk di gioco fra amici ("sei scarso", "ti ammazzo in ranked");',
  '- battute in cui il tono e il contesto mostrano che nessuno è offeso;',
  '- chi cita una parola per condannarla, chiedere se è vietata o raccontare cosa ha subito;',
  '- minacce palesemente iperboliche legate al gioco.',
  '',
  'Vanno ELIMINATI (verdetto "elimina"):',
  '- insulti razzisti o d\'odio rivolti a una persona o a un gruppo per etnia, nazionalità, religione,',
  '  orientamento sessuale, identità di genere o disabilità, anche se detti "per scherzo" contro qualcuno;',
  '- incitazione al suicidio o all\'autolesionismo, minacce credibili, molestie insistenti;',
  '- apologia del nazismo o di altri gruppi d\'odio;',
  '- qualsiasi contenuto sessuale che coinvolga minori, e altre violazioni gravi dei Termini di Discord.',
  '',
  'Se non sei sicuro, usa "dubbio": decide lo staff. Non eliminare mai per una parolaccia generica.',
  'Rispondi solo con il JSON richiesto. "motivo" è una frase breve in italiano per lo staff e per l\'utente.',
].join('\n');

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdetto: { type: 'STRING', enum: ['ok', 'dubbio', 'elimina'] },
    categoria: {
      type: 'STRING',
      enum: ['nessuna', 'razzismo', 'odio', 'omofobia', 'abilismo', 'minacce', 'autolesionismo', 'molestie', 'minori', 'altro'],
    },
    motivo: { type: 'STRING' },
  },
  required: ['verdetto', 'categoria', 'motivo'],
};

// La moderazione deve poter leggere l'odio: con i filtri di Google attivi la
// risposta verrebbe bloccata proprio sui messaggi che servono.
const SAFETY = ['HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(
  (category) => ({ category, threshold: 'BLOCK_NONE' }),
);

// Limite locale alle chiamate: il piano gratuito ne accetta poche al minuto.
const recent = [];
function takeSlot() {
  const cutoff = Date.now() - 60_000;
  while (recent.length && recent[0] < cutoff) recent.shift();
  if (recent.length >= modConfig.gemini.maxPerMinute) return false;
  recent.push(Date.now());
  return true;
}

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Chiede il verdetto a Gemini. Non lancia mai: se qualcosa va storto (niente
 * chiave, limite, rete, risposta bloccata) torna "dubbio" e il motivo, così il
 * messaggio passa allo staff invece di essere cancellato o ignorato.
 *
 * @param {{author: string, text: string}} target  il messaggio da giudicare
 * @param {{author: string, text: string}[]} context  i messaggi precedenti, dal più vecchio
 */
async function classify(target, context, hits) {
  if (!isConfigured()) return { verdetto: 'dubbio', categoria: 'altro', motivo: 'Gemini non configurato (GEMINI_API_KEY mancante).', fallback: true };
  if (!takeSlot()) return { verdetto: 'dubbio', categoria: 'altro', motivo: 'Troppi messaggi da analizzare in questo minuto.', fallback: true };

  const prompt =
    `Ultimi messaggi del canale (dal più vecchio):\n${context.map((m) => `[${m.author}] ${m.text}`).join('\n') || '(nessuno)'}\n\n` +
    `Messaggio da giudicare:\n[${target.author}] ${target.text}\n\n` +
    `Il filtro ha segnalato: ${hits.join(', ')}`;

  const { models } = modConfig.gemini;
  let last = null;
  for (const model of models) {
    const result = await ask(model, prompt);
    if (result.verdetto) return result;
    last = result;
    // Sovraccarico, limite, errore di Google o tempo scaduto: si prova il prossimo modello.
    // Gli altri errori (chiave sbagliata, richiesta rifiutata) non cambiano cambiando modello.
    if (!result.retry) break;
  }
  return { verdetto: 'dubbio', categoria: 'altro', motivo: last?.motivo || 'Gemini non disponibile.', fallback: true };
}

/** Una chiamata a un modello: il verdetto, oppure { motivo, retry } se non è arrivato. */
async function ask(model, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), modConfig.gemini.timeoutMs);

  const generationConfig = { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA };
  // Il ragionamento è ciò che rende lenti i modelli 3.x: per un sì/no basta il minimo.
  if (/^gemini-3/.test(model)) generationConfig.thinkingConfig = { thinkingLevel: 'minimal' };

  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        safetySettings: SAFETY,
        generationConfig,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // 404: il modello non esiste più o il nome è sbagliato. 429: limite del piano gratuito. 503: sovraccarico.
      logger.warn(`Moderazione: Gemini ha risposto ${res.status} (${model}): ${body.slice(0, 200)}`);
      return { motivo: `Gemini non disponibile (errore ${res.status}).`, retry: res.status === 404 || res.status === 429 || res.status >= 500 };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) {
      const reason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason || 'risposta vuota';
      return { motivo: `Gemini non ha dato un verdetto (${reason}).`, retry: true };
    }

    const parsed = JSON.parse(text);
    if (!['ok', 'dubbio', 'elimina'].includes(parsed.verdetto)) throw new Error(`verdetto non valido: ${parsed.verdetto}`);
    return { verdetto: parsed.verdetto, categoria: parsed.categoria || 'altro', motivo: String(parsed.motivo || '').slice(0, 300) };
  } catch (err) {
    logger.warn(`Moderazione: chiamata a Gemini fallita (${model}): ${err.message}`);
    return { motivo: 'Gemini non ha risposto in tempo.', retry: true };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { classify, isConfigured };
