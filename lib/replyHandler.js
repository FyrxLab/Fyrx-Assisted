/**
 * lib/replyHandler.js
 * Prefix-shortcode and keyword-auto-detect triggers. Slash-command trigger
 * lives in slashCommands.js since Discord handles it as its own interaction.
 */

const { getGuildConfig } = require('./config');

// channelId -> last auto-reply timestamp (keyword trigger only; prefix
// commands are explicit staff actions and aren't rate-limited).
const lastAutoReply = new Map();

function hasPermission(member, config) {
    if (!member) return false;
    if (member.permissions.has('ManageMessages')) return true;
    if (!config.allowedRoles.length) return false;
    return config.allowedRoles.some(roleId => member.roles.cache.has(roleId));
}

/** Pure lookup for keyword matches — usable by other addons (see README) without touching Discord state. */
function matchReply(guildId, content) {
    const config = getGuildConfig(guildId);
    const lower = content.toLowerCase();
    for (const [id, reply] of Object.entries(config.replies)) {
        if (reply.keywords.some(kw => lower.includes(kw.toLowerCase()))) return { id, text: reply.text };
    }
    return null;
}

async function handleMessage(message) {
    if (message.author.bot || !message.guild) return false;
    const config = getGuildConfig(message.guild.id);
    const content = message.content.trim();

    if (config.triggers.prefix && config.prefix && content.toLowerCase().startsWith(config.prefix.toLowerCase())) {
        const id = content.slice(config.prefix.length).trim().toLowerCase();
        const reply = config.replies[id];
        if (reply && hasPermission(message.member, config)) {
            await message.reply(reply.text);
            message.fyrxAssistedHandled = true;
            return true;
        }
    }

    if (config.triggers.keyword) {
        const last = lastAutoReply.get(message.channel.id) || 0;
        if (Date.now() - last >= config.cooldownMs) {
            const match = matchReply(message.guild.id, content);
            if (match) {
                await message.reply(match.text);
                lastAutoReply.set(message.channel.id, Date.now());
                message.fyrxAssistedHandled = true;
                return true;
            }
        }
    }

    return false;
}

module.exports = { handleMessage, matchReply, hasPermission };
