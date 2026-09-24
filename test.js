/**
 * Minimal self-check, no framework: run with `node test.js`.
 * Doesn't require discord.js — config.js/replyHandler.js only touch fs.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const originalCwd = process.cwd();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyrx-assisted-test-'));
process.chdir(tmpDir);

const config = require('./lib/config');
const { matchReply, hasPermission } = require('./lib/replyHandler');

const GUILD = 'test-guild';

config.setReply(GUILD, 'vpn-user', 'Apaga tu VPN e intenta de nuevo.', ['vpn', 'no conecta']);
assert.deepStrictEqual(matchReply(GUILD, 'no conecta al server'), { id: 'vpn-user', text: 'Apaga tu VPN e intenta de nuevo.' });
assert.strictEqual(matchReply(GUILD, 'hola que tal'), null);

config.setReply(GUILD, 'edge', 'x', ['', 'proxy']);
assert.strictEqual(matchReply(GUILD, 'hola que tal'), null); // empty keyword must not match everything
assert.strictEqual(matchReply(GUILD, 'mi proxys falla'), null); // whole words only
assert.strictEqual(matchReply(GUILD, 'el PROXY falla').id, 'edge');
config.removeReply(GUILD, 'edge');

config.setTrigger(GUILD, 'keyword', false);
assert.strictEqual(config.getGuildConfig(GUILD).triggers.keyword, false);

config.setPrefix(GUILD, '!!');
assert.strictEqual(config.getGuildConfig(GUILD).prefix, '!!');

const memberWithPerm = { permissions: { has: () => true }, roles: { cache: { has: () => false } } };
assert.strictEqual(hasPermission(memberWithPerm, config.getGuildConfig(GUILD)), true);

const memberNoPerm = { permissions: { has: () => false }, roles: { cache: { has: () => false } } };
assert.strictEqual(hasPermission(memberNoPerm, config.getGuildConfig(GUILD)), false);

config.addRole(GUILD, 'role-123');
const memberWithRole = { permissions: { has: () => false }, roles: { cache: { has: (id) => id === 'role-123' } } };
assert.strictEqual(hasPermission(memberWithRole, config.getGuildConfig(GUILD)), true);

config.removeReply(GUILD, 'vpn-user');
assert.strictEqual(matchReply(GUILD, 'no conecta al server'), null);

process.chdir(originalCwd);
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('All fyrx-assisted tests passed.');
