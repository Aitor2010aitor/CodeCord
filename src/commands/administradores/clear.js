// Archivo: src/commands/administradores/clear.js

/**
 * @file clear.js
 * @description Comando /clear para eliminar mensajería masiva en un canal.
 */

const { MessageFlags, PermissionsBitField  } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Elimina una cantidad determinada de mensajes del canal actual',
    /**
     * Ejecuta el comando clear.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ No tienes permisos de "Gestionar Mensajes".', flags: MessageFlags.Ephemeral });
        }

        const amount = interaction.options.getInteger('cantidad') || 10;

        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: '❌ La cantidad debe estar entre 1 y 100.', flags: MessageFlags.Ephemeral });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `🧹 Se han eliminado **${deleted.size}** mensajes con éxito.`, flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Error ejecutando clear:', err);
            await interaction.reply({ content: '❌ Error al eliminar mensajes. Los mensajes mayores a 14 días no pueden borrarse en masa.', flags: MessageFlags.Ephemeral });
        }
    }
};
