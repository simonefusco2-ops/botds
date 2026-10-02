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
 * Pannello "Come si gioca una partita IPL", pubblicato da /pannello-come-giocare.
 *
 * Racconta una partita dalla coda al voto, una fase per blocco. Se cambia una
 * regola del bot (tempi, ordine del draft, punti) va aggiornato anche qui.
 */
module.exports = {
  title: '🎮  𝐂𝐎𝐌𝐄 𝐒𝐈 𝐆𝐈𝐎𝐂𝐀 𝐔𝐍𝐀 𝐏𝐀𝐑𝐓𝐈𝐓𝐀',

  intro:
    'Dalla coda al risultato fa tutto il bot. Ecco cosa succede, passo per passo.\n' +
    '-# Per entrare nelle code registrati prima su **[ivpiter.it](https://ivpiter.it)**: ti dà l\'accesso alle **OPEN**.',

  steps: [
    {
      name: '1️⃣  CODA',
      value:
        'Quando le code sono **aperte** 🟢, nella sezione **IPL** premi **Entra in coda**.\n' +
        'La coda è **anonima**: si vede quanti siete, non chi. Al **decimo** giocatore parte la partita.',
    },
    {
      name: '2️⃣  CHECK-IN',
      value:
        'Ricevi un **DM** con il bottone per il vocale di check-in, e nasce la stanza privata della partita.\n' +
        'Entrate **tutti e dieci** nel vocale: si parte solo così.\n' +
        '-# Chi non si presenta può essere sostituito dallo staff dopo 7 minuti.',
    },
    {
      name: '3️⃣  CAPITANI',
      value:
        'I capitani sono i due con il **ruolo da capitano** più alto, poi conta l\'**ELO**.\n' +
        'Si sfidano a ✊✋✌️ **sasso carta forbici**: chi vince apre il draft.',
    },
    {
      name: '4️⃣  DRAFT',
      value:
        'I capitani scelgono i compagni con l\'ordine **1-2-2-2-1**: chi apre ne prende uno, ' +
        'poi due a testa, e chi apre chiude con l\'ultimo.\n' +
        '-# Se un capitano non sceglie in tempo, sceglie il bot.',
    },
    {
      name: '5️⃣  MAPPE E LATO',
      value:
        'A turno i capitani **bannano** le mappe finché ne resta una: si gioca lì.\n' +
        'Il capitano che **non** ha fatto l\'ultimo ban sceglie **attacco** o **difesa**.\n' +
        'Poi il bot vi sposta nelle **vocali delle squadre**.',
    },
    {
      name: '6️⃣  RISULTATO',
      value:
        'Finita la partita votate il vincitore sulla scheda: la prima squadra che arriva a **6 voti** vince.\n' +
        'Chi vince prende **+25 ELO**, chi perde **−25**.\n' +
        '-# Qualcuno ha quittato? Votate **Annulla partita**: a 6 voti si annulla e nessuno perde punti.',
    },
  ],

  rules:
    '### ⚠️  DA SAPERE\n' +
    '• Chi ha il ruolo **obbligo di clip** registra tutta la partita: gli altri possono chiedergli la clip.\n' +
    '• Chi crea la lobby su Valorant **abilita i replay**.\n' +
    '• Troll, abbandoni e comportamenti scorretti portano a **sospensioni** dalle code.',

  footer: 'Dubbi o problemi durante una partita? Tagga lo staff nel canale della partita.',
};
