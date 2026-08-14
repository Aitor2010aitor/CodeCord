// Archivo: src/commands/administradores/automod.js

/**
 * @file automod.js
 * @description Comando /automod para configurar la moderación automática del servidor.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getAntiRaidSettings, canManageAutoMod } = require('../../systems/antiRaidSystem.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'automod',
    description: 'Configura la moderación automática del servidor',
    /**
     * Ejecuta el comando automod.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'role') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Solo administradores pueden configurar el rol de automoderación.', flags: MessageFlags.Ephemeral });
            }

            const role = interaction.options.getRole('rol');
            client.antiRaid.adminRole.set(interaction.guild.id, role.id);
            saveStaffConfig(client);

            return interaction.reply({
                content: `✅ Rol autorizado para configurar automoderación: ${role}`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === 'settings') {
            if (!canManageAutoMod(client, interaction.member, interaction.guild)) {
                return interaction.reply({ content: '❌ No tienes permisos para configurar automoderación.', flags: MessageFlags.Ephemeral });
            }

            const antiSpam = interaction.options.getBoolean('antispam');
            const antiLinks = interaction.options.getBoolean('antilinks');
            const antiBots = interaction.options.getBoolean('antibots');
            const antiChannelSpam = interaction.options.getBoolean('antichannelspam');
            const maxMessages = interaction.options.getInteger('maxmessages');
            const timeWindow = interaction.options.getInteger('timewindow');

            const currentSettings = getAntiRaidSettings(client, interaction.guild.id);
            const newSettings = { ...currentSettings };
            let changed = false;

            if (antiSpam !== null) {
                newSettings.antiSpam = antiSpam;
                changed = true;
            }
            if (antiLinks !== null) {
                newSettings.antiLinks = antiLinks;
                changed = true;
            }
            if (antiBots !== null) {
                newSettings.antiBots = antiBots;
                changed = true;
            }
            if (antiChannelSpam !== null) {
                newSettings.antiChannelSpam = antiChannelSpam;
                changed = true;
            }
            if (maxMessages !== null) {
                newSettings.maxMessages = maxMessages;
                changed = true;
            }
            if (timeWindow !== null) {
                newSettings.timeWindow = timeWindow * 1000;
                changed = true;
            }

            if (!changed) {
                return interaction.reply({ content: '❌ Debes especificar al menos una opción para actualizar.', flags: MessageFlags.Ephemeral });
            }

            client.antiRaid.settings.set(interaction.guild.id, newSettings);
            saveStaffConfig(client);

            const updatedEmbed = new EmbedBuilder()
                .setTitle('✅ Configuración de Automoderación Actualizada')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Anti-Spam', value: newSettings.antiSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Anti-Links', value: newSettings.antiLinks ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Anti-Bots', value: newSettings.antiBots ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Anti-Canal Spam', value: newSettings.antiChannelSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Límite de mensajes', value: `${newSettings.maxMessages} mensajes`, inline: true },
                    { name: 'Ventana de tiempo', value: `${newSettings.timeWindow / 1000} segundos`, inline: true }
                );

            return interaction.reply({ embeds: [updatedEmbed], flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'status') {
            const currentSettings = getAntiRaidSettings(client, interaction.guild.id);
            const adminRoleId = client.antiRaid.adminRole.get(interaction.guild.id);
            const adminRole = adminRoleId ? interaction.guild.roles.cache.get(adminRoleId) : null;

            const statusEmbed = new EmbedBuilder()
                .setTitle('🔒 Estado de Automoderación')
                .setColor(0x5865F2)
                .addFields(
                    { name: 'Rol autorizado', value: adminRole ? `${adminRole}` : 'No configurado', inline: false },
                    { name: 'Anti-Spam', value: currentSettings.antiSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Anti-Links', value: currentSettings.antiLinks ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Anti-Bots', value: currentSettings.antiBots ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Anti-Canal Spam', value: currentSettings.antiChannelSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
                    { name: 'Límite de mensajes', value: `${currentSettings.maxMessages} mensajes`, inline: true },
                    { name: 'Ventana de tiempo', value: `${currentSettings.timeWindow / 1000} segundos`, inline: true }
                );

            return interaction.reply({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });
        }
    }
};