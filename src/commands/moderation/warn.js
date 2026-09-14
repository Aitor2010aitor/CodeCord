// Archivo: src/commands/moderation/warn.js

/**
 * @file warn.js
 * @description Comando /warn para advertir a un miembro del servidor y notificarle por mensaje directo (MD).
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { addSanctionRecord } = require('../../systems/sanctionSystem.js');
const { sendLogEmbed } = require('../../systems/loggerSystem.js');

module.exports = {
    name: 'warn',
    description: 'Aplica una advertencia formal a un usuario y le envía un mensaje privado',
    /**
     * Ejecuta el comando warn.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos de moderación para advertir miembros.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!targetUser) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario válido.', flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === client.user.id) {
            return interaction.reply({ content: '❌ No puedes advertirte a ti mismo ni al bot.', flags: MessageFlags.Ephemeral });
        }

        // Registrar la sanción en el sistema de sanciones aislado del servidor
        addSanctionRecord(interaction.guild.id, {
            userId: targetUser.id,
            userTag: targetUser.tag,
            reason,
            timestamp: Date.now(),
            moderatorTag: interaction.user.tag,
            moderatorId: interaction.user.id,
            type: 'WARN'
        });

        // Intentar enviar notificación por Mensaje Directo (MD) al usuario advertido
        let dmSent = false;
        if (!targetUser.bot) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Has recibido una advertencia')
                    .setDescription(`Has recibido una advertencia formal en el servidor **${interaction.guild.name}**.`)
                    .addFields(
                        { name: '🏛️ Servidor', value: `${interaction.guild.name}`, inline: true },
                        { name: '🛡️ Moderador', value: `${interaction.user.tag}`, inline: true },
                        { name: '📄 Razón', value: `${reason}`, inline: false }
                    )
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || targetUser.displayAvatarURL({ dynamic: true }))
                    .setColor(0xFFA500)
                    .setFooter({ text: `Servidor: ${interaction.guild.name}` })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
                dmSent = true;
            } catch (dmError) {
                console.log(`⚠️ [CodeCord /warn] No se pudo enviar MD a ${targetUser.tag} (${targetUser.id}): ${dmError.message}`);
                dmSent = false;
            }
        }

        // Embed de confirmación para el canal
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Advertencia Aplicada | CodeCord')
            .addFields(
                { name: '👤 Usuario', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: '🛡️ Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: '📬 Notificación MD', value: targetUser.bot ? '🤖 Bot (no recibe MD)' : (dmSent ? '✅ Enviada por MD' : '⚠️ Falló (MD bloqueado/cerrado)'), inline: true },
                { name: '📄 Razón', value: reason, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setColor(0xFFA500)
            .setFooter({ text: `ID Usuario: ${targetUser.id}` })
            .setTimestamp();

        // Enviar log de auditoría al canal de logs configurado
        await sendLogEmbed(interaction.guild, embed, 'guildMemberWarn').catch(() => {});

        await interaction.reply({ embeds: [embed] });
    }
};
