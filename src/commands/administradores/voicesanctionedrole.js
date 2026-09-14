// Archivo: src/commands/administradores/voicesanctionedrole.js

/**
 * @file voicesanctionedrole.js
 * @description Comando /voicesanctionedrole para configurar el rol de sancionado de soporte de voz.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { findSupportChannels } = require('../../systems/voiceSystem.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'voicesanctionedrole',
    description: 'Configura el rol de sancionado de soporte de voz',
    /**
     * Ejecuta el comando voicesanctionedrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'Necesitas permiso para gestionar roles.', flags: MessageFlags.Ephemeral });
        }
        const role = interaction.options.getRole('rol');
        client.voiceSupportSanctionedRole.set(interaction.guild.id, role.id);
        saveStaffConfig(client);

        try {
            const supportChannels = findSupportChannels(interaction.guild);
            let updatedChannels = 0;

            for (const [channelId, channel] of supportChannels) {
                try {
                    await channel.permissionOverwrites.edit(role.id, {
                        Connect: true,
                        Speak: true
                    });
                    updatedChannels++;
                } catch (error) {
                    console.error(`Error actualizando permisos de ${channel.name}:`, error);
                }
            }

            if (updatedChannels > 0) {
                return interaction.reply({
                    content: `✅ Rol de sancionado configurado: ${role}\n✅ Los usuarios con este rol serán movidos automáticamente a canales de soporte si intentan entrar a la sala de espera.\n✅ Permisos actualizados en ${updatedChannels} canal(es) de soporte.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.reply({
                content: `✅ Rol de sancionado configurado: ${role}\n✅ Los usuarios con este rol serán movidos automáticamente a canales de soporte si intentan entrar a la sala de espera.\n⚠️ No se encontraron canales de soporte. Usa \`/createsupportchannels\` para crearlos.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error actualizando permisos:', error);
            return interaction.reply({
                content: `✅ Rol de sancionado configurado: ${role}\n⚠️ Hubo un error al actualizar permisos de canales.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};