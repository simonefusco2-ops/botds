require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { Player } = require('discord-player');

const config = require('./config');
const logger = require('./utils/logger');
const { registerPlayerEvents } = require('./modules/music/playerEvents');
const { createWebhookServer } = require('./modules/faceit/webhookServer');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.player = new Player(client);
client.player.extractors.loadDefault();
registerPlayerEvents(client);

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
  else client.on(event.name, (...args) => event.execute(...args, client));
}

process.on('unhandledRejection', (err) => logger.error('Unhandled promise rejection', err));
process.on('uncaughtException', (err) => logger.error('Uncaught exception', err));

createWebhookServer(client);

client.login(config.discordToken);
