// Archivo: src/events/messageCreate.js

/**
 * @file messageCreate.js
 * @description Evento 'messageCreate' para auto-respuestas, automoderación y comandos con prefijo de CodeCord.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
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

        const [prefixCommand, ...commandArguments] = content.split(/\s+/);
        const commandName = prefixCommand.toLowerCase();

        if (commandName === '!ban') {
            const voiceChannel = message.member.voice?.channel;
            if (!voiceChannel || !client.tempVoiceChannels.has(voiceChannel.id)) {
                return message.reply('❌ Debes estar dentro de una sala temporal para usar `!ban`.');
            }

            const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
            if (ownerId !== message.author.id) {
                return message.reply('❌ Solo el dueño de la sala puede usar `!ban`.');
            }

            const targetId = commandArguments[0]?.replace(/[^0-9]/g, '');
            const targetMember = message.mentions.members.first() || (targetId && /^\d{17,20}$/.test(targetId)
                ? await message.guild.members.fetch(targetId).catch(() => null)
                : null);
            if (!targetMember) {
                return message.reply('❌ Usa `!ban @usuario` o `!ban ID` para bloquearlo en la sala.');
            }
            if (targetMember.id === message.author.id) {
                return message.reply('❌ No puedes bloquearte a ti mismo.');
            }
            await voiceChannel.permissionOverwrites.edit(targetMember.id, { Connect: false });
            if (targetMember.voice.channelId === voiceChannel.id) {
                await targetMember.voice.setChannel(null, `Bloqueado de la sala por ${message.author.tag}`);
            }
            return message.reply(`🚫 **${targetMember.user.tag}** ha sido bloqueado de esta sala temporal.`);
        }

        if (commandName === '!unban') {
            const mentionedUser = message.mentions.users.first();
            const rawUserId = commandArguments.find(argument => /^<?@!?\d{17,20}>?$/.test(argument)) || commandArguments[0];
            const userId = mentionedUser?.id || rawUserId?.replace(/[^0-9]/g, '');
            if (!userId || !/^\d{17,20}$/.test(userId)) {
                return message.reply('❌ Usa `!unban @usuario` o `!unban ID`.');
            }

            const voiceChannel = message.member.voice?.channel;
            const isTemporaryOwner = voiceChannel && client.tempVoiceChannels.has(voiceChannel.id) && client.tempVoiceChannelOwners.get(voiceChannel.id) === message.author.id;
            if (isTemporaryOwner) {
                const blockedOverwrite = voiceChannel.permissionOverwrites.cache.get(userId);
                if (!blockedOverwrite?.deny.has(PermissionsBitField.Flags.Connect)) {
                    return message.reply('❌ Ese usuario no está bloqueado en esta sala temporal.');
                }
                await voiceChannel.permissionOverwrites.delete(userId);
                return message.reply(`🔓 <@${userId}> ya puede volver a entrar en la sala temporal.`);
            }

            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply('❌ No tienes permisos para desbanear miembros.');
            }

            const bannedUser = await message.guild.bans.fetch(userId).catch(() => null);
            if (!bannedUser) {
                return message.reply('❌ Ese usuario no está baneado o no existe en la lista de baneos.');
            }

            await message.guild.members.unban(userId, `Desbaneado por ${message.author.tag} mediante !unban`);
            return message.reply(`🔓 **${bannedUser.user.tag}** ha sido desbaneado del servidor.`);
        }

        if (commandName === '!8ball') {
            const responses = ['En mi opinión, sí.', 'Sin duda.', 'Sí, definitivamente.', 'Pregunta de nuevo más tarde.', 'Mi respuesta es no.', 'Muy dudoso.'];
            const response = responses[Math.floor(Math.random() * responses.length)];
            const question = commandArguments.join(' ') || '¿CodeCord es el mejor bot?';
            return message.reply({ embeds: [new EmbedBuilder()
                .setTitle('🎱 Bola 8 Mágica | CodeCord')
                .addFields({ name: '❓ Pregunta', value: question }, { name: '🔮 Respuesta', value: response })
                .setColor(0x9B59B6)] });
        }

        if (commandName === '!coinflip') {
            const result = Math.random() < 0.5 ? '🪙 **CARA**' : '🪙 **CRUZ**';
            return message.reply({ embeds: [new EmbedBuilder().setTitle('🪙 Lanzamiento de Moneda | CodeCord').setDescription(`Resultado: ${result}`).setColor(0xF1C40F)] });
        }

        if (commandName === '!dado') {
            const roll = Math.floor(Math.random() * 6) + 1;
            return message.reply({ embeds: [new EmbedBuilder().setTitle('🎲 Lanzamiento de Dado | CodeCord').setDescription(`Obtuviste un: **${roll}** 🎲`).setColor(0xE74C3C)] });
        }

        if (commandName === '!rps') {
            const choices = ['piedra', 'papel', 'tijera'];
            const userChoice = (commandArguments[0] || '').toLowerCase();
            if (!choices.includes(userChoice)) return message.reply('❌ Usa `!rps piedra`, `!rps papel` o `!rps tijera`.');
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            const won = (userChoice === 'piedra' && botChoice === 'tijera') || (userChoice === 'papel' && botChoice === 'piedra') || (userChoice === 'tijera' && botChoice === 'papel');
            const result = userChoice === botChoice ? '¡Empate! 🤝' : won ? '¡Ganaste tú! 🎉' : '¡Gano yo (CodeCord)! 🤖';
            return message.reply({ embeds: [new EmbedBuilder().setTitle('✂️ Piedra, Papel o Tijera | CodeCord').addFields({ name: 'Tu elección', value: userChoice, inline: true }, { name: 'Elección de CodeCord', value: botChoice, inline: true }, { name: 'Resultado', value: result }).setColor(0x3498DB)] });
        }

        if (commandName === '!ship') {
            const mentionedUsers = [...message.mentions.users.values()];
            if (mentionedUsers.length < 2) return message.reply('❌ Usa `!ship @usuario1 @usuario2`.');
            const [person1, person2] = mentionedUsers;
            const percentage = (parseInt(person1.id.slice(-8), 16) + parseInt(person2.id.slice(-8), 16)) % 101;
            const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
            return message.reply({ embeds: [new EmbedBuilder().setTitle('💕 Ship Compatibility').setDescription(`**${person1.username}** 💘 **${person2.username}**\n\n${bar}\n\n**${percentage}%**`).setColor(0xFF69B4)] });
        }

        if (commandName === '!trivia') {
            const questions = [
                { question: '¿Cuál es el planeta más grande?', answers: ['Tierra', 'Marte', 'Júpiter', 'Saturno'], correct: 2 },
                { question: '¿En qué año llegó el hombre a la Luna?', answers: ['1965', '1967', '1969', '1971'], correct: 2 },
                { question: '¿Cuál es el océano más grande?', answers: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'], correct: 3 }
            ];
            const question = questions[Math.floor(Math.random() * questions.length)];
            const row = new ActionRowBuilder().addComponents(...question.answers.map((answer, index) => new ButtonBuilder().setCustomId(`prefix_trivia_${index}`).setLabel(answer).setStyle(ButtonStyle.Primary)));
            const quizMessage = await message.channel.send({ embeds: [new EmbedBuilder().setTitle('🧠 ¡Trivia!').setDescription(question.question).setColor(0x0099FF)], components: [row] });
            const collector = quizMessage.createMessageComponentCollector({ time: 15000, max: 1, filter: buttonInteraction => buttonInteraction.user.id === message.author.id && buttonInteraction.customId.startsWith('prefix_trivia_') });
            collector.on('collect', buttonInteraction => buttonInteraction.update({ content: buttonInteraction.customId.endsWith(`_${question.correct}`) ? '✅ ¡Correcto!' : `❌ Incorrecto. La respuesta era **${question.answers[question.correct]}**.`, embeds: [], components: [] }));
            collector.on('end', collected => { if (collected.size === 0) quizMessage.edit({ content: `⏰ Tiempo agotado. La respuesta era **${question.answers[question.correct]}**.`, components: [] }).catch(() => {}); });
            return;
        }

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
                    '🎲 `!dado` · `!coinflip`\n' +
                    '🎯 `!trivia` · `!rps piedra|papel|tijera`\n' +
                    '😂 `!8ball [pregunta]` · `!ship @usuario1 @usuario2`')
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
