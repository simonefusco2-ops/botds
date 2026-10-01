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
 * Moderazione automatica dei messaggi.
 *
 * Due passaggi. Prima un filtro locale e gratuito (`prefilter`) guarda ogni
 * messaggio: se non trova niente di sospetto il messaggio non esce dal server.
 * Solo i messaggi sospetti vanno a Gemini, con gli ultimi messaggi del canale,
 * che decide se è un insulto vero o uno scherzo:
 *   ok       → non succede niente
 *   dubbio   → il messaggio resta, lo staff decide dal canale dei log
 *   elimina  → messaggio cancellato e warn; al terzo warn timeout e ticket
 *
 * La chiave sta nel .env (GEMINI_API_KEY). Senza chiave il filtro funziona lo
 * stesso, ma ogni messaggio sospetto va allo staff come "dubbio".
 */
module.exports = {
  enabled: true,

  // Canale privato dello staff dove arrivano log, messaggi cancellati e dubbi.
  logChannelId: '1547745415934386217',

  // Stanza pubblica dei richiami: ogni warn viene annunciato qui, senza il
  // testo del messaggio cancellato (quello resta nei log privati).
  publicChannelId: '1553738245152448663',

  // Dove il bot non guarda: canali e categorie dello staff. I ticket sono
  // sempre esclusi, e così i messaggi dei ruoli qui sotto.
  excludedChannelIds: [],
  excludedCategoryIds: [],
  excludedRoleIds: [
    '1551594248053198858', // Developer
    '1547733990654484643', // Owner
    '1547733990235045978', // Staff IVPITER
  ],

  // Quanti messaggi precedenti del canale si mandano come contesto.
  contextSize: 10,

  gemini: {
    // Un solo modello: 3.5 Flash Lite, con il ragionamento al minimo. Si può
    // cambiare dal .env con GEMINI_MODEL. Se ne metti più d'uno, su 503/429 o
    // tempo scaduto si passa al successivo.
    models: [process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'],
    // Il piano gratuito ha un limite di richieste al minuto: oltre questo
    // numero il messaggio va allo staff come dubbio invece di aspettare.
    maxPerMinute: 15,
    // Di solito risponde in 1-4 secondi, ma sotto carico arriva a 15: oltre
    // questo tempo il messaggio va allo staff come dubbio.
    timeoutMs: 20000,
  },

  warns: {
    // Dopo quanti giorni un warn smette di contare (resta nello storico).
    expireDays: 30,
    // Al raggiungimento: timeout e ticket con la persona e lo staff.
    threshold: 3,
    timeoutHours: 24,
    // Ruolo per ogni livello di warn attivi: chi ne ha 1 prende "Warn 1", chi ne
    // ha 2 "Warn 2". Dal terzo resta "Warn 2" e si apre il ticket. Quando un
    // warn scade o viene revocato il ruolo scende da solo.
    roleIds: ['1553474640737865869', '1554932223289852044'],
    // Ruoli che possono usare i bottoni della decisione nel ticket e nei log.
    staffRoleIds: [
      '1551594248053198858', // Developer
      '1547733990654484643', // Owner
      '1547733990235045978', // Staff IVPITER
    ],
  },

  /**
   * Il filtro locale: espressioni cercate nel testo NORMALIZZATO (minuscolo,
   * senza accenti, con 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s). Scatta e basta: la
   * decisione la prende Gemini, quindi qui è meglio un falso allarme in più
   * che un insulto perso. `squashed` cerca anche nel testo senza spazi e
   * simboli ("n e g r o", "n.e.g.r.o"), solo per le parole più gravi.
   */
  prefilter: {
    words: [
      // razzismo ed etnia
      'negr[oiae]', 'negher', 'nigg?[ae]r?s?', 'nigg?az?', 'terron[ei]', 'polenton[ei]', 'zingar[oiae]',
      'muso giallo', 'scimmi[ae] (?:nera|negra)', 'torna(?:te)? al tuo paese', 'torna(?:te)? in africa',
      'sporco ebreo', 'ebre[oi] di merda', 'chink', 'beaner', 'wetback', 'raghead',
      // orientamento sessuale e genere
      'froci[oe]?', 'ricchion[ei]', 'culatton[ei]', 'finocchi[oi]', 'faggot', 'fag',
      'tranny', 'trann[ia]',
      // disabilità usate come insulto
      'mongoloide', 'handicappat[oiae]', 'ritardat[oiae]', 'retard(?:ed)?', 'spastic[oi]',
      // odio organizzato
      'heil hitler', 'sieg heil', '1488', 'gas (?:the|agli) [a-z]+', 'camer[ae] a gas', 'nazist[ai] di merda',
      // minacce e autolesionismo
      'kys', 'kill yourself', 'ammazzat[ie]', 'suicidat[ie]', 'impiccat[ie]', 'ti ammazzo',
      'ti uccido', 'ti vengo a prendere', 'so dove abiti',
      // minori e contenuti sessuali
      'pedofil[oi]', 'child porn', 'cp link',
    ],
    squashed: ['negro', 'negri', 'nigger', 'nigga', 'frocio', 'ricchione', 'heilhitler'],

    /**
     * Insulti che non possono essere uno scherzo: cancellati all'istante e
     * warn, senza aspettare Gemini. Stesso testo normalizzato di `words`.
     * Qui vanno solo frasi inequivocabili: per tutto il resto decide Gemini.
     */
    immediate: [
      { re: '(?:sporc|lurid|schifos|fottut)[oiae] (?:negr[oiae]|negher|zingar[oiae]|ebre[oi]|froci[oe]?|ricchion[ei])', categoria: 'razzismo' },
      { re: '(?:negr[oiae]|negher|nigg?[ae]r?s?|zingar[oiae]|ebre[oi]|terron[ei]) (?:di merda|del cazzo|schifos[oiae]|bastard[oiae]|maledett[oiae])', categoria: 'razzismo' },
      { re: '(?:froci[oe]?|ricchion[ei]|culatton[ei]|finocchi[oi]) (?:di merda|del cazzo|schifos[oiae]|bastard[oiae]|maledett[oiae])', categoria: 'omofobia' },
      { re: 'scimmi[ae] (?:nera|negra)|torna(?:te)? in africa', categoria: 'razzismo' },
      { re: 'heil hitler|sieg heil|gas (?:the|agli) [a-z]+|camer[ae] a gas', categoria: 'odio' },
    ],
  },
};
