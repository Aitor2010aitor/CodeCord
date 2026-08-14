// Archivo: src/commands/usuario/ship.js

/**
 * @file ship.js
 * @description Comando /ship para calcular la compatibilidad entre dos personas.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'ship',
    description: 'Calcula la compatibilidad entre dos personas',
    /**
     * Ejecuta el comando ship.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const persona1 = interaction.options.getUser('persona1');
        const persona2 = interaction.options.getUser('persona2');

        if (persona1.id === persona2.id) {
            return interaction.reply({ content: '❌ No puedes hacer ship de la misma persona consigo misma.', flags: MessageFlags.Ephemeral });
        }

        const seed = parseInt(persona1.id.slice(-8), 16) + parseInt(persona2.id.slice(-8), 16);
        const porcentaje = (seed % 101);

        let emoji = '';
        let mensaje = '';
        let color = 0xFF0000;

        if (porcentaje < 20) {
            emoji = '💔';
            mensaje = 'No hay química...';
            color = 0xFF0000;
        } else if (porcentaje < 40) {
            emoji = '😐';
            mensaje = 'Podría funcionar con esfuerzo';
            color = 0xFFA500;
        } else if (porcentaje < 60) {
            emoji = '💛';
            mensaje = 'Hay potencial';
            color = 0xFFD700;
        } else if (porcentaje < 80) {
            emoji = '💖';
            mensaje = '¡Buena pareja!';
            color = 0xFF69B4;
        } else {
            emoji = '💕';
            mensaje = '¡Match perfecto!';
            color = 0xFF1493;
        }

        const barLength = 20;
        const filled = Math.floor((porcentaje / 100) * barLength);
        const empty = barLength - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);

        const shipEmbed = new EmbedBuilder()
            .setTitle(`${emoji} Ship Compatibility ${emoji}`)
            .setDescription(`**${persona1.username}** 💘 **${persona2.username}**\n\n${bar}\n\n**${porcentaje}%** - ${mensaje}`)
            .setColor(color)
            .setTimestamp();

        return interaction.reply({ embeds: [shipEmbed] });
    }
};