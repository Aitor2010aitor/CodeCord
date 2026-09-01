// Archivo: src/commands/administradores/ticketstaffrole.js

/**
 * @file ticketstaffrole.js
 * @description Comando /ticketstaffrole para configurar el rol de staff que ve y atiende tickets.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'ticketstaffrole',
    description: 'Configura el rol de staff que puede ver y atender tickets',
    /**
     * Ejecuta el comando ticketstaffrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo administradores pueden configurar el rol de tickets.', flags: MessageFlags.Ephemeral });
        }

        const role = interaction.options.getRole('rol');
        if (!role) {
            return interaction.reply({ content: '❌ Debes seleccionar un rol válido.', flags: MessageFlags.Ephemeral });
        }

        client.ticketStaffRole.set(interaction.guild.id, role.id);
        saveStaffConfig(client);

        return interaction.reply({ content: `✅ Rol de staff para tickets configurado: ${role}`, flags: MessageFlags.Ephemeral });
    }
};