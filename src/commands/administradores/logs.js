// Archivo: src/commands/administradores/logs.js

/**
 * @file logs.js
 * @description Comando /logs para configurar el canal donde se registran los eventos del servidor.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
    name: 'logs',
    description: 'Configura el canal de logs del servidor',
    /**
     * Ejecuta el comando logs.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
        }

        const logChannelId = client.antiRaid.logChannel.get(interaction.guild.id);
        const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;

        const textChannels = Array.from(interaction.guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .values())
            .sort((a, b) => a.position - b.position)
            .slice(0, 25);

        if (textChannels.length === 0) {
            return interaction.reply({ content: '❌ No hay canales de texto en este servidor.', flags: MessageFlags.Ephemeral });
        }

        const options = textChannels.map(channel =>
            new StringSelectMenuOptionBuilder()
                .setLabel(channel.name)
                .setDescription(`Canal: #${channel.name}`)
                .setValue(channel.id)
                .setEmoji('📝')
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('logs_select_channel')
            .setPlaceholder('Selecciona un canal para los logs')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('📋 Configurar Canal de Logs')
            .setDescription(`**Hola ${interaction.user.tag}!**\n\nSelecciona un canal donde se registrarán todos los eventos del servidor.\n\n**Canal actual:** ${logChannel ? `${logChannel}` : '⚠️ No configurado'}\n\n**Eventos que se registrarán:**\n• Mensajes eliminados/editados/fijados\n• Usuarios entran/salen\n• Bots añadidos/eliminados\n• Bans/Unbans\n• Roles creados/eliminados/actualizados\n• Canales creados/eliminados/actualizados\n• Invitaciones creadas/eliminadas\n• Webhooks actualizados\n• Servidor actualizado\n• Voz: entrada/salida/cambio/mute\n• Moderación y comandos usados\n• Acciones Anti-Raid, anti-spam y anti-links`)
            .setColor(logChannel ? 0x00FF00 : 0xFFA500)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Los logs se envían automáticamente al canal seleccionado' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
};