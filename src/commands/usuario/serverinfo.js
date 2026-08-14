// Archivo: src/commands/usuario/serverinfo.js

/**
 * @file serverinfo.js
 * @description Comando /serverinfo para mostrar información del servidor.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    description: 'Muestra información del servidor',
    /**
     * Ejecuta el comando serverinfo.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        try {
            const guild = interaction.guild;

            const serverInfoEmbed = new EmbedBuilder()
                .setTitle(`📊 Información de ${guild.name}`)
                .setThumbnail(guild.iconURL())
                .addFields(
                    { name: '🆔 ID', value: guild.id, inline: true },
                    { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
                    { name: '💬 Canales', value: `${guild.channels.cache.size}`, inline: true },
                    { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: '😊 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                    { name: '🚀 Boosts', value: `Nivel ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true }
                )
                .setColor(0x0099FF)
                .setTimestamp();

            return interaction.reply({ embeds: [serverInfoEmbed] });
        } catch (e) {
            console.error('Error al obtener info del servidor:', e);
            return interaction.reply({ content: '❌ No pude obtener la información del servidor.', flags: MessageFlags.Ephemeral });
        }
    }
};