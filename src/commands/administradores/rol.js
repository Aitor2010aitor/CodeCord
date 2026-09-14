// Archivo: src/commands/administradores/rol.js

/**
 * @file rol.js
 * @description Comando /rol para asignar o quitar roles a un usuario.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'rol',
    description: 'Asigna o quita un rol a un usuario',
    /**
     * Ejecuta el comando rol.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const role = interaction.options.getRole('rol');

        const guild = interaction.guild;
        if (!guild) return interaction.reply({ content: 'Este comando solo funciona en servidores.', flags: MessageFlags.Ephemeral });

        let member;
        try {
            member = await guild.members.fetch(targetUser.id);
        } catch (err) {
            return interaction.reply({ content: 'No pude encontrar al miembro en este servidor.', flags: MessageFlags.Ephemeral });
        }

        const executor = interaction.member;
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'No tienes permiso para gestionar roles (Manage Roles).', flags: MessageFlags.Ephemeral });
        }

        const botMember = guild.members.cache.get(client.user.id);
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'No tengo permiso para gestionar roles. Dame el permiso "Manage Roles".', flags: MessageFlags.Ephemeral });
        }

        const botHighest = botMember.roles.highest.position;
        const targetRolePosition = role.position;
        if (targetRolePosition >= botHighest) {
            return interaction.reply({ content: 'No puedo asignar ese rol porque está por encima (o al mismo nivel) de mi rol más alto.', flags: MessageFlags.Ephemeral });
        }

        if (executor.roles && executor.roles.highest.position <= member.roles.highest.position && executor.id !== guild.ownerId) {
            return interaction.reply({ content: 'No puedes asignar roles a alguien con la misma o mayor jerarquía que tú.', flags: MessageFlags.Ephemeral });
        }

        try {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                return interaction.reply({ content: `Se ha **quitado** el rol ${role.name} a ${member.user.tag}.` });
            }
            await member.roles.add(role);
            return interaction.reply({ content: `Se ha **asignado** el rol ${role.name} a ${member.user.tag}.` });
        } catch (error) {
            console.error('Error al asignar/quitar rol:', error);
            return interaction.reply({ content: 'Ocurrió un error al intentar modificar los roles. Asegúrate de que mi rol está por encima del rol objetivo y que tengo permisos.', flags: MessageFlags.Ephemeral });
        }
    }
};