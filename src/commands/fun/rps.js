// Archivo: src/commands/fun/rps.js

/**
 * @file rps.js
 * @description Comando /rps para jugar Piedra, Papel o Tijera contra CodeCord.
 */

const { EmbedBuilder } = require('discord.js');

const choices = ['piedra', 'papel', 'tijera'];

module.exports = {
    name: 'rps',
    description: 'Juega a Piedra, Papel o Tijera contra CodeCord',
    /**
     * Ejecuta el comando rps.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const userChoice = (interaction.options.getString('eleccion') || 'piedra').toLowerCase();
        const botChoice = choices[Math.floor(Math.random() * choices.length)];

        let result = '';
        if (userChoice === botChoice) {
            result = '¡Empate! 🤝';
        } else if (
            (userChoice === 'piedra' && botChoice === 'tijera') ||
            (userChoice === 'papel' && botChoice === 'piedra') ||
            (userChoice === 'tijera' && botChoice === 'papel')
        ) {
            result = '¡Ganaste tú! 🎉';
        } else {
            result = '¡Gano yo (CodeCord)! 🤖';
        }

        const embed = new EmbedBuilder()
            .setTitle('✂️ Piedra, Papel o Tijera | CodeCord')
            .addFields(
                { name: 'Tu elección', value: userChoice, inline: true },
                { name: 'Elección de CodeCord', value: botChoice, inline: true },
                { name: 'Resultado', value: result, inline: false }
            )
            .setColor(0x3498DB)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
