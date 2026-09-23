/**
 * Minimal example showing how to wire FyrxAssisted into a discord.js bot.
 * Run with: DISCORD_TOKEN=... node example/bot.js
 */

const { Client, GatewayIntentBits } = require('discord.js');
const setupFyrxAssisted = require('..');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

setupFyrxAssisted(client);

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
