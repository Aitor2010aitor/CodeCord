// Archivo: src/commands/administradores/kick.js

/**
 * @file kick.js
 * @description Comando /kick para expulsar a un usuario del servidor.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendLogEmbed, deleteUserMessagesInGuild } = require('../../systems/loggerSystem.js');

module.exports = {
    name: 'kick',
    description: 'Expulsa a un usuario del servidor',
    /**
     * Ejecuta el comando kick.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos para expulsar miembros.', flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón';

        if (!user) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!member.kickable) {
                return interaction.editReply({ content: '❌ No puedo expulsar a este usuario (puede tener un rol superior al mío).' });
            }

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('👢 Has sido expulsado del servidor')
                    .setDescription(`**Servidor:** ${interaction.guild.name}\n**Razón:** ${reason}\n**Expulsado por:** ${interaction.user.tag}`)
                    .setColor(0xFFA500)
                    .setThumbnail(interaction.guild.iconURL() || user.displayAvatarURL())
                    .setFooter({ text: `Expulsado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log(`⚠️ No se pudo enviar MD a ${user.tag}:`, dmError.message);
            }

            await member.kick(reason);

            try {
                const modConfig = require('../../scripts/config-manager.js').loadGuildConfig(interaction.guild.id, 'moderation', {});
                if (modConfig.actions?.deleteOnKick) {
                    await deleteUserMessagesInGuild(interaction.guild, user.id);
                }
            } catch (configErr) {
                console.error('Error al cargar config o eliminar mensajes de usuario kickeado:', configErr);
            }

            const kickEmbed = new EmbedBuilder()
                .setTitle('👢 Usuario Expulsado')
                .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Expulsado por:** ${interaction.user.tag}\n**Razón:** ${reason}`)
                .setThumbnail(user.displayAvatarURL())
                .setColor(0xFFA500)
                .setFooter({ text: `Expulsado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
                .setTimestamp();

            await sendLogEmbed(interaction.guild, kickEmbed, 'guildMemberKick');
            return interaction.editReply({ embeds: [kickEmbed] });
        } catch (e) {
            console.error('Error al expulsar:', e);
            return interaction.editReply({ content: '❌ No pude expulsar a ese usuario.' });
        }
    }
};
