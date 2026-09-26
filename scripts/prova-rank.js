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
 * Prova la lettura del rank da riga di comando, senza passare da Discord:
 *
 *   npm run prova-rank -- "https://tracker.gg/valorant/profile/riot/Nome%23TAG/overview"
 *
 * Serve a capire se il servizio risponde e se la chiave è giusta, prima di
 * scoprirlo davanti a un giocatore che aspetta.
 */
require('dotenv').config();
const rankConfig = require('../config/rank.config');
const config = require('../src/config');
const trackerLink = require('../src/modules/rank/trackerLink');
const rankProvider = require('../src/modules/rank/rankProvider');

(async () => {
  const input = process.argv[2];

  if (!input) {
    console.error('Uso: npm run prova-rank -- "<link tracker.gg oppure Nome#TAG>"');
    process.exit(1);
  }

  const tracker = trackerLink.parse(input) || (input.includes('#')
    ? { riotId: input, name: input.split('#')[0], tag: input.split('#').pop() }
    : null);

  if (!tracker) {
    console.error(`❌ Non riesco a ricavare un Riot ID da: ${input}`);
    console.error(`   Atteso un link come ${rankConfig.tracker.example}, oppure Nome#TAG.`);
    process.exit(1);
  }

  console.log(`\nRiot ID   ${tracker.riotId}`);
  console.log(`Servizio  ${rankProvider.buildUrl(tracker)}`);
  console.log(`Chiave    ${config.rankApiKey ? 'presente' : '❌ assente (HENRIK_API_KEY nel .env)'}`);
  console.log('');

  const esito = await rankProvider.fetchRank(tracker);

  if (!esito.ok) {
    console.error(`❌ ${esito.reason}`);
    process.exit(1);
  }

  const staff = rankProvider.needsApproval(esito.rank);
  console.log(`✅ Rank letto: ${esito.rank.emoji} ${esito.label}${esito.rr != null ? `  (${esito.rr} RR)` : ''}`);
  console.log(`   Picco:      ${esito.peak || 'non disponibile'}`);
  console.log(`   Ruolo:      ${esito.rank.name}${esito.rank.roleId ? '' : '  ⚠️  roleId non configurato'}`);
  console.log(`   Lega:       ${esito.rank.league}`);
  console.log(`   Assegnazione: ${staff ? 'richiede approvazione dello staff' : 'automatica'}\n`);
})();
