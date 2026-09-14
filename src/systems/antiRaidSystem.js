// Archivo: src/systems/antiRaidSystem.js

/**
 * @file antiRaidSystem.js
 * @description Módulo de protección Anti-Raid y Automoderación para CodeCord.
 */

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');
const { sendLogEmbed } = require('./loggerSystem.js');

/**
 * Comprueba si un usuario está en la whitelist del servidor.
 * @param {Client} client 
 * @param {string} guildId 
 * @param {string} userId 
 * @returns {boolean}
 */
function isWhitelisted(client, guildId, userId) {
    const whitelist = client.antiRaid?.whitelist?.get(guildId) || [];
    return whitelist.includes(userId);
}

/**
 * Obtiene las configuraciones anti-raid del servidor.
 * @param {Client} client 
 * @param {string} guildId 
 * @returns {Object}
 */
function getAntiRaidSettings(client, guildId) {
    return client.antiRaid?.settings?.get(guildId) || {
        antiSpam: true,
        maxMessages: 5,
        timeWindow: 5000,
        antiChannelSpam: true,
        maxChannelActions: 3,
        channelTimeWindow: 60000,
        antiLinks: true,
        antiBots: true
    };
}

/**
 * Verifica si un miembro tiene permisos de gestión sobre la automoderación.
 * @param {Client} client 
 * @param {GuildMember} member 
 * @param {Guild} guild 
 * @returns {boolean}
 */
function canManageAutoMod(client, member, guild) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    const adminRoleId = client.antiRaid?.adminRole?.get(guild.id);
    return adminRoleId ? member.roles.cache.has(adminRoleId) : false;
}

/**
 * Evalúa y aplica la censura y automoderación sobre un mensaje de Discord.
 * @param {Client} client 
 * @param {Message} message 
 * @returns {Promise<boolean>} Retorna true si el mensaje fue censurado/eliminado.
 */
async function handleAutoModCensorship(client, message) {
    if (!message.guild || message.author.bot) return false;

    try {
        const modConfig = configManager.loadGuildConfig(message.guild.id, 'moderation', null);
        if (!modConfig || !modConfig.censorship) return false;

        const censorship = modConfig.censorship;
        const hasChannelsConfigured = censorship.channels && censorship.channels.length > 0;
        const applyCensorship = !hasChannelsConfigured || censorship.channels.includes(message.channel.id);

        if (!applyCensorship) return false;

        const isExempt = canManageAutoMod(client, message.member, message.guild);
        if (isExempt) return false;

        let censored = false;
        let reason = '';
        let detail = '';

        // 1. Filtro de Mayúsculas
        if (censorship.capsEnabled) {
            const minLength = censorship.capsMinLength !== undefined ? censorship.capsMinLength : 3;
            const pctThreshold = censorship.capsPercentage !== undefined ? censorship.capsPercentage : 70;
            const textOnly = message.content.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');

            if (textOnly.length >= minLength) {
                let capsCount = 0;
                for (let i = 0; i < textOnly.length; i++) {
                    if (textOnly[i] === textOnly[i].toUpperCase() && textOnly[i] !== textOnly[i].toLowerCase()) {
                        capsCount++;
                    }
                }
                const pct = (capsCount / textOnly.length) * 100;
                if (pct >= pctThreshold) {
                    censored = true;
                    reason = 'Exceso de Mayúsculas';
                    detail = `Mensaje con ${Math.round(pct)}% de mayúsculas (límite: ${pctThreshold}%)`;
                }
            }
        }

        // 2. Filtro de Palabras Prohibidas
        if (!censored && censorship.wordsEnabled && censorship.blockedWords && censorship.blockedWords.length > 0) {
            const contentLower = message.content.toLowerCase();
            const triggeredWord = censorship.blockedWords.find(word => {
                const cleanWord = word.trim().toLowerCase();
                if (!cleanWord) return false;
                const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(^|[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑüÜ])${escapedWord}([^a-zA-Z0-9áéíóúñÁÉÍÓÚÑüÜ]|$)`, 'i');
                return regex.test(contentLower);
            });

            if (triggeredWord) {
                censored = true;
                reason = 'Palabra Prohibida';
                detail = `Contiene la palabra censurada: "${triggeredWord}"`;
            }
        }

        // 3. Filtro de Imágenes
        if (!censored && censorship.imagesEnabled) {
            const hasImageAttachment = message.attachments.some(att => att.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name || ''));
            const hasImageUrl = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i.test(message.content);

            if (hasImageAttachment || hasImageUrl) {
                censored = true;
                reason = 'Imagen No Permitida';
                detail = hasImageAttachment ? 'Contiene archivo de imagen adjunto' : 'Contiene enlace a una imagen';
            }
        }

        if (censored) {
            await message.delete().catch(() => {});

            if (censorship.alertChannel !== false) {
                const alertEmbed = new EmbedBuilder()
                    .setTitle('🛡️ CodeCord Moderación')
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`🚫 <@${message.author.id}>, tu mensaje ha sido eliminado.\n\n**Razón:** ${reason}\n**Canal:** ${message.channel}`)
                    .setColor(0xFF0000)
                    .setFooter({ text: 'CodeCord AutoMod' })
                    .setTimestamp();

                const alertMsg = await message.channel.send({ embeds: [alertEmbed] }).catch(() => null);
                if (alertMsg) {
                    setTimeout(() => alertMsg.delete().catch(() => {}), 8000);
                }
            }

            const logEmbed = new EmbedBuilder()
                .setTitle('🛡️ Mensaje Censurado por CodeCord AutoMod')
                .addFields(
                    { name: 'Usuario', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Canal', value: `${message.channel.name} (${message.channel.id})`, inline: true },
                    { name: 'Razón', value: reason, inline: true },
                    { name: 'Detalle', value: detail, inline: false },
                    { name: 'Contenido Original', value: message.content ? `\`\`\`${message.content.slice(0, 1000)}\`\`\`` : '*[Sin contenido de texto]*', inline: false }
                )
                .setColor(0xFF0000)
                .setTimestamp();

            await sendLogEmbed(message.guild, logEmbed, 'AUTOMOD_CENSOR');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error en handleAutoModCensorship:', error);
        return false;
    }
}

module.exports = {
    isWhitelisted,
    getAntiRaidSettings,
    canManageAutoMod,
    handleAutoModCensorship
};
