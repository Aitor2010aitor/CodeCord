// Archivo: src/commands/administradores/ticketlogchannel.js

/**
 * @file ticketlogchannel.js
 * @description Comando /ticketlogchannel para configurar el canal de logs de tickets.
 */

const { MessageFlags, PermissionsBitField, ChannelType } = require('discord.js');
const { getTicketConfig, setTicketConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'ticketlogchannel',
    description: 'Configura el canal de logs para tickets',
    /**
     * Ejecuta el comando ticketlogchannel.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo administradores pueden configurar el canal de logs de tickets.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.options.getChannel('canal');
        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ Debes seleccionar un canal de texto válido.', flags: MessageFlags.Ephemeral });
        }

        const guildConfig = getTicketConfig(interaction.guild.id) || {};
        guildConfig.ticketLogChannelId = channel.id;
        setTicketConfig(interaction.guild.id, guildConfig);

        return interaction.reply({ content: `✅ Canal de logs de tickets configurado: ${channel}`, flags: MessageFlags.Ephemeral });
    }
};