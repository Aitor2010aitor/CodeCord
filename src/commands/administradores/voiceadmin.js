// Archivo: src/commands/administradores/voiceadmin.js

/**
 * @file voiceadmin.js
 * @description Comando /voiceadmin para mostrar el panel de administración de voz.
 */

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'voiceadmin',
    description: 'Panel de administración de voz - Gestionar todos los canales de voz del servidor',
    /**
     * Ejecuta el comando voiceadmin.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎛️ Panel de Administración de Voz')
            .setDescription('Gestiona todos los canales de voz del servidor desde aquí.')
            .addFields(
                { name: '🔇 DESCONECTAR TODOS', value: 'Expulsa a todos los usuarios de todos los canales de voz', inline: false },
                { name: '🗑️ BORRAR SALAS TEMPORALES', value: 'Elimina todos los canales de voz temporales (salas privadas)', inline: false },
                { name: '🧹 LIMPIAR TODO', value: 'Desconecta a todos Y elimina todas las salas temporales', inline: false }
            )
            .setColor(0xFF0000)
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_disconnect_all').setLabel('DESCONECTAR TODOS').setStyle(ButtonStyle.Danger).setEmoji('🔇'),
            new ButtonBuilder().setCustomId('admin_delete_temp').setLabel('BORRAR SALAS TEMPORALES').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_clean_all').setLabel('LIMPIAR TODO').setStyle(ButtonStyle.Danger).setEmoji('🧹')
        );

        return interaction.reply({ embeds: [embed], components: [row1, row2], flags: MessageFlags.Ephemeral });
    }
};