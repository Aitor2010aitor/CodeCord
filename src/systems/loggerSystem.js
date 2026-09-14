// Archivo: src/systems/loggerSystem.js

/**
 * @file loggerSystem.js
 * @description Sistema centralizado de logs, auditoría y registro de actividad para CodeCord.
 */

const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionsBitField } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');

/**
 * Registra una actividad persistente para ser consumida por el Panel Web.
 * @param {string} guildId - ID del servidor.
 * @param {string} type - Tipo de evento (ej: 'MEMBER_JOIN', 'BAN', 'TICKET').
 * @param {string} message - Mensaje o resumen del evento.
 * @param {Object|null} [embedData=null] - Datos opcionales del embed.
 */
async function logBotActivity(guildId, type, message, embedData = null) {
    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const activityPath = path.join(dataDir, 'bot-activity.json');
    let activity = [];
    try {
        if (fs.existsSync(activityPath)) {
            activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
        }
    } catch (e) {}

    const entry = {
        guildId,
        type,
        message,
        timestamp: new Date().toISOString()
    };

    if (embedData) {
        entry.embed = {
            title: embedData.title || null,
            description: embedData.description || null,
            color: embedData.color || null,
            fields: embedData.fields || [],
            thumbnail: embedData.thumbnail || null,
            image: embedData.image || null,
            author: embedData.author || null,
            footer: embedData.footer || null
        };
    }

    activity.unshift(entry);

    if (activity.length > 50) activity = activity.slice(0, 50);

    try {
        fs.writeFileSync(activityPath, JSON.stringify(activity, null, 2), 'utf8');
    } catch (e) {}
}

/**
 * Encuentra un canal de log por defecto en la guild.
 * @param {Guild} guild 
 * @returns {TextChannel|null}
 */
function findLogChannel(guild) {
    return guild.channels.cache.find(ch =>
        ch.type === ChannelType.GuildText &&
        (ch.name.toLowerCase().includes('soporte-log') ||
            ch.name.toLowerCase().includes('support-log') ||
            ch.name.toLowerCase().includes('log-de-voz') ||
            ch.name.toLowerCase().includes('logs'))
    ) || null;
}

/**
 * Obtiene el canal de logs de la anti-raid según la configuración del bot.
 * @param {Guild} guild 
 * @returns {TextChannel|null}
 */
function getLogChannelByGuild(guild) {
    if (!guild || !guild.client || !guild.client.antiRaid) return null;
    const logChannelId = guild.client.antiRaid.logChannel.get(guild.id);
    if (!logChannelId) return null;
    return guild.channels.cache.get(logChannelId) || null;
}

/**
 * Elimina todos los mensajes recientes de un usuario en la guild.
 * @param {Guild} guild 
 * @param {string} userId 
 */
async function deleteUserMessagesInGuild(guild, userId) {
    try {
        console.log(`🧹 [CodeCord] Eliminando mensajes del usuario ${userId} en ${guild.name}`);
        const textChannels = guild.channels.cache.filter(c =>
            (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement || c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread) &&
            c.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.ViewChannel) &&
            c.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.ManageMessages)
        );

        const deletePromises = Array.from(textChannels.values()).map(async (channel) => {
            try {
                const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
                if (!messages) return;
                const userMessages = messages.filter(m => m.author.id === userId);
                if (userMessages.size > 0) {
                    await channel.bulkDelete(userMessages, true).catch(async () => {
                        for (const msg of userMessages.values()) {
                            await msg.delete().catch(() => {});
                        }
                    });
                }
            } catch (err) {
                console.error(`Error eliminando mensajes de ${userId} en canal ${channel.name}:`, err);
            }
        });

        await Promise.all(deletePromises);
        console.log(`✅ [CodeCord] Eliminación completada para el usuario ${userId}`);
    } catch (error) {
        console.error('Error en deleteUserMessagesInGuild:', error);
    }
}

/**
 * Envía un embed de log al canal configurado correspondiente.
 * @param {Guild} guild 
 * @param {EmbedBuilder} embed 
 * @param {string|null} [eventType=null] 
 */
async function sendLogEmbed(guild, embed, eventType = null) {
    try {
        await logBotActivity(guild.id, eventType || 'INFO', embed.data.title || embed.data.description || 'Evento sin descripción', embed.data);
        
        let granularConfig = null;
        if (eventType) {
            try {
                const allConfig = configManager.loadGuildConfig(guild.id, 'logs', {});
                granularConfig = allConfig[eventType];
            } catch (e) {
                console.error('Error leyendo config de logs:', e);
            }
        }

        let targetChannel = null;
        if (granularConfig && granularConfig.enabled && granularConfig.channel) {
            targetChannel = guild.channels.cache.get(granularConfig.channel);
            if (!targetChannel) {
                targetChannel = await guild.channels.fetch(granularConfig.channel).catch(() => null);
            }
        }

        if (!targetChannel) {
            targetChannel = getLogChannelByGuild(guild);
        }
        if (!targetChannel) {
            targetChannel = findLogChannel(guild);
        }

        if (targetChannel && targetChannel.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.SendMessages)) {
            await targetChannel.send({ embeds: [embed] }).catch(err => console.error('Error enviando log embed:', err));
        }
    } catch (error) {
        console.error('Error en sendLogEmbed:', error);
    }
}

/**
 * Carga la configuración de canales de logs al iniciar el bot.
 * @param {Client} client 
 */
function loadLogChannelConfig(client) {
    try {
        for (const guild of client.guilds.cache.values()) {
            const logsConfig = configManager.loadGuildConfig(guild.id, 'logs', {});
            if (!logsConfig || typeof logsConfig !== 'object') continue;

            let channelId = null;
            for (const eventKey in logsConfig) {
                const eventConfig = logsConfig[eventKey];
                if (eventConfig && typeof eventConfig === 'object' && typeof eventConfig.channel === 'string' && eventConfig.enabled) {
                    channelId = eventConfig.channel;
                    break;
                }
            }

            if (channelId) {
                client.antiRaid.logChannel.set(guild.id, channelId);
                console.log(`✅ [CodeCord] Canal de logs cargado para ${guild.name}: ${channelId}`);
            }
        }
    } catch (error) {
        console.error('Error cargando canales de logs al iniciar:', error);
    }
}

module.exports = {
    logBotActivity,
    findLogChannel,
    getLogChannelByGuild,
    deleteUserMessagesInGuild,
    sendLogEmbed,
    loadLogChannelConfig
};

