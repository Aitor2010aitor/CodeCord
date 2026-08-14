// Archivo: src/commands/administradores/unban.js

/**
 * @file unban.js
 * @description Comando /unban para revocar el baneo a un usuario.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField  } = require('discord.js');
const { sendLogEmbed } = require('../../systems/loggerSystem.js');

module.exports = {
    name: 'unban',
    description: 'Desbanear a un usuario del servidor',
    /**
     * Ejecuta el comando unban.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos para desbanear miembros.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Desbaneo por el staff';

        if (!targetUser) {
            return interaction.reply({ content: '❌ Debes especificar un usuario válido.', flags: MessageFlags.Ephemeral });
        }

        try {
            await interaction.guild.members.unban(targetUser.id, reason);

            const embed = new EmbedBuilder()
                .setTitle('🔓 Usuario Desbaneado | CodeCord')
                .addFields(
                    { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Moderador', value: interaction.user.tag, inline: true },
                    { name: 'Razón', value: reason, inline: false }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await sendLogEmbed(interaction.guild, embed, 'guildBanRemove');
            await interaction.reply({ content: `✅ **${targetUser.tag}** ha sido desbaneado.` });
        } catch (err) {
            console.error('Error desbaneando usuario:', err);
            await interaction.reply({ content: '❌ No se pudo desbanear al usuario o no se encuentra en la lista de baneos.', flags: MessageFlags.Ephemeral });
        }
    }
};
