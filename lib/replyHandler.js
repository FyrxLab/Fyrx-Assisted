/**
 * lib/replyHandler.js
 * Prefix-shortcode and keyword-auto-detect triggers. Slash-command trigger
 * lives in slashCommands.js since Discord handles it as its own interaction.
 */

const { getGuildConfig } = require('./config');
const logger = require('./logger');

// channelId -> last auto-reply timestamp (keyword trigger only; prefix
// commands are explicit staff actions and aren't rate-limited).
const lastAutoReply = new Map();

function hasPermission(member, config) {
    if (!member) return false;
    if (member.permissions.has('ManageMessages')) return true;
    if (!config.allowedRoles.length) return false;
    return config.allowedRoles.some(roleId => member.roles.cache.has(roleId));
}

function keywordMatches(content, keyword) {
    const kw = keyword.trim();
    if (!kw) return false;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(content);
}

/** Pure lookup for keyword matches — usable by other addons (see README) without touching Discord state. */
function matchReply(guildId, content) {
    const config = getGuildConfig(guildId);
    for (const [id, reply] of Object.entries(config.replies)) {
        if (reply.keywords.some(kw => keywordMatches(content, kw))) return { id, text: reply.text };
    }
    return null;
}

function logReply(kind, id, message) {
    const preview = message.content.replace(/\s+/g, ' ').trim().slice(0, 80);
    logger.log(`[FyrxAssisted] REPLY (${kind}) id=${id} | user=${message.author.tag} channel=#${message.channel.name || message.channel.id} | "${preview}"`);
}

async function handleMessage(message) {
    if (message.author.bot || !message.guild) return false;
    const config = getGuildConfig(message.guild.id);
    const content = message.content.trim();

    if (config.triggers.prefix && config.prefix && content.toLowerCase().startsWith(config.prefix.toLowerCase())) {
        const id = content.slice(config.prefix.length).trim().toLowerCase();
        const reply = config.replies[id];
        if (reply && hasPermission(message.member, config)) {
            message.fyrxAssistedHandled = true; // before the await: other listeners run while we're suspended
            logReply('prefix', id, message);
            await message.reply(reply.text);
            return true;
        }
    }

    if (config.triggers.keyword) {
        const last = lastAutoReply.get(message.channel.id) || 0;
        if (Date.now() - last >= config.cooldownMs) {
            const match = matchReply(message.guild.id, content);
            if (match) {
                message.fyrxAssistedHandled = true;
                lastAutoReply.set(message.channel.id, Date.now());
                logReply('keyword', match.id, message);
                await message.reply(match.text);
                return true;
            }
        }
    }

    return false;
}

module.exports = { handleMessage, matchReply, hasPermission };
