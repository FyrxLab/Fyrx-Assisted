/**
 * lib/config.js
 * Per-guild configuration store, persisted as one JSON file per guild —
 * no env vars, no code edits. Configured entirely via `/fyrxassisted`.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./dataDir');
const logger = require('./logger');

function fileFor(guildId) {
    return path.join(DATA_DIR, `${guildId}.json`);
}

function defaultConfig() {
    return {
        prefix: '//',
        triggers: { prefix: true, keyword: true, slash: true },
        cooldownMs: 15000,
        allowedRoles: [], // empty = anyone with ManageMessages (the default gate)
        replies: {} // id -> { text, keywords: [] }
    };
}

function getGuildConfig(guildId) {
    const file = fileFor(guildId);
    if (!fs.existsSync(file)) return defaultConfig();
    try {
        const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
        return { ...defaultConfig(), ...stored, triggers: { ...defaultConfig().triggers, ...stored.triggers } };
    } catch (err) {
        logger.error(`[FyrxAssisted] Failed to read config for guild ${guildId}:`, err.message);
        return defaultConfig();
    }
}

function saveGuildConfig(guildId, config) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(fileFor(guildId), JSON.stringify(config, null, 2));
}

function setPrefix(guildId, prefix) {
    const config = getGuildConfig(guildId);
    config.prefix = prefix;
    saveGuildConfig(guildId, config);
    return config;
}

function setTrigger(guildId, name, enabled) {
    const config = getGuildConfig(guildId);
    config.triggers[name] = enabled;
    saveGuildConfig(guildId, config);
    return config;
}

function setCooldown(guildId, ms) {
    const config = getGuildConfig(guildId);
    config.cooldownMs = ms;
    saveGuildConfig(guildId, config);
    return config;
}

function addRole(guildId, roleId) {
    const config = getGuildConfig(guildId);
    if (!config.allowedRoles.includes(roleId)) config.allowedRoles.push(roleId);
    saveGuildConfig(guildId, config);
    return config;
}

function removeRole(guildId, roleId) {
    const config = getGuildConfig(guildId);
    config.allowedRoles = config.allowedRoles.filter(id => id !== roleId);
    saveGuildConfig(guildId, config);
    return config;
}

function setReply(guildId, id, text, keywords) {
    const config = getGuildConfig(guildId);
    config.replies[id.toLowerCase()] = { text, keywords: keywords || [] };
    saveGuildConfig(guildId, config);
    return config;
}

function removeReply(guildId, id) {
    const config = getGuildConfig(guildId);
    delete config.replies[id.toLowerCase()];
    saveGuildConfig(guildId, config);
    return config;
}

module.exports = {
    getGuildConfig, saveGuildConfig, setPrefix, setTrigger, setCooldown,
    addRole, removeRole, setReply, removeReply
};
