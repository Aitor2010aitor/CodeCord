// Archivo: src/commands/administradores/timeout.js

/**
 * @file timeout.js
 * @description Comando /timeout para aislar temporalmente a un usuario del servidor.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendLogEmbed } = require('../../systems/loggerSystem.js');

module.exports = {
    name: 'timeout',
    description: 'Aísla temporalmente a un usuario del servidor',
    /**
     * Ejecuta el comando timeout.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos para aislar miembros.', flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('usuario');
        const duration = interaction.options.getInteger('duracion');
        const reason = interaction.options.getString('razon') || 'Sin razón';

        if (!user) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario.', flags: MessageFlags.Ephemeral });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!member.moderatable) {
                return interaction.reply({ content: '❌ No puedo aislar a este usuario (puede tener un rol superior al mío).', flags: MessageFlags.Ephemeral });
            }

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔇 Has sido aislado temporalmente')
                    .setDescription(`**Servidor:** ${interaction.guild.name}\n**Duración:** ${duration} minutos\n**Razón:** ${reason}\n**Aislado por:** ${interaction.user.tag}`)
                    .setColor(0xFF6B6B)
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log(`⚠️ No se pudo enviar MD a ${user.tag}`);
            }

            await member.timeout(duration * 60 * 1000, reason);

            const timeoutEmbed = new EmbedBuilder()
                .setTitle('🔇 Usuario Aislado')
                .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Duración:** ${duration} minutos\n**Aislado por:** ${interaction.user.tag}\n**Razón:** ${reason}`)
                .setThumbnail(user.displayAvatarURL())
                .setColor(0xFF6B6B)
                .setTimestamp();

            await sendLogEmbed(interaction.guild, timeoutEmbed);
            return interaction.reply({ embeds: [timeoutEmbed] });
        } catch (e) {
            console.error('Error al aislar:', e);
            return interaction.reply({ content: '❌ No pude aislar a ese usuario.', flags: MessageFlags.Ephemeral });
        }
    }
};
