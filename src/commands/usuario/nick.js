// Archivo: src/commands/usuario/nick.js

/**
 * @file nick.js
 * @description Comando /nick para cambiar el apodo de un usuario del servidor.
 */

const { MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'nick',
    description: 'Cambia el apodo de un usuario del servidor',
    /**
     * Ejecuta el comando nick.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const newNick = interaction.options.getString('nuevo_nick');
        const targetMember = targetUser
            ? await interaction.guild.members.fetch(targetUser.id).catch(() => null)
            : interaction.member;

        if (!targetMember) {
            return interaction.reply({ content: 'No pude encontrar al usuario indicado.', flags: MessageFlags.Ephemeral });
        }

        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return interaction.reply({ content: '❌ No tengo permiso para cambiar apodos. Otorga el permiso Gestionar Apodos al bot.', flags: MessageFlags.Ephemeral });
        }

        if (targetMember.id !== interaction.member.id) {
            const canManage = interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            if (!canManage) {
                return interaction.reply({ content: '❌ Necesitas permisos para gestionar apodos de otros usuarios.', flags: MessageFlags.Ephemeral });
            }
        }

        try {
            await targetMember.setNickname(newNick, `Cambio de apodo vía /nick por ${interaction.user.tag}`);
            return interaction.reply({ content: `✅ Apodo de ${targetMember.user.tag} actualizado a **${newNick}**.`, flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error cambiando apodo:', e);
            return interaction.reply({ content: '❌ No pude cambiar el apodo. Revisa mis permisos y la jerarquía de roles.', flags: MessageFlags.Ephemeral });
        }
    }
};