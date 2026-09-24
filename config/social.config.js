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
 * Vetrina dei social pubblicata da /social pannello.
 *
 * Ogni voce genera un bottone-link (massimo 5 per riga) e una sezione nella scheda.
 * `emoji` accetta anche le emoji personalizzate del server, nel formato <:nome:ID>.
 */
module.exports = {
  title: '📡  I SOCIAL DI IVPITER',

  intro:
    'Clip, annunci, tornei e dietro le quinte: seguici ovunque per non perdere nulla.\n' +
    'Ogni nuovo post viene annunciato anche qui sul server.',

  accounts: [
    {
      platform: 'x',
      label: 'X',
      handle: '@ivpiteresport',
      url: 'https://x.com/ivpiteresport',
      emoji: '𝕏',
      description: 'Annunci ufficiali, risultati e comunicazioni rapide.',
    },
    {
      platform: 'instagram',
      label: 'Instagram',
      handle: '@ivpiter_italia',
      url: 'https://www.instagram.com/ivpiter_italia',
      emoji: '📸',
      description: 'Foto del roster, grafiche dei match e storie dagli eventi.',
    },
    {
      platform: 'tiktok',
      label: 'TikTok',
      handle: '@ivpiter_italia',
      url: 'https://www.tiktok.com/@ivpiter_italia',
      emoji: '🎵',
      description: 'Le migliori clip, highlight e contenuti verticali.',
    },
  ],

  footer: 'Un follow costa nulla e ci aiuta a crescere. Ad maiora!',
};
