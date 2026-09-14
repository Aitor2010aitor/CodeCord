// Archivo: src/commands/utility/ping.js

/**
 * @file ping.js
 * @description Comando /ping para consultar la latencia del bot y de la WebSocket de Discord.
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Muestra la latencia actual del bot CodeCord y la API de Discord',
    /**
     * Ejecuta el comando ping.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const sent = await interaction.reply({ content: '🏓 Calculando latencia...', fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong! Latencia de CodeCord')
            .addFields(
                { name: '🤖 Bot Latencia', value: `\`${roundtrip} ms\``, inline: true },
                { name: '⚡ WebSocket API', value: `\`${client.ws.ping} ms\``, inline: true }
            )
            .setColor(0x00FF00)
            .setFooter({ text: 'CodeCord Network Diagnostics' })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
