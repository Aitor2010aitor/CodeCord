// Archivo: src/commands/administradores/addsupportrole.js

/**
 * @file addsupportrole.js
 * @description Comando /addsupportrole para agregar roles adicionales a los canales de soporte existentes.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { findSupportChannels } = require('../../systems/voiceSystem.js');

module.exports = {
    name: 'addsupportrole',
    description: 'Agrega roles adicionales a los canales de soporte existentes',
    /**
     * Ejecuta el comando addsupportrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'Necesitas permiso para gestionar roles.', flags: MessageFlags.Ephemeral });
        }

        const role1 = interaction.options.getRole('rol');
        const role2 = interaction.options.getRole('rol2');
        const role3 = interaction.options.getRole('rol3');
        const role4 = interaction.options.getRole('rol4');
        const role5 = interaction.options.getRole('rol5');

        const allRoles = [role1];
        if (role2) allRoles.push(role2);
        if (role3) allRoles.push(role3);
        if (role4) allRoles.push(role4);
        if (role5) allRoles.push(role5);

        try {
            const supportChannels = findSupportChannels(interaction.guild);

            if (supportChannels.size === 0) {
                return interaction.reply({
                    content: '❌ No se encontraron canales de soporte. Usa `/createsupportchannels` para crearlos primero.',
                    flags: MessageFlags.Ephemeral
                });
            }

            let updatedChannels = 0;
            const rolesList = allRoles.map(r => `✅ ${r}`).join('\n');

            for (const [channelId, channel] of supportChannels) {
                try {
                    for (const role of allRoles) {
                        await channel.permissionOverwrites.edit(role.id, {
                            Connect: true,
                            Speak: true
                        });
                    }
                    updatedChannels++;
                } catch (error) {
                    console.error(`Error actualizando permisos de ${channel.name}:`, error);
                }
            }

            if (updatedChannels > 0) {
                return interaction.reply({
                    content: `✅ Roles agregados a canales de soporte:\n${rolesList}\n✅ Permisos actualizados en ${updatedChannels} canal(es) de soporte.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.reply({
                content: `❌ No se pudieron actualizar los permisos.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error agregando roles:', error);
            return interaction.reply({
                content: `❌ Hubo un error al agregar los roles.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};