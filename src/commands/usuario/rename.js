// Archivo: src/commands/usuario/rename.js

/**
 * @file rename.js
 * @description Comando /rename para renombrar la sala de voz actual del usuario.
 */

const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'rename',
    description: 'Renombra tu sala de voz actual',
    /**
     * Ejecuta el comando rename.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const name = interaction.options.getString('nombre');
        const vc = interaction.member.voice?.channel;
        if (!vc) return interaction.reply({ content: 'Debes estar en una sala de voz.', flags: MessageFlags.Ephemeral });
        try {
            await vc.setName(name);
            return interaction.reply({ content: `Nombre de la sala cambiado a **${name}**.`, flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error renombrando sala:', e);
            return interaction.reply({ content: 'No pude renombrar la sala.', flags: MessageFlags.Ephemeral });
        }
    }
};