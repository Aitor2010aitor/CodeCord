// Archivo: src/systems/autoResponseSystem.js

/**
 * @file autoResponseSystem.js
 * @description Sistema dinámico de auto-respuestas para CodeCord.
 */

const { EmbedBuilder } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');

/**
 * Procesa las auto-respuestas configuradas en la guild para el mensaje actual.
 * @param {Message} message 
 * @returns {Promise<boolean>} Retorna true si se envió una auto-respuesta.
 */
async function processAutoResponses(message) {
    if (!message.guild || message.author.bot) return false;

    try {
        const guildResponses = configManager.loadGuildConfig(message.guild.id, 'autoresponses', []);
        if (!guildResponses || !Array.isArray(guildResponses) || guildResponses.length === 0) return false;

        if (!message.content || message.content.trim() === '') {
            console.warn(`[CodeCord AUTO-RESPUESTAS] Mensaje vacío en "${message.guild.name}". Verifica el Message Content Intent.`);
            return false;
        }

        for (const ar of guildResponses) {
            if (!ar.enabled || !ar.trigger) continue;

            if (ar.enabledChannels && ar.enabledChannels.length > 0 && !ar.enabledChannels.includes(message.channel.id)) continue;
            if (ar.disabledChannels && ar.disabledChannels.length > 0 && ar.disabledChannels.includes(message.channel.id)) continue;

            if (ar.enabledRoles && ar.enabledRoles.length > 0) {
                if (!message.member || !message.member.roles || !ar.enabledRoles.some(rId => message.member.roles.cache.has(rId))) continue;
            }
            if (ar.disabledRoles && ar.disabledRoles.length > 0) {
                if (message.member && message.member.roles && ar.disabledRoles.some(rId => message.member.roles.cache.has(rId))) continue;
            }

            const msgLower = (message.content || '').trim().toLowerCase();
            const triggerLower = ar.trigger.trim().toLowerCase();
            let matches = false;

            if (ar.wildcard) {
                matches = msgLower.includes(triggerLower);
            } else {
                matches = msgLower === triggerLower;
            }

            if (matches) {
                console.log(`[CodeCord AUTO-RESPUESTAS] Disparador "${ar.trigger}" usado por ${message.author.tag} (${message.author.id}) en "${message.guild.name}" | Canal: #${message.channel.name}`);

                let responseText = ar.response || '';
                if (ar.randomResponses && ar.randomResponses.length > 0) {
                    const allResponses = responseText ? [responseText, ...ar.randomResponses] : ar.randomResponses;
                    responseText = allResponses[Math.floor(Math.random() * allResponses.length)];
                }

                const replaceVars = (str) => {
                    if (!str) return '';
                    return str
                        .replace(/\{user\}/g, `<@${message.author.id}>`)
                        .replace(/\{username\}/g, message.author.username)
                        .replace(/\{server\}/g, message.guild.name);
                };

                responseText = replaceVars(responseText);

                if (ar.type === 'embed') {
                    const embed = new EmbedBuilder();

                    const embedTitle = replaceVars(ar.embedTitle);
                    const embedDesc = replaceVars(ar.embedDesc || responseText);
                    const embedColor = ar.embedColor || '#5865F2';

                    if (embedTitle) embed.setTitle(embedTitle);
                    if (embedDesc) embed.setDescription(embedDesc);
                    if (embedColor) {
                        try {
                            embed.setColor(embedColor);
                        } catch (e) {
                            embed.setColor(0x5865F2);
                        }
                    }

                    if (ar.embedThumbnail) embed.setThumbnail(ar.embedThumbnail);
                    if (ar.embedImage) embed.setImage(ar.embedImage);
                    if (ar.embedFooter) embed.setFooter({ text: replaceVars(ar.embedFooter) });

                    await message.channel.send({ embeds: [embed] });
                } else {
                    await message.channel.send(responseText);
                }

                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error procesando auto-respuestas:', error);
        return false;
    }
}

module.exports = {
    processAutoResponses
};
