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
 * Configurazione usata da /setup-channels: un embed per ogni canale target.
 * Gli ID dei canali vengono letti dalle variabili d'ambiente (vedi .env.example).
 */
module.exports = [
  {
    channelId: process.env.RULES_CHANNEL_ID,
    title: '📜 Regolamento del Team',
    color: 0xff4655,
    description: 'Benvenuto! Prima di partecipare alle IHL leggi attentamente le regole del team.',
    // Banner in alto: carica l'immagine in un canale Discord qualsiasi, tasto destro sull'immagine
    // inviata -> "Copia link", e incolla l'URL qui sotto (deve finire con .png/.jpg/.gif/.webp).
    image: null, // es. 'https://cdn.discordapp.com/attachments/xxx/yyy/banner-regole.png'
    thumbnail: null, // piccola icona in alto a destra (es. logo del team)
    fields: [
      { name: '1. Rispetto', value: 'Rispetta compagni e avversari in ogni momento.' },
      { name: '2. Puntualità', value: 'Presentati in voice almeno 10 minuti prima del match.' },
      { name: '3. Fair Play', value: 'Cheat, smurf e comportamenti tossici comportano il ban.' },
    ],
  },
  {
    channelId: process.env.ROSTER_CHANNEL_ID,
    title: '🎯 Roster Ufficiale',
    color: 0x5865f2,
    description: 'Composizione attuale del roster competitivo.',
    fields: [
      { name: 'Duelist', value: 'TBD', inline: true },
      { name: 'Initiator', value: 'TBD', inline: true },
      { name: 'Controller', value: 'TBD', inline: true },
      { name: 'Sentinel', value: 'TBD', inline: true },
      { name: 'Flex', value: 'TBD', inline: true },
    ],
  },
  {
    channelId: process.env.FACEIT_CHANNEL_ID,
    title: '🔗 Faceit Hub',
    color: 0xff5500,
    description:
      'Collega il tuo account Faceit con `/link <nome_faceit>` per partecipare alle IHL automatizzate.\n\n' +
      '[Vai alla Faceit Hub](https://www.faceit.com/)',
    fields: [],
  },
];
