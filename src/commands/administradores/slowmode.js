// Archivo: src/commands/administradores/slowmode.js

/**
 * @file slowmode.js
 * @description Comando /slowmode para activar o desactivar el modo lento en un canal.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'slowmode',
    description: 'Activa o desactiva el modo lento en un canal',
    /**
     * Ejecuta el comando slowmode.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ No tienes permisos para gestionar canales.', flags: MessageFlags.Ephemeral });
        }

        const seconds = interaction.options.getInteger('segundos');

        try {
            await interaction.channel.setRateLimitPerUser(seconds);

            if (seconds === 0) {
                return interaction.reply({ content: '✅ Modo lento **desactivado** en este canal.', flags: MessageFlags.Ephemeral });
            }
            return interaction.reply({ content: `✅ Modo lento activado: **${seconds} segundos** entre mensajes.`, flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error al activar slowmode:', e);
            return interaction.reply({ content: '❌ No pude cambiar el modo lento.', flags: MessageFlags.Ephemeral });
        }
    }
};
