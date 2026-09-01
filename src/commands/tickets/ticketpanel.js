// Archivo: src/commands/tickets/ticketpanel.js

/**
 * @file ticketpanel.js
 * @description Comando /ticketpanel para publicar el panel interactivo de tickets.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { setTicketConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'ticketpanel',
    description: 'Publica el panel interactivo para abrir tickets (solo moderadores/administradores)',
    /**
     * Ejecuta el comando ticketpanel.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Necesitas permisos de gestión para ejecutar este comando.', ephemeral: true });
        }

        const panelMessage = interaction.options.getString('mensaje');
        const configData = {};
        const buttons = [];

        for (let i = 1; i <= 5; i++) {
            const btnLabel = interaction.options.getString(`boton${i}`);
            const btnQuestion = interaction.options.getString(`pregunta${i}`);

            if (btnLabel) {
                configData[`boton${i}`] = btnLabel;
                if (btnQuestion) configData[`pregunta${i}`] = btnQuestion;

                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`create_ticket_btn_${i}`)
                        .setLabel(btnLabel)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );
            }
        }

        if (buttons.length === 0) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Abrir Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );
        }

        setTicketConfig(interaction.guild.id, configData);

        const embed = new EmbedBuilder()
            .setTitle('🎫 Centro de Soporte y Tickets | CodeCord')
            .setDescription(panelMessage || 'Presiona el botón a continuación para abrir un ticket privado con nuestro equipo de soporte.')
            .setColor(0x5865F2)
            .setFooter({ text: 'CodeCord Ticket System' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel de tickets publicado exitosamente.', ephemeral: true });
    }
};
