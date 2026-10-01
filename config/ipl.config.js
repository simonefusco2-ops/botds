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
    'Per giocare bastano **due passaggi**, e nessuno dei due si chiede allo staff.',

  sections: [
    {
      name: '1️⃣  PRENDI I RUOLI SUL SITO',
      value:
        'Vai su **[ivpiter.it](https://ivpiter.it)** e accedi con il tuo **account Discord**.\n' +
        'Il sito legge il tuo rank e ti assegna **in automatico** i ruoli, compreso l\'accesso **IPL**.\n' +
        '-# Con il ruolo IPL compare la sezione IPL del server, con le stanze delle partite.',
    },
    {
      name: '2️⃣  VAI NELLA SEZIONE IPL E METTITI IN CODA',
      value:
        'Apri la sezione **IPL** del server: lì trovi il canale delle code della tua lega.\n' +
        'Quando le code sono **aperte** 🟢 premi **Entra in coda** e aspetta di essere in dieci.\n' +
        '-# Quando sono chiuse 🔴 il bottone non c\'è: le apre lo staff negli orari di gioco.',
    },
  ],

  leagues:
    '### 🏅  LE DUE LEGHE\n' +
    '🏆 **IPL PRO** — da **Immortale** in su. Livello alto, ritmo serio.\n' +
    '🎯 **IPL OPEN** — **aperta a tutti** gli altri rank.\n' +
    '-# In quale entri lo decide il rank letto dal sito: non si sceglie.',

  automatic:
    '### ⚡  I RUOLI ARRIVANO DA SOLI\n' +
    'Appena accedi al sito il ruolo di accesso — **Pro** oppure **Open** secondo il tuo rank — ' +
    'ti viene assegnato da solo. Non devi chiedere niente a nessuno.',

  closing:
    '## 🔥  POI SI GIOCA\n' +
    'Al decimo in coda il bot fa tutto: ti manda un DM, apre il check-in, fa scegliere squadre e ' +
    'mappa e prepara le stanze vocali.',

  footer: 'Problemi con il sito o con i ruoli? Apri un ticket: lo staff controlla a mano.',
};
