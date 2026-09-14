// Archivo: src/commands/admin/setup.js

/**
 * @file setup.js
 * @description Comando /setup para publicar el panel de administración de CodeCord.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'setup',
    description: 'Configura la estructura completa de salas privadas (solo administradores)',
    /**
     * Ejecuta el comando setup.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎛️ Panel de Administración del Servidor | CodeCord')
            .setDescription('Utiliza los botones de esta interfaz para gestionar las salas de voz y roles del servidor en tiempo real.')
            .setColor(0x5865F2)
            .setFooter({ text: 'CodeCord Administration Panel' })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_disconnect_all').setLabel('🔇 DESCONECTAR TODOS').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('admin_delete_temp').setLabel('🗑️ BORRAR SALAS').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('admin_clean_all').setLabel('🧹 LIMPIAR VOZ').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_role_user').setLabel('🎭 GESTIONAR ROLES').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('admin_stats').setLabel('📊 ESTADÍSTICAS').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
};
