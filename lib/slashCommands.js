/**
 * lib/slashCommands.js
 * `/fyrxassisted config ...` (ManageGuild, ephemeral) configures replies and
 * toggles. `/fyrxassisted send` is the slash-trigger mode itself — public,
 * usable by anyone with the same permission gate as the prefix trigger.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('./config');
const { hasPermission } = require('./replyHandler');

const commandData = new SlashCommandBuilder()
    .setName('fyrxassisted')
    .setDescription('Configure and use canned replies')
    .addSubcommandGroup(g => g.setName('config').setDescription('Configure canned replies (requires Manage Server)')
        .addSubcommand(s => s.setName('reply-set').setDescription('Add or update a canned reply')
            .addStringOption(o => o.setName('id').setDescription('Shortcode, e.g. "vpn-user"').setRequired(true))
            .addStringOption(o => o.setName('text').setDescription('Reply text').setRequired(true))
            .addStringOption(o => o.setName('keywords').setDescription('Comma-separated keywords for auto-detect (optional)')))
        .addSubcommand(s => s.setName('reply-remove').setDescription('Remove a canned reply')
            .addStringOption(o => o.setName('id').setDescription('Shortcode').setRequired(true).setAutocomplete(true)))
        .addSubcommand(s => s.setName('reply-list').setDescription('List configured replies'))
        .addSubcommand(s => s.setName('prefix').setDescription('Set the prefix for shortcode triggers (e.g. "//")')
            .addStringOption(o => o.setName('value').setDescription('New prefix, or empty to disable').setRequired(false)))
        .addSubcommand(s => s.setName('trigger').setDescription('Enable/disable a trigger type')
            .addStringOption(o => o.setName('type').setDescription('Trigger type').setRequired(true)
                .addChoices({ name: 'prefix', value: 'prefix' }, { name: 'keyword', value: 'keyword' }, { name: 'slash', value: 'slash' }))
            .addBooleanOption(o => o.setName('enabled').setDescription('On or off').setRequired(true)))
        .addSubcommand(s => s.setName('role').setDescription('Allow a role to use prefix/slash triggers (besides Manage Messages)')
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
            .addBooleanOption(o => o.setName('remove').setDescription('Remove instead of add')))
        .addSubcommand(s => s.setName('status').setDescription('Show current configuration')))
    .addSubcommand(s => s.setName('send').setDescription('Send a configured canned reply')
        .addStringOption(o => o.setName('id').setDescription('Shortcode').setRequired(true).setAutocomplete(true)))
    .toJSON();

const HELP_TEXT = [
    '**FyrxAssisted — comandos**',
    '`/fyrxassisted config reply-set <id> <text> [keywords]` — crea o edita una respuesta enlatada',
    '`/fyrxassisted config reply-remove <id>` / `reply-list`',
    '`/fyrxassisted config prefix [value]` — prefijo para shortcodes (ej. `//`), vacío para desactivar',
    '`/fyrxassisted config trigger <prefix|keyword|slash> <true|false>` — activa/desactiva cada mecanismo',
    '`/fyrxassisted config role <role> [remove]` — roles extra autorizados además de Gestionar mensajes',
    '`/fyrxassisted config status` — configuración actual',
    '`/fyrxassisted send <id>` — dispara una respuesta enlatada (modo slash)'
].join('\n');

function replyChoices(guildId, focused) {
    const cfg = config.getGuildConfig(guildId);
    return Object.keys(cfg.replies)
        .filter(id => id.startsWith(focused.toLowerCase()))
        .slice(0, 25)
        .map(id => ({ name: id, value: id }));
}

async function handleAutocomplete(interaction) {
    if (interaction.commandName !== 'fyrxassisted' || !interaction.guild) return;
    const focused = interaction.options.getFocused();
    await interaction.respond(replyChoices(interaction.guild.id, focused)).catch(() => {});
}

async function handleInteraction(interaction) {
    if (interaction.isAutocomplete()) { await handleAutocomplete(interaction); return true; }
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'fyrxassisted') return false;
    if (!interaction.guild) {
        await interaction.reply({ content: 'Este comando solo funciona dentro de un servidor.', flags: MessageFlags.Ephemeral });
        return true;
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);
    const guildId = interaction.guild.id;
    const ephemeralReply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

    if (!group && sub === 'send') {
        const cfg = config.getGuildConfig(guildId);
        if (!cfg.triggers.slash) { await ephemeralReply('El disparador por slash command está desactivado en este servidor.'); return true; }
        if (!hasPermission(interaction.member, cfg)) { await ephemeralReply('No tienes permiso para usar esto.'); return true; }
        const id = interaction.options.getString('id', true).toLowerCase();
        const reply = cfg.replies[id];
        if (!reply) { await ephemeralReply(`No existe una respuesta llamada **${id}**.`); return true; }
        await interaction.reply(reply.text);
        return true;
    }

    if (group !== 'config') { await ephemeralReply(HELP_TEXT); return true; }

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await ephemeralReply('Necesitas el permiso *Gestionar servidor* para configurar FyrxAssisted.');
        return true;
    }

    if (sub === 'status') {
        const cfg = config.getGuildConfig(guildId);
        const lines = [
            `Prefijo: ${cfg.prefix ? `\`${cfg.prefix}\`` : '(desactivado)'}`,
            `Disparadores: prefix=${cfg.triggers.prefix} keyword=${cfg.triggers.keyword} slash=${cfg.triggers.slash}`,
            `Cooldown auto-detect: ${cfg.cooldownMs}ms`,
            `Roles extra: ${cfg.allowedRoles.length ? cfg.allowedRoles.map(id => `<@&${id}>`).join(', ') : '(ninguno, solo Gestionar mensajes)'}`,
            `Respuestas configuradas: ${Object.keys(cfg.replies).length}`
        ];
        await ephemeralReply(lines.join('\n'));
        return true;
    }

    if (sub === 'reply-list') {
        const cfg = config.getGuildConfig(guildId);
        const ids = Object.keys(cfg.replies);
        await ephemeralReply(ids.length
            ? ids.map(id => `**${id}** — ${cfg.replies[id].keywords.length} keyword(s)`).join('\n')
            : 'No hay respuestas configuradas.');
        return true;
    }

    if (sub === 'reply-set') {
        const id = interaction.options.getString('id', true);
        const text = interaction.options.getString('text', true);
        const keywords = (interaction.options.getString('keywords') || '')
            .split(',').map(k => k.trim()).filter(Boolean);
        config.setReply(guildId, id, text, keywords);
        await ephemeralReply(`Respuesta **${id.toLowerCase()}** guardada.`);
        return true;
    }

    if (sub === 'reply-remove') {
        const id = interaction.options.getString('id', true);
        config.removeReply(guildId, id);
        await ephemeralReply(`Respuesta **${id.toLowerCase()}** eliminada.`);
        return true;
    }

    if (sub === 'prefix') {
        const value = interaction.options.getString('value') || null;
        config.setPrefix(guildId, value);
        await ephemeralReply(value ? `Prefijo actualizado a \`${value}\`.` : 'Prefijo desactivado.');
        return true;
    }

    if (sub === 'trigger') {
        const type = interaction.options.getString('type', true);
        const enabled = interaction.options.getBoolean('enabled', true);
        config.setTrigger(guildId, type, enabled);
        await ephemeralReply(`Disparador **${type}** ${enabled ? 'activado' : 'desactivado'}.`);
        return true;
    }

    if (sub === 'role') {
        const role = interaction.options.getRole('role', true);
        const remove = interaction.options.getBoolean('remove') || false;
        if (remove) { config.removeRole(guildId, role.id); await ephemeralReply(`Rol **${role.name}** ya no puede usar los disparadores.`); }
        else { config.addRole(guildId, role.id); await ephemeralReply(`Rol **${role.name}** ahora puede usar los disparadores.`); }
        return true;
    }

    await ephemeralReply(HELP_TEXT);
    return true;
}

module.exports = { commandData, handleInteraction };
