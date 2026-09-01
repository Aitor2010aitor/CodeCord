// Archivo: src/commands/administradores/baninfo.js

/**
 * @file baninfo.js
 * @description Comando /baninfo para consultar si un usuario fue baneado o expulsado.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'baninfo',
    description: 'Consulta si un usuario fue baneado o expulsado del servidor',
    /**
     * Ejecuta el comando baninfo.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos para consultar baneos.', flags: MessageFlags.Ephemeral });
        }

        const userOption = interaction.options.getUser('usuario');
        const userId = interaction.options.getString('id');
        let targetUser = userOption;

        if (!targetUser && userId) {
            try {
                targetUser = await interaction.client.users.fetch(userId);
            } catch {
                targetUser = null;
            }
        }

        if (!targetUser) {
            return interaction.reply({ content: '❌ Debes indicar un usuario o una ID de usuario válida.', flags: MessageFlags.Ephemeral });
        }

        try {
            const bans = await interaction.guild.bans.fetch();
            const banInfo = bans.get(targetUser.id);

            if (banInfo) {
                const banLogs = await interaction.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 20 });
                const banEntry = banLogs.entries.find(e => e.targetId === targetUser.id);
                const banReason = banEntry?.reason || banInfo.reason || 'Sin razón';
                const banExecutor = banEntry?.executor?.tag || 'Desconocido';
                const banDate = banEntry?.createdTimestamp ? `<t:${Math.floor(banEntry.createdTimestamp / 1000)}:F>` : 'No disponible';

                const embed = new EmbedBuilder()
                    .setTitle('🔨 Información de Ban')
                    .setDescription(`**Usuario:** ${targetUser.tag} (${targetUser.id})\n**Estado:** Baneado`)
                    .addFields(
                        { name: '🔖 Razón', value: `${banReason}`, inline: false },
                        { name: '👮 Baneado por', value: `${banExecutor}`, inline: false },
                        { name: '🕒 Fecha', value: `${banDate}`, inline: false }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            const auditLogs = await interaction.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 50 });
            const kickEntry = auditLogs.entries.find(e => e.targetId === targetUser.id);

            if (kickEntry) {
                const embed = new EmbedBuilder()
                    .setTitle('👢 Información de Expulsión')
                    .setDescription(`**Usuario:** ${targetUser.tag} (${targetUser.id})\n**Estado:** Expulsado`)
                    .addFields(
                        { name: '🔖 Razón', value: `${kickEntry.reason || 'Sin razón'}`, inline: false },
                        { name: '👮 Expulsado por', value: `${kickEntry.executor?.tag || 'Desconocido'}`, inline: false },
                        { name: '🕒 Fecha', value: `<t:${Math.floor(kickEntry.createdTimestamp / 1000)}:F>`, inline: false }
                    )
                    .setColor(0xFFA500)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            return interaction.reply({ content: 'ℹ️ No se encontró información de ban ni expulsión reciente para ese usuario.', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error en baninfo:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al buscar la información. Intenta de nuevo.', flags: MessageFlags.Ephemeral });
        }
    }
};
