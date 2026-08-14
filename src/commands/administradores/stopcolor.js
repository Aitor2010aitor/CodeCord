// Archivo: src/commands/administradores/stopcolor.js

/**
 * @file stopcolor.js
 * @description Comando /stopcolor para detener el cambio automático de color de un rol.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { stopColorRotation } = require('../../systems/colorSystem.js');
const configManager = require('../../../scripts/config-manager.js');

module.exports = {
    name: 'stopcolor',
    description: 'Detiene el cambio automático de colores del rol',
    /**
     * Ejecuta el comando stopcolor.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const guild = interaction.guild;
        const member = interaction.member;

        if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'No tienes permisos para gestionar roles de color.', flags: MessageFlags.Ephemeral });
        }

        try {
            stopColorRotation(client, guild);

            const existingRoleId = client.colorRoles.get(guild.id);
            let roleName = 'el rol';
            if (existingRoleId) {
                const existingRole = guild.roles.cache.get(existingRoleId);
                if (existingRole) {
                    roleName = `**${existingRole.name}**`;
                }
                client.colorRoles.delete(guild.id);
            }

            try {
                const gId = interaction.guild?.id;
                if (gId) {
                    configManager.saveGuildConfig(gId, 'colorroles', {});
                }
            } catch (saveError) {
                console.error('Error eliminando configuración de color:', saveError);
            }

            return interaction.reply({
                content: `¡Cambio de color detenido para ${roleName}! El rol mantiene su color actual. 🛑`
            });
        } catch (error) {
            console.error('Error deteniendo rol de color:', error);
            return interaction.reply({ content: 'Error al detener el cambio de color.', flags: MessageFlags.Ephemeral });
        }
    }
};