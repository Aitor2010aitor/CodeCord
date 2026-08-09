// Archivo: src/events/messageCreate.js

/**
 * @file messageCreate.js
 * @description Evento 'messageCreate' para auto-respuestas, automoderación y comandos con prefijo de CodeCord.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleAutoModCensorship } = require('../systems/antiRaidSystem.js');
const { processAutoResponses } = require('../systems/autoResponseSystem.js');
const { findLogChannel, findSupportChannels, findWaitingRoom } = require('../systems/voiceSystem.js');

module.exports = {
    name: 'messageCreate',
    once: false,
    /**
     * Ejecuta la lógica del evento messageCreate.
     * @param {Message} message 
     * @param {Client} client 
     */
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        // 1. automod / censura
        const isCensored = await handleAutoModCensorship(client, message);
        if (isCensored) return;

        // 2. auto-respuestas
        const isAutoResponded = await processAutoResponses(message);
        if (isAutoResponded) return;

        // 3. Comandos con prefijo '!'
        const content = message.content.trim();

        // Comando !juegos
        if (content.toLowerCase() === '!juegos') {
            const cooldownTime = 30000;
            const userCooldownKey = `${message.guild.id}-${message.author.id}`;

            if (client.juegosCooldowns.has(userCooldownKey)) {
                const expirationTime = client.juegosCooldowns.get(userCooldownKey) + cooldownTime;
                if (Date.now() < expirationTime) {
                    const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
                    return message.reply(`⏰ Espera **${timeLeft} segundos** antes de usar \`!juegos\` de nuevo.`)
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
                        .catch(() => {});
                }
            }

            client.juegosCooldowns.set(userCooldownKey, Date.now());

            const juegosEmbed = new EmbedBuilder()
                .setTitle('🎮 MENÚ DE COMANDOS DE JUEGOS | CodeCord')
                .setDescription('**Selecciona una categoría para ver los comandos:**\n\n' +
                    '🎲 **Juegos de Azar** - Dados, monedas y azar\n' +
                    '🎯 **Juegos Interactivos** - Trivia, RPS y más\n' +
                    '😂 **Diversión** - Memes y entretenimiento\n' +
                    '📚 **Ver Todo** - Todos los comandos juntos')
                .setColor(0xFF6B6B)
                .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('juegos_azar').setLabel('🎲 Azar').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('juegos_interactivos').setLabel('🎯 Interactivos').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('juegos_diversion').setLabel('😂 Diversión').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('juegos_todo').setLabel('📚 Ver Todo').setStyle(ButtonStyle.Danger)
            );

            await message.reply({ embeds: [juegosEmbed], components: [row] }).catch(() => {});
            return;
        }

        // Comando !nex o !next para atención de soporte de voz
        if (content.toLowerCase() === '!nex' || content.toLowerCase() === '!next') {
            const logChannel = findLogChannel(message.guild);
            const isLogChannel = logChannel && message.channel.id === logChannel.id;

            if (isLogChannel) {
                const nextRoleId = client.voiceSupportNextRole.get(message.guild.id);
                const staffRoleId = client.voiceSupportStaffRole.get(message.guild.id);

                const hasNextRole = nextRoleId && message.member.roles.cache.has(nextRoleId);
                const hasStaffRole = staffRoleId && message.member.roles.cache.has(staffRoleId);

                if (hasNextRole || hasStaffRole) {
                    const queue = client.voiceSupportQueue.get(message.guild.id);
                    if (!queue || queue.length === 0) {
                        return message.reply('❌ No hay usuarios en la cola de espera de soporte.');
                    }

                    const supportChannels = findSupportChannels(message.guild);
                    if (supportChannels.size === 0) {
                        return message.reply('❌ No se encontraron canales de soporte de voz.');
                    }

                    let targetChannel = null;
                    for (const ch of supportChannels.values()) {
                        if (ch.members.has(message.author.id)) {
                            targetChannel = ch;
                            break;
                        }
                    }

                    if (!targetChannel) {
                        targetChannel = supportChannels.first();
                    }

                    const nextUserId = queue.shift();
                    client.voiceSupportQueue.set(message.guild.id, queue);

                    const memberToMove = await message.guild.members.fetch(nextUserId).catch(() => null);
                    if (memberToMove && memberToMove.voice.channel) {
                        await memberToMove.voice.setChannel(targetChannel).catch(err => console.error('Error moviendo usuario:', err));
                        await message.reply(`✅ **${memberToMove.user.tag}** movido exitosamente a **${targetChannel.name}**.`);
                    } else {
                        await message.reply(`⚠️ El usuario <@${nextUserId}> ya no está en la sala de espera.`);
                    }
                }
            }
        }
    }
};
