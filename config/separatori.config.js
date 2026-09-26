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
 * Ruoli separatori: le intestazioni che dividono la lista dei ruoli nel profilo.
 *
 * Quelli in `everyone` li ha ogni membro del server, da subito e a prescindere
 * da rank e ruoli di gioco. Il separatore staff lo ha solo chi ha almeno uno
 * dei `staff.roleIds`, e viene tolto a chi li perde.
 *
 * Il ruolo del bot deve stare SOPRA tutti i separatori, o Discord rifiuta.
 */
module.exports = {
  everyone: [
    { name: 'Separatore community', roleId: '1553405950826778684' },
    { name: 'Separatore rank', roleId: '1553403291013218425' },
    { name: 'Separatore ruoli', roleId: '1553351503027376210' },
  ],

  staff: {
    // ID del separatore staff: finché è null il bot non lo assegna.
    roleId: null,
    // Chi ha almeno uno di questi ruoli riceve il separatore staff.
    roleIds: [
      '1551594248053198858', // Developer
      '1547733990654484643', // Owner
      '1547733990235045978', // Staff IVPITER
    ],
  },
};
