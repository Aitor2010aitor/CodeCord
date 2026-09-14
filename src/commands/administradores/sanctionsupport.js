// Archivo: src/commands/administradores/sanctionsupport.js

/**
 * @file sanctionsupport.js
 * @description Comando /sanctionsupport para sancionar a un usuario de soporte de voz.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { sanctionSupportUser } = require('../../systems/sanctionSystem.js');

module.exports = {
    name: 'sanctionsupport',
    description: 'Sanciona a un usuario del soporte de voz',
    /**
     * Ejecuta el comando sanctionsupport.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const staffRoleId = client.voiceSupportStaffRole.get(interaction.guild.id);

        if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.reply({
                    content: '❌ No tienes permisos para usar este comando. Necesitas el rol de staff de soporte de voz o permisos de administrador.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'No se especificó un motivo';

        try {
            const member = await interaction.guild.members.fetch(targetUser.id);
            const success = await sanctionSupportUser(interaction.guild, targetUser.id, reason, interaction.member);

            if (success) {
                return interaction.reply({
                    content: `✅ Usuario ${targetUser.tag} sancionado correctamente.\n📋 Motivo: ${reason}`,
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.reply({
                content: '❌ Error al sancionar al usuario. Verifica que el rol de sancionado esté configurado con `/voicesanctionedrole`.',
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error en sanctionsupport:', error);
            return interaction.reply({
                content: '❌ Error al sancionar al usuario.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};