/**
 * FyrxAssisted — drop-in canned-reply addon for discord.js bots.
 * Usage: require('fyrx-assisted')(client);  (before or after client.login,
 * order doesn't matter — it only attaches listeners)
 */

const { commandData, handleInteraction } = require('./lib/slashCommands');
const { handleMessage, matchReply } = require('./lib/replyHandler');

async function registerCommands(client) {
    try {
        await Promise.all(client.guilds.cache.map(g => g.commands.set([commandData]).catch(() => {})));
    } catch (err) {
        console.error('[FyrxAssisted] Failed to register /fyrxassisted command:', err.message);
    }
}

/**
 * @param {import('discord.js').Client} client - a logged-in (or about to
 *   log in) discord.js Client with the MessageContent intent enabled.
 */
function setupFyrxAssisted(client) {
    let registered = false;
    const ready = () => {
        if (registered) return;
        registered = true;
        registerCommands(client);
    };
    client.once('clientReady', ready);
    client.once('ready', ready);

    client.on('guildCreate', (guild) => guild.commands.set([commandData]).catch(() => {}));

    client.on('interactionCreate', async (interaction) => {
        try {
            await handleInteraction(interaction);
        } catch (err) {
            console.error('[FyrxAssisted] Unhandled interaction error:', err);
        }
    });

    client.on('messageCreate', async (message) => {
        try {
            await handleMessage(message);
        } catch (err) {
            console.error('[FyrxAssisted] Unhandled error:', err);
        }
    });
}

// Exposed so other addons on the same client (e.g. fyrx-ai) can check for a
// canned-reply match before doing their own, more expensive work. See README
// "Integración con fyrx-ai".
setupFyrxAssisted.matchReply = matchReply;

module.exports = setupFyrxAssisted;
