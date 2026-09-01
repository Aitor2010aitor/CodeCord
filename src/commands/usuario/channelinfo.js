// Archivo: src/commands/usuario/channelinfo.js

/**
 * @file channelinfo.js
 * @description Comando /channelinfo para mostrar información de un canal.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'channelinfo',
    description: 'Muestra información detallada de un canal',
    /**
     * Ejecuta el comando channelinfo.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const channel = interaction.options.getChannel('canal') || interaction.channel;

        const embed = new EmbedBuilder()
            .setColor("#7289DA")
            .setTitle(`📚 Información del Canal #${channel.name}`)
            .setThumbnail(channel.guild.iconURL())
            .setDescription(`¡Aquí tienes los detalles del canal **${channel.name}**!`)
            .addFields(
                { name: "🆔 ID del canal", value: `${channel.id}`, inline: true },
                { name: "🏷️ Tipo", value: `${channel.type}`, inline: true },
                { name: "📆 Creación", value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>` },
                { name: "🔞 NSFW", value: `${channel.nsfw ? 'Sí ✅' : 'No ❌'}`, inline: true },
                { name: "📋 Tópico", value: `${channel.topic || 'No tiene'}` },
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};