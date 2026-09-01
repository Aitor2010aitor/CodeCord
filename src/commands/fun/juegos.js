// Archivo: src/commands/fun/juegos.js

/**
 * @file juegos.js
 * @description Comando /juegos para desplegar la botonera interactiva de mini-juegos.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'juegos',
    description: 'Abre el menú interactivo de mini-juegos de CodeCord',
    /**
     * Ejecuta el comando juegos.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setTitle('🎮 MENÚ DE COMANDOS DE JUEGOS | CodeCord')
                .setDescription('**Selecciona una categoría para ver los comandos:**\n\n' +
                    '🎲 **Juegos de Azar** - Dados, monedas y azar\n' +
                    '🎯 **Juegos Interactivos** - Trivia, RPS y más\n' +
                    '😂 **Diversión** - Memes y entretenimiento\n' +
                    '📚 **Ver Todo** - Todos los comandos juntos')
            .setColor(0xFF6B6B)
            .setFooter({ text: `Solicitado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('juegos_azar').setLabel('🎲 Azar').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('juegos_interactivos').setLabel('🎯 Interactivos').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('juegos_diversion').setLabel('😂 Diversión').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('juegos_todo').setLabel('📚 Ver Todo').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
