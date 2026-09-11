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
 * Testo del regolamento pubblicato da /regolamento.
 *
 * Ogni voce di `rules` diventa un blocco separato da un divisore:
 *   emoji + name  -> titolo grande
 *   subtitle      -> riga piccola sotto il titolo
 *   text          -> corpo della regola
 */
module.exports = {
  title: '𝐈 𝐕 𝐏 𝐈 𝐓 𝐄 𝐑  —  𝐈𝐋 𝐑𝐄𝐆𝐎𝐋𝐀𝐌𝐄𝐍𝐓𝐎',
  intro: 'Qui si compete, si scherza e si cresce insieme.\n**Il rispetto è la base.**',

  rules: [
    {
      emoji: '⛔',
      name: 'I · DIGNITAS',
      subtitle: 'Tolleranza zero',
      text:
        'Vietati razzismo, antisemitismo e discriminazioni legate a origine, religione, genere o orientamento sessuale. ' +
        'Non sono ammessi incitamento all\'odio, simboli o contenuti discriminatori, nemmeno «per scherzo».',
    },
    {
      emoji: '🤝',
      name: 'II · CONCORDIA',
      subtitle: 'Rispetto reciproco',
      text:
        'Niente bullismo, minacce, molestie o attacchi personali. Il trash talk deve restare leggero e condiviso: ' +
        'se qualcuno chiede di fermarsi, ci si ferma. Vale in chat, in vocale e in partita.',
    },
    {
      emoji: '🔒',
      name: 'III · PRUDENTIA',
      subtitle: 'Contenuti e privacy',
      text:
        'Vietati contenuti pornografici, gore o deliberatamente disturbanti. Non condividere dati personali, ' +
        'conversazioni private o registrazioni altrui senza consenso.',
    },
    {
      emoji: '🧭',
      name: 'IV · ORDO',
      subtitle: 'Ordine nel server',
      text:
        'Usa i canali corretti. Evita spam, flood, menzioni inutili e rumori molesti. ' +
        'Pubblicità e inviti ad altri server richiedono il permesso dello staff, anche se inviati in privato ai membri.',
    },
    {
      emoji: '⚔️',
      name: 'V · HONOR',
      subtitle: 'Competizione leale',
      text:
        'Cheat, exploit intenzionali, truffe e sabotaggio delle partite non sono ammessi. ' +
        'Rispetta compagni, avversari e regole degli eventi. Segnala i sospetti allo staff senza lanciare accuse pubbliche.',
    },
    {
      emoji: '🛡️',
      name: 'VI · DISCIPLINA',
      subtitle: 'Staff e sanzioni',
      text:
        'Segui le indicazioni dei moderatori. Per chiarimenti o contestazioni, apri un ticket con toni civili.\n\n' +
        'Le violazioni comportano **richiamo**, **timeout** o **ban** in base a gravità e recidiva. ' +
        'Odio discriminatorio, minacce e doxing possono portare al ban immediato.',
    },
  ],

  footer: 'Il regolamento vale per tutti, staff compreso. Segnala i problemi senza alimentare lo scontro.',
};
