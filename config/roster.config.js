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
 * Roster pubblicati da /roster.
 *
 * Ogni divisione è una voce di `divisions`: la chiave finisce nel menu del comando.
 *  - players: nickname, nome reale, ruolo, biografia e link
 *  - staff:   coach, analyst, manager... mostrati in coda, senza numero
 * Un campo lasciato vuoto viene semplicemente omesso dalla scheda.
 */
module.exports = {
  divisions: {
    valorant: {
      label: 'Valorant',
      title: 'IL ROSTER · VALORANT',
      slogan: '**CINQUE IN CAMPO.**\n**UNA SOLA MAGLIA.**',

      players: [
        {
          nickname: 'xazy',
          realName: 'Alejandro Giudice',
          role: 'IGL · Founder',
          emoji: '🧠',
          bio:
            'Giocatore professionista da nove anni: inizia su CS e passa a VALORANT nel 2020, ' +
            'conquistando quattro titoli italiani con CyberGround Gaming, Yutoru e DSYRE/DSYRE Elevate ' +
            'e partecipando ad ASCENSION EMEA nel 2023. Fondatore di IVPITER, mette la propria esperienza ' +
            'al servizio del progetto e della crescita dei giocatori italiani.',
          links: [
            { emoji: '𝕏', label: '@xazyyyy', url: 'https://x.com/xazyyyy' },
            { emoji: '🟣', label: 'Twitch', url: 'https://www.twitch.tv/xazyy1y' },
          ],
        },
        {
          nickname: 'fraNdina',
          realName: 'Ezio Frandina',
          role: 'Flex',
          emoji: '🔄',
          bio:
            'Conosciuto anche come dupLe e Morphiius, è un veterano degli FPS italiani con oltre dieci anni ' +
            'di esperienza tra CrossFire, Point Blank e VALORANT. Ha vinto gli split Winter e Spring della ' +
            'Blooming Talents League 2025 e rappresentato l\'Italia nelle qualificazioni all\'Esports Nations ' +
            'Cup 2026: longevità, versatilità ed esperienza internazionale.',
          links: [{ emoji: '𝕏', label: '@fraNdina28', url: 'https://x.com/fraNdina28' }],
        },
        {
          nickname: 'Sweet',
          realName: 'Fabrizio Dolce',
          role: 'Initiator',
          emoji: '💥',
          bio:
            'Specializzato nel ruolo di initiator, con esperienza nei circuiti nazionali e internazionali. ' +
            'Vincitore della Source League Spring 2026 con i sardegnaenjoyers, ha conquistato il secondo posto ' +
            'nella Source League Summer 2026 con Abstract e nella Blooming Talents League Spring 2025 con i ' +
            'Fishing Rods. Oggi porta la sua passione nel roster di IVPITER.',
          links: [{ emoji: '𝕏', label: '@SweeetCS7', url: 'https://x.com/SweeetCS7' }],
        },
        {
          nickname: 'Jixey',
          realName: 'Marco Nardone',
          role: 'Controller',
          emoji: '🌫️',
          bio:
            'Talento emergente della scena italiana, sta costruendo il proprio percorso nel competitivo ' +
            'nazionale. Dopo le esperienze nella Blooming Talents League e il quarto posto nella Source League ' +
            'Spring 2026 con INPUTLAG, si presenta come un prospetto da seguire, con l\'obiettivo di ritagliarsi ' +
            'un posto tra i protagonisti della scena.',
          links: [{ emoji: '𝕏', label: '@JixeyVAL', url: 'https://x.com/JixeyVAL' }],
        },
        {
          nickname: 'Kaiser',
          realName: 'Nazareno Michele Frasca',
          role: 'Player',
          emoji: '⚔️',
          bio:
            'Conosciuto anche come Nade, è un talento emergente della scena italiana. Nel 2024 ha vestito la ' +
            'maglia degli Outplayed, proseguendo poi con DAWGS e REY eSports e maturando esperienza anche nelle ' +
            'competizioni internazionali. Un prospetto da seguire, con basi competitive su cui costruire il ' +
            'proprio futuro.',
          links: [{ emoji: '𝕏', label: '@NadeVL', url: 'https://x.com/NadeVL' }],
        },
      ],

      staff: [],

      footer: 'Ad maiora, legionari.',
    },

    cs: {
      label: 'Counter-Strike',
      title: 'IL ROSTER · COUNTER-STRIKE',
      slogan: '**CINQUE IN CAMPO.**\n**UNA SOLA MAGLIA.**',

      players: [
        { nickname: 'TBD', realName: '', role: 'Entry Fragger', emoji: '⚔️', bio: '', links: [] },
        { nickname: 'TBD', realName: '', role: 'AWPer', emoji: '🎯', bio: '', links: [] },
        { nickname: 'TBD', realName: '', role: 'Support', emoji: '🛡️', bio: '', links: [] },
        { nickname: 'TBD', realName: '', role: 'Lurker', emoji: '🌫️', bio: '', links: [] },
        { nickname: 'TBD', realName: '', role: 'IGL', emoji: '🧠', bio: '', links: [] },
      ],

      staff: [],

      footer: 'Ad maiora, legionari.',
    },
  },
};
