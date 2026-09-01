// Archivo: src/commands/administradores/voicesupportnextrole.js

/**
 * @file voicesupportnextrole.js
 * @description Comando /voicesupportnextrole para configurar el rol que puede usar el comando !nex.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'voicesupportnextrole',
    description: 'Configura el rol que puede usar el comando !nex',
    /**
     * Ejecuta el comando voicesupportnextrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'Necesitas permiso para gestionar roles.', flags: MessageFlags.Ephemeral });
        }
        const role = interaction.options.getRole('rol');
        client.voiceSupportNextRole.set(interaction.guild.id, role.id);
        saveStaffConfig(client);
        return interaction.reply({
            content: `✅ Rol configurado para usar el comando \`!nex\`: ${role}\n\nAhora solo los usuarios con este rol podrán usar el comando \`!nex\` en el canal de log de soporte de voz.`,
            flags: MessageFlags.Ephemeral
        });
    }
};