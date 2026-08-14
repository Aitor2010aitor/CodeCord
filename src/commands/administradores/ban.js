// Archivo: src/commands/administradores/ban.js

/**
 * @file ban.js
 * @description Comando /ban para banear un miembro del servidor.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField  } = require('discord.js');
const { sendLogEmbed } = require('../../systems/loggerSystem.js');

module.exports = {
    name: 'ban',
    description: 'Banear a un usuario del servidor',
    /**
     * Ejecuta el comando ban.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos para banear miembros.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!targetUser) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario.', flags: MessageFlags.Ephemeral });
        }

        try {
            await interaction.guild.members.ban(targetUser, { reason: `${reason} | Baneado por ${interaction.user.tag}` });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Usuario Baneado | CodeCord')
                .addFields(
                    { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Moderador', value: interaction.user.tag, inline: true },
                    { name: 'Razón', value: reason, inline: false }
                )
                .setColor(0xFF0000)
                .setTimestamp();

            await sendLogEmbed(interaction.guild, embed, 'guildBanAdd');
            await interaction.reply({ content: `✅ **${targetUser.tag}** ha sido baneado del servidor.` });
        } catch (err) {
            console.error('Error baneando usuario:', err);
            await interaction.reply({ content: '❌ Ocurrió un error al intentar banear al usuario.', flags: MessageFlags.Ephemeral });
        }
    }
};
