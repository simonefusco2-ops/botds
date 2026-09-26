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
 * Pannello "Come partecipare alle IPL", pubblicato da /pannello-ipl.
 *
 * Spiega i due requisiti e le due leghe. I segnaposto vengono riempiti dal
 * comando con i dati veri, così se cambi un ruolo o un'emoji il testo resta
 * allineato da solo:
 *   {ruoli}   l'elenco dei ruoli di gioco con le loro emoji
 *   {canale}  il canale dove si fa la richiesta
 *   {soglia}  il rank da cui si entra nella Pro
 */
module.exports = {
  title: '🎟️  𝐂𝐎𝐌𝐄 𝐏𝐀𝐑𝐓𝐄𝐂𝐈𝐏𝐀𝐑𝐄 𝐀𝐋𝐋𝐄 𝐈𝐏𝐋',

  intro:
    'Le **IPL** sono le nostre partite 5v5 organizzate dal bot: code, squadre, mappe ed ELO.\n' +
    'Per entrarci servono **due cose**, nessuna delle quali si chiede allo staff: arrivano da sole.',

  sections: [
    {
      name: '1️⃣  VERIFICA IL TUO RANK',
      value:
        'Vai in {canale} e incolla il link del tuo profilo **tracker.gg**.\n' +
        'Il bot legge il rank e ti assegna il ruolo corrispondente.\n' +
        '-# Sotto {soglia} è immediato; da lì in su la richiesta passa dallo staff.',
    },
    {
      name: '2️⃣  SCEGLI I TUOI RUOLI DI GIOCO',
      value:
        'Sempre in {canale}, prendi almeno uno di questi:\n{ruoli}\n' +
        '-# Puoi prenderne più di uno: servono ai capitani per bilanciare le squadre nel draft.',
    },
  ],

  leagues:
    '### 🏅  LE DUE LEGHE\n' +
    '🏆 **IPL PRO** — da **Immortale** in su. Livello alto, ritmo serio.\n' +
    '🎯 **IPL OPEN** — **aperta a tutti** gli altri rank, purché verificati.\n' +
    '-# In quale entri lo decide il rank che hai verificato: non si sceglie.',

  automatic:
    '### ⚡  L\'ACCESSO ARRIVA DA SOLO\n' +
    'Appena hai **un rank verificato** e **almeno un ruolo di gioco**, il bot ti assegna ' +
    'da solo il ruolo di accesso — Pro oppure Open secondo il tuo rank. Non devi chiedere niente.\n' +
    '-# Se togli il ruolo di gioco l\'accesso si toglie; se sali a Immortale passi da Open a Pro.',

  closing:
    '## 🔥  POI SI GIOCA\n' +
    'Con l\'accesso in mano entra nel canale delle code, premi **Entra in coda** e aspetta i dieci. ' +
    'Al decimo il bot fa tutto: check-in, squadre, mappa e stanze.',

  footer: 'Problemi con la verifica? Apri un ticket: lo staff controlla a mano.',
};
