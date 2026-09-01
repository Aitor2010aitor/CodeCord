// Archivo: src/events/logEvents.js

/**
 * @file logEvents.js
 * @description Eventos de auditoría de Discord.js v14 (canales, mensajes, baneos, roles, hilos, webhooks) para CodeCord.
 */

const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const { sendLogEmbed } = require('../systems/loggerSystem.js');
const { getAntiRaidSettings, isWhitelisted } = require('../systems/antiRaidSystem.js');

module.exports = [
    // 1. Mensaje Eliminado
    {
        name: 'messageDelete',
        once: false,
        async execute(message, client) {
            if (!message.guild || message.author?.bot) return;
            try {
                const authorTag = message.author?.tag || 'Desconocido';
                const content = message.content || '*Mensaje no disponible (borrado antes de caché)*';

                const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete }).catch(() => null);
                const deletionLog = fetchedLogs?.entries.first();
                let executor = 'El propio autor (autoborrado)';

                if (deletionLog) {
                    const { executor: user, target, createdTimestamp } = deletionLog;
                    if (target?.id === message.author?.id && (Date.now() - createdTimestamp) < 5000) {
                        executor = `${user.tag} (${user.id})`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ Mensaje Eliminado')
                    .setDescription(`**Autor:** ${authorTag}\n**Canal:** ${message.channel}\n**Eliminado por:** ${executor}`)
                    .addFields({ name: '📝 Contenido', value: content.substring(0, 1024) })
                    .setColor(0xFF0000)
                    .setTimestamp();

                await sendLogEmbed(message.guild, embed, 'messageDelete');
            } catch (error) {
                console.error('Error en log messageDelete:', error);
            }
        }
    },

    // 2. Mensaje Editado
    {
        name: 'messageUpdate',
        once: false,
        async execute(oldMessage, newMessage, client) {
            if (!oldMessage.guild || oldMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;

            try {
                const embed = new EmbedBuilder()
                    .setTitle('✏️ Mensaje Editado')
                    .setDescription(`**Autor:** ${oldMessage.author.tag}\n**Canal:** ${oldMessage.channel}\n[Ir al mensaje](${newMessage.url})`)
                    .addFields(
                        { name: 'Ante del cambio', value: (oldMessage.content || '*Vacío*').substring(0, 1024) },
                        { name: 'Después del cambio', value: (newMessage.content || '*Vacío*').substring(0, 1024) }
                    )
                    .setColor(0xFFA500)
                    .setTimestamp();

                await sendLogEmbed(oldMessage.guild, embed, 'messageUpdate');
            } catch (error) {
                console.error('Error en log messageUpdate:', error);
            }
        }
    },

    // 3. Baneo Añadido
    {
        name: 'guildBanAdd',
        once: false,
        async execute(ban, client) {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🔨 Usuario Baneado')
                    .setThumbnail(ban.user.displayAvatarURL())
                    .addFields(
                        { name: 'Usuario', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                        { name: 'Razón', value: ban.reason || 'Sin razón especificada', inline: true }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();

                await sendLogEmbed(ban.guild, embed, 'guildBanAdd');
            } catch (error) {
                console.error('Error en log guildBanAdd:', error);
            }
        }
    },

    // 4. Baneo Removido (Desbaneo)
    {
        name: 'guildBanRemove',
        once: false,
        async execute(ban, client) {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🔓 Usuario Desbaneado')
                    .setThumbnail(ban.user.displayAvatarURL())
                    .addFields({ name: 'Usuario', value: `${ban.user.tag} (${ban.user.id})`, inline: true })
                    .setColor(0x00FF00)
                    .setTimestamp();

                await sendLogEmbed(ban.guild, embed, 'guildBanRemove');
            } catch (error) {
                console.error('Error en log guildBanRemove:', error);
            }
        }
    },

    // 5. Creación de Canal
    {
        name: 'channelCreate',
        once: false,
        async execute(channel, client) {
            if (!channel.guild) return;
            try {
                const settings = getAntiRaidSettings(client, channel.guild.id);
                if (settings.antiChannelSpam) {
                    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
                    const createLog = auditLogs?.entries.first();
                    if (createLog && !createLog.executor.bot && !isWhitelisted(client, channel.guild.id, createLog.executor.id)) {
                        const key = `${channel.guild.id}-${createLog.executor.id}`;
                        if (!client.antiRaid.channelActions.has(key)) client.antiRaid.channelActions.set(key, []);
                        const tracker = client.antiRaid.channelActions.get(key);
                        const now = Date.now();
                        tracker.push({ time: now, action: 'create' });

                        const recent = tracker.filter(a => now - a.time < settings.channelTimeWindow);
                        client.antiRaid.channelActions.set(key, recent);

                        if (recent.length > settings.maxChannelActions) {
                            const member = await channel.guild.members.fetch(createLog.executor.id).catch(() => null);
                            if (member && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                                await member.roles.set([], 'Spam de creación de canales - AntiRaid');
                            }
                        }
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('📁 Canal Creado')
                    .addFields(
                        { name: 'Nombre', value: channel.name, inline: true },
                        { name: 'Tipo', value: String(channel.type), inline: true },
                        { name: 'ID', value: channel.id, inline: true }
                    )
                    .setColor(0x00FF00)
                    .setTimestamp();

                await sendLogEmbed(channel.guild, embed, 'channelCreate');
            } catch (error) {
                console.error('Error en log channelCreate:', error);
            }
        }
    },

    // 6. Eliminación de Canal
    {
        name: 'channelDelete',
        once: false,
        async execute(channel, client) {
            if (!channel.guild) return;
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🗑️ Canal Eliminado')
                    .addFields(
                        { name: 'Nombre', value: channel.name, inline: true },
                        { name: 'ID', value: channel.id, inline: true }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();

                await sendLogEmbed(channel.guild, embed, 'channelDelete');
            } catch (error) {
                console.error('Error en log channelDelete:', error);
            }
        }
    }
];
