// Archivo: src/commands/administradores/setroles.js

/**
 * @file setroles.js
 * @description Comando /setroles para configurar los roles permitidos de comandos del bot.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const configManager = require('../../../scripts/config-manager.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'setroles',
    description: 'Configura los roles permitidos para usar comandos del bot',
    /**
     * Ejecuta el comando setroles.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: 'Solo los administradores pueden configurar los roles permitidos.',
                flags: MessageFlags.Ephemeral
            });
        }

        const role1 = interaction.options.getRole('rol1');
        const role2 = interaction.options.getRole('rol2');
        const role3 = interaction.options.getRole('rol3');

        const roles = [role1, role2, role3].filter(role => role !== null);

        if (roles.length === 0) {
            return interaction.reply({
                content: 'Debes especificar al menos un rol.',
                flags: MessageFlags.Ephemeral
            });
        }

        const roleIds = roles.map(role => role.id);
        client.commandRoles.set(interaction.guild.id, roleIds);

        const staffData = configManager.loadGuildConfig(interaction.guild.id, 'staffroles', {});
        staffData.commandRoles = roleIds;
        configManager.saveGuildConfig(interaction.guild.id, 'staffroles', staffData);

        const embed = new EmbedBuilder()
            .setTitle('✅ Roles Configurados')
            .setDescription(`Los siguientes roles ahora pueden usar los comandos del bot:\n${roles.map(role => `• ${role.name}`).join('\n')}`)
            .setColor(0x00FF00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        saveStaffConfig(client);
        return;
    }
};