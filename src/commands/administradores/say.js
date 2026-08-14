// Archivo: src/commands/administradores/say.js

/**
 * @file say.js
 * @description Comando /say para hacer que el bot envíe un mensaje en un canal.
 */

const { MessageFlags } = require('discord.js');
const { hasStaffPermission } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'say',
    description: 'Hace que el bot envíe un mensaje en el canal actual u otro canal',
    /**
     * Ejecuta el comando say.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const mensaje = interaction.options.getString('mensaje');
        const canal = interaction.options.getChannel('canal');

        if (!hasStaffPermission(interaction.member, interaction.guild)) {
            return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        try {
            const targetChannel = canal || interaction.channel;
            await targetChannel.send(mensaje);
            return interaction.reply({ content: `✅ Mensaje enviado a ${targetChannel}`, flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error al enviar mensaje:', e);
            return interaction.reply({ content: '❌ No pude enviar el mensaje.', flags: MessageFlags.Ephemeral });
        }
    }
};
