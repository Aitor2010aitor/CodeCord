// Archivo: src/commands/usuario/coinflip.js

/**
 * @file coinflip.js
 * @description Comando /coinflip para lanzar una moneda al aire (Cara o Cruz).
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'coinflip',
    description: 'Lanza una moneda al aire (Cara o Cruz)',
    /**
     * Ejecuta el comando coinflip.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const result = Math.random() < 0.5 ? '🪙 **CARA**' : '🪙 **CRUZ**';

        const embed = new EmbedBuilder()
            .setTitle('🪙 Lanzamiento de Moneda | CodeCord')
            .setDescription(`Resultado: ${result}`)
            .setColor(0xF1C40F)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
