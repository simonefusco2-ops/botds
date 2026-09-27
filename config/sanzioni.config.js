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
 * Sanzioni della In-House League: sospensioni dalle code, rimborsi per troll e
 * l'avviso sull'obbligo di registrare le partite.
 *
 * Gli annunci di sospensioni e troll vanno nella stanza dei richiami: finché
 * `richiamiChannelId` è null il bot applica comunque la sanzione, e manda
 * l'avviso solo in DM a chi l'ha ricevuta.
 */
module.exports = {
  richiamiChannelId: null,

  // Durata massima di una sospensione, in giorni.
  maxDays: 365,

  troll: {
    // ELO tolto a chi ha trollato, dopo aver annullato la partita per tutti.
    penalty: 30,
    // ELO dato comunque ai vincitori: la partita l'hanno vinta, anche se falsata.
    winnerBonus: 10,
  },

  /**
   * Avviso pubblicato nel canale di ogni partita appena si apre, taggando i
   * dieci giocatori. Segnaposto nel testo: {partita}.
   */
  clip: {
    enabled: true,
    title: '🎥  OBBLIGO DI REGISTRAZIONE',
    text:
      'Ognuno di voi deve **registrare l\'intera partita**, dal primo all\'ultimo round, con ' +
      '**NVIDIA** (ShadowPlay / GeForce Experience / NVIDIA App) o **AMD** (Adrenalin / ReLive).\n\n' +
      '🔎 **Ogni giocatore ha il diritto di chiedere la clip** di una kill sospetta: chi la riceve ' +
      'deve fornirla allo staff.\n' +
      '⚠️ Chi non registra, o si rifiuta di consegnare la clip, può essere **sanzionato**.',
    footer: 'Partita #{partita} · Tenete la registrazione finché la partita non è chiusa e verificata',
  },
};
