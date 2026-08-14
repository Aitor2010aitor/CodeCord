// Archivo: src/commands/usuario/userinfo.js

/**
 * @file userinfo.js
 * @description Comando /userinfo para mostrar información detallada de un usuario.
 */

const { EmbedBuilder, MessageFlags, UserFlags } = require('discord.js');

module.exports = {
    name: 'userinfo',
    description: 'Muestra información detallada de un usuario',
    /**
     * Ejecuta el comando userinfo.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ Este comando solo funciona en servidores.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        let targetMember = null;

        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.reply({ content: '❌ Usuario no encontrado en este servidor.', flags: MessageFlags.Ephemeral });
        }

        const getUserBadges = (flags) => {
            const badges = [];
            if (flags?.has(UserFlags.Staff)) badges.push('🔧 Staff de Discord');
            if (flags?.has(UserFlags.Partner)) badges.push('🤝 Partner de Discord');
            if (flags?.has(UserFlags.Hypesquad)) badges.push('⚡ HypeSquad Events');
            if (flags?.has(UserFlags.BugHunterLevel1)) badges.push('🐛 Bug Hunter');
            if (flags?.has(UserFlags.BugHunterLevel2)) badges.push('🐛 Bug Hunter Oro');
            if (flags?.has(UserFlags.HypeSquadOnlineHouse1)) badges.push('💜 HypeSquad Bravery');
            if (flags?.has(UserFlags.HypeSquadOnlineHouse2)) badges.push('🧡 HypeSquad Brilliance');
            if (flags?.has(UserFlags.HypeSquadOnlineHouse3)) badges.push('💚 HypeSquad Balance');
            if (flags?.has(UserFlags.PremiumEarlySupporter)) badges.push('💎 Early Supporter');
            if (flags?.has(UserFlags.VerifiedDeveloper)) badges.push('🔨 Desarrollador Verificado');
            if (flags?.has(UserFlags.CertifiedModerator)) badges.push('🛡️ Moderador Certificado');
            if (flags?.has(UserFlags.ActiveDeveloper)) badges.push('⚙️ Desarrollador Activo');
            return badges.length > 0 ? badges.join('\n') : 'Sin badges';
        };

        const getKeyPermissions = (member) => {
            const keyPerms = member.permissions.toArray().filter(perm =>
                ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
                    'ManageMessages', 'KickMembers', 'BanMembers', 'MuteMembers'].includes(perm)
            );
            return keyPerms.length > 0 ? keyPerms.join(', ') : 'Permisos básicos';
        };

        const getRolesList = (member) => {
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .first(5)
                .map(role => `<@&${role.id}>`)
                .join(', ');

            const totalRoles = member.roles.cache.size - 1;
            return roles || '@everyone' + (totalRoles > 5 ? ` y ${totalRoles - 5} más` : '');
        };

        const getStatusEmoji = (status) => {
            switch (status) {
                case 'online': return '🟢';
                case 'idle': return '🟡';
                case 'dnd': return '🔴';
                case 'offline': return '⚫';
                default: return '❓';
            }
        };

        const getStatusText = (status) => {
            switch (status) {
                case 'online': return 'En línea';
                case 'idle': return 'Ausente';
                case 'dnd': return 'No molestar';
                case 'offline': return 'Desconectado';
                default: return 'Desconocido';
            }
        };

        const getDeviceInfo = (clientStatus) => {
            if (!clientStatus) return 'Desconocido';

            const devices = [];
            if (clientStatus.desktop) devices.push('🖥️ Escritorio');
            if (clientStatus.mobile) devices.push('📱 Móvil');
            if (clientStatus.web) devices.push('🌐 Web');

            return devices.length > 0 ? devices.join(', ') : 'Desconocido';
        };

        const getMemberStatus = (member) => {
            if (member.isCommunicationDisabled()) return '🔇 Silenciado';
            const timeInServer = Date.now() - member.joinedTimestamp;
            const daysInServer = Math.floor(timeInServer / (1000 * 60 * 60 * 24));

            if (daysInServer < 7) return '🆕 Nuevo miembro';
            if (daysInServer < 30) return '👤 Miembro activo';
            if (daysInServer < 365) return '⭐ Miembro veterano';
            return '🏆 Miembro legendario';
        };

        const getCommunicationStatus = (member) => {
            if (member.isCommunicationDisabled()) {
                const timeout = member.communicationDisabledUntil;
                if (timeout) {
                    const timeLeft = timeout.getTime() - Date.now();
                    const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
                    return `🔇 Silenciado por ${hoursLeft}h más`;
                }
                return '🔇 Silenciado permanentemente';
            }
            return '✅ Puede comunicarse';
        };

        const getLastActivity = (member) => {
            const lastMessage = member.lastMessageAt;
            if (lastMessage) {
                return `<t:${Math.floor(lastMessage.getTime() / 1000)}:R>`;
            }
            return 'Nunca ha enviado mensajes';
        };

        const embed = new EmbedBuilder()
            .setTitle(`👤 Información de ${targetUser.displayName}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor(targetMember.displayColor || 0x5865F2)
            .addFields(
                {
                    name: '👤 Información del Usuario',
                    value: `**Nombre de usuario:** ${targetUser.username}\n**ID:** \`${targetUser.id}\`\n**Bot:** ${targetUser.bot ? '🤖 Sí' : '👤 No'}\n**Cuenta creada:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
                    inline: false
                },
                {
                    name: '🏠 Información del Servidor',
                    value: `**Se unió:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n**Apodo:** ${targetMember.nickname || 'Ninguno'}\n**Booster:** ${targetMember.premiumSince ? `💎 Desde <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>` : '❌ No'}\n**Color:** ${targetMember.displayHexColor || 'Por defecto'}`,
                    inline: false
                },
                {
                    name: '🛡️ Estado del Miembro',
                    value: `**Estado:** ${getMemberStatus(targetMember)}\n**Comunicación:** ${getCommunicationStatus(targetMember)}\n**Última actividad:** ${getLastActivity(targetMember)}`,
                    inline: false
                },
                {
                    name: '🟢 Estado del Usuario',
                    value: `**Estado:** ${getStatusEmoji(targetMember.presence?.status)} ${getStatusText(targetMember.presence?.status)}\n**Actividad:** ${targetMember.presence?.activities?.[0]?.name || 'Ninguna'}\n**Dispositivo:** ${getDeviceInfo(targetMember.presence?.clientStatus)}`,
                    inline: false
                },
                {
                    name: '🎭 Roles y Permisos',
                    value: `**Roles (${targetMember.roles.cache.size - 1}):** ${getRolesList(targetMember)}\n**Permisos clave:** ${getKeyPermissions(targetMember)}`,
                    inline: false
                },
                {
                    name: '🏅 Discord Badges',
                    value: getUserBadges(targetUser.flags),
                    inline: false
                }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};