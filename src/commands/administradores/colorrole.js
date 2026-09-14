// Archivo: src/commands/administradores/colorrole.js

/**
 * @file colorrole.js
 * @description Comando /colorrole para que un rol cambie de color automáticamente.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { startColorRotation } = require('../../systems/colorSystem.js');
const configManager = require('../../../scripts/config-manager.js');

module.exports = {
    name: 'colorrole',
    description: 'Hace que un rol cambie de color automáticamente',
    /**
     * Ejecuta el comando colorrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const guild = interaction.guild;
        const member = interaction.member;
        const targetRole = interaction.options.getRole('rol');
        const speed = interaction.options.getInteger('velocidad') || 5;

        if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'No tienes permisos para gestionar roles de color.', flags: MessageFlags.Ephemeral });
        }

        if (speed < 1 || speed > 60) {
            return interaction.reply({
                content: 'La velocidad debe estar entre 1 y 60 segundos.',
                flags: MessageFlags.Ephemeral
            });
        }

        const botMember = guild.members.cache.get(client.user.id);
        if (targetRole.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: 'No puedo modificar ese rol porque está por encima de mi rol más alto.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            client.colorRoles.set(guild.id, targetRole.id);
            startColorRotation(client, guild, speed);

            try {
                const gId = interaction.guild?.id;
                if (gId) {
                    configManager.saveGuildConfig(gId, 'colorroles', { roleId: targetRole.id, speed: speed });
                }
            } catch (saveError) {
                console.error('Error guardando configuración de color:', saveError);
            }

            return interaction.reply({
                content: `¡Rol **${targetRole.name}** ahora cambiará de color automáticamente cada **${speed} segundos**! 🎨\n💡 El cambio de color continuará incluso si el bot se reinicia.`
            });
        } catch (error) {
            console.error('Error con rol de color:', error);
            return interaction.reply({ content: 'Error al configurar el rol de color.', flags: MessageFlags.Ephemeral });
        }
    }
};