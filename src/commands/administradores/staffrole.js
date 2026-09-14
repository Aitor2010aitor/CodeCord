// Archivo: src/commands/administradores/staffrole.js

/**
 * @file staffrole.js
 * @description Comando /staffrole para gestionar los roles de staff mediante menús.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const configManager = require('../../../scripts/config-manager.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'staffrole',
    description: 'Gestiona los roles de staff mediante menús',
    /**
     * Ejecuta el comando staffrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo administradores pueden gestionar roles de staff.', flags: MessageFlags.Ephemeral });
        }

        const staffRoles = client.commandRoles.get(interaction.guild.id) || [];
        const allRoles = [...interaction.guild.roles.cache.filter(r => r.name !== '@everyone').values()].sort((a, b) => b.position - a.position);

        const availableRoles = allRoles.filter(r => !staffRoles.includes(r.id));
        const addOptions = availableRoles.slice(0, 25).map(role =>
            new StringSelectMenuOptionBuilder()
                .setLabel(role.name)
                .setDescription(`Añadir como staff`)
                .setValue(role.id)
        );

        const removeOptions = staffRoles.map(roleId => {
            const role = interaction.guild.roles.cache.get(roleId);
            return new StringSelectMenuOptionBuilder()
                .setLabel(role ? role.name : `Rol eliminado (${roleId})`)
                .setDescription('Eliminar de staff')
                .setValue(roleId);
        });

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Gestión de Roles de Staff')
            .setColor(0x5865F2)
            .setTimestamp();

        let rolesText = '';
        if (staffRoles.length > 0) {
            rolesText = staffRoles.map(roleId => {
                const role = interaction.guild.roles.cache.get(roleId);
                return `• ${role ? role.name : `Rol eliminado (${roleId})`}`;
            }).join('\n');
        } else {
            rolesText = 'No hay roles configurados';
        }

        embed.setDescription(`**📋 Roles de Staff Configurados:**\n${rolesText}\n\n**Usa los menús de abajo para añadir o eliminar roles.**`);

        const addMenu = new StringSelectMenuBuilder()
            .setCustomId('staff_add')
            .setPlaceholder('➕ Añadir rol de staff');
        if (addOptions.length > 0) {
            addMenu.addOptions(addOptions);
        } else {
            addMenu.addOptions([
                {
                    label: 'No hay roles disponibles para añadir',
                    description: 'Crea o habilita roles nuevos antes de agregarlos como staff',
                    value: 'none_add',
                    disabled: true
                }
            ]);
        }

        const removeMenu = new StringSelectMenuBuilder()
            .setCustomId('staff_remove')
            .setPlaceholder('➖ Eliminar rol de staff');
        if (removeOptions.length > 0) {
            removeMenu.addOptions(removeOptions);
        } else {
            removeMenu.addOptions([
                {
                    label: 'No hay roles de staff configurados',
                    description: 'Añade primero un rol de staff para poder eliminarlo',
                    value: 'none_remove',
                    disabled: true
                }
            ]);
        }

        const row1 = new ActionRowBuilder().addComponents(addMenu);
        const row2 = new ActionRowBuilder().addComponents(removeMenu);

        return interaction.reply({ embeds: [embed], components: [row1, row2], flags: MessageFlags.Ephemeral });
    }
};