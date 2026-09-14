// Archivo: src/commands/usuario/membercount.js

/**
 * @file membercount.js
 * @description Comando /membercount para mostrar el contador de miembros del servidor.
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'membercount',
    description: 'Muestra el contador de miembros del servidor',
    /**
     * Ejecuta el comando membercount.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const total = interaction.guild.memberCount;
        const humans = interaction.guild.members.cache.filter(m => !m.user.bot).size;
        const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;

        const countEmbed = new EmbedBuilder()
            .setTitle('👥 Contador de Miembros')
            .setDescription(`**Total:** ${total}\n**Humanos:** ${humans}\n**Bots:** ${bots}`)
            .setColor(0x00FF00)
            .setTimestamp();

        return interaction.reply({ embeds: [countEmbed] });
    }
};