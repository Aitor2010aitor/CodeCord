// Archivo: src/commands/administradores/ticketclose.js

/**
 * @file ticketclose.js
 * @description Comando /ticketclose para cerrar un ticket de forma segura.
 */

const { closeTicketChannel, isTicketChannel } = require('../../systems/ticketSystem.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'ticketclose',
    description: 'Cerrar el ticket actual desde slash command',
    /**
     * Ejecuta el comando ticketclose.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!isTicketChannel(interaction.channel)) {
            return interaction.reply({ content: '❌ Este comando solo se puede ejecutar en canales de ticket.', flags: MessageFlags.Ephemeral });
        }

        await closeTicketChannel(interaction.channel, interaction.user, (opts) => interaction.reply(opts));
    }
};
