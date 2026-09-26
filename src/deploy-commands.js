/**
 * IVPITER — Bot Discord
 *
 * Autore:  Fusco
 * Discord: calmiamoci
 *
 * Copyright (c) 2026 Fusco. Tutti i diritti riservati.
 * Codice proprietario: vietata la ridistribuzione e la rimozione di questa firma.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

/**
 * Discord pretende che le opzioni obbligatorie vengano prima di quelle
 * facoltative, e discord.js non lo controlla: l'errore arriva solo dal server,
 * che rifiuta l'INTERO invio. Il risultato è subdolo — su Discord restano i
 * comandi vecchi e sembra che le modifiche non siano state applicate — quindi
 * lo verifichiamo qui, indicando esattamente quale opzione è fuori posto.
 */
function checkOptionOrder(options, where, problems) {
  let seenOptional = null;

  for (const option of options || []) {
    // I sottocomandi (tipo 1) e i gruppi (tipo 2) portano le loro opzioni dentro.
    if (option.type === 1 || option.type === 2) {
      checkOptionOrder(option.options, `${where} ${option.name}`, problems);
      continue;
    }

    if (!option.required) {
      seenOptional = option.name;
    } else if (seenOptional) {
      problems.push(`/${where}: l'opzione obbligatoria "${option.name}" viene dopo "${seenOptional}", che è facoltativa`);
    }
  }
}

const problems = [];
for (const command of commands) checkOptionOrder(command.options, command.name, problems);

if (problems.length) {
  console.error('❌ Definizione dei comandi non valida: Discord rifiuterebbe tutto.\n');
  for (const problem of problems) console.error(`   · ${problem}`);
  console.error('\nSposta le opzioni obbligatorie prima di quelle facoltative e riprova.');
  process.exit(1);
}

const rest = new REST().setToken(config.discordToken);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log(`Registrati ${commands.length} comandi slash sulla guild ${config.guildId}.`);
  } catch (err) {
    console.error('❌ Registrazione fallita: su Discord restano i comandi di prima.');
    console.error(err.rawError ? JSON.stringify(err.rawError, null, 2) : err);
    process.exit(1);
  }
})();
