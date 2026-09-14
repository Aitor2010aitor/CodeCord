// Archivo: src/commands/fun/dado.js

/**
 * @file dado.js
 * @description Comando /dado para tirar un dado de 6 caras.
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'dado',
    description: 'Tira un dado de 6 caras',
    /**
     * Ejecuta el comando dado.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const roll = Math.floor(Math.random() * 6) + 1;

        const embed = new EmbedBuilder()
            .setTitle('🎲 Lanzamiento de Dado | CodeCord')
            .setDescription(`Obtuviste un: **${roll}** 🎲`)
            .setColor(0xE74C3C)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
