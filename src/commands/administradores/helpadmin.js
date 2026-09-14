// Archivo: src/commands/administradores/helpadmin.js

/**
 * @file helpadmin.js
 * @description Comando /helpadmin para mostrar un menú interactivo de ayuda con botones.
 *              Replicado desde VERSION-7.0.
 */

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'helpadmin',
    description: 'Menú interactivo con botones de todos los comandos (solo administradores)',
    /**
     * Ejecuta el comando helpadmin.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📋 Menú de Comandos del Bot')
            .setDescription('Selecciona una categoría para ver los comandos disponibles:')
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_info')
                    .setLabel('ℹ️ Información')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_mod')
                    .setLabel('🛡️ Moderación')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('help_roles')
                    .setLabel('🎭 Roles')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_voice')
                    .setLabel('🎙️ Salas')
                    .setStyle(ButtonStyle.Success)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_tickets')
                    .setLabel('🎫 Tickets')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_config')
                    .setLabel('⚙️ Configuración')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_utils')
                    .setLabel('🔧 Utilidades')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            flags: MessageFlags.Ephemeral
        });
    }
};
