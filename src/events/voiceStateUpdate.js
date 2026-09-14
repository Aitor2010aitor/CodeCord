// Archivo: src/events/voiceStateUpdate.js

/**
 * @file voiceStateUpdate.js
 * @description Evento 'voiceStateUpdate' para gestión de salas temporales y colas de espera de voz.
 */

const { ChannelType, PermissionsBitField } = require('discord.js');
const { isWaitingRoom, buildVoiceInterfacePanel } = require('../systems/voiceSystem.js');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    /**
     * Ejecución cuando cambia el estado de voz de un miembro.
     * @param {VoiceState} oldState 
     * @param {VoiceState} newState 
     * @param {Client} client 
     */
    async execute(oldState, newState, client) {
        try {
            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            const guild = newState.guild || oldState.guild;
            const joinedChannel = newState.channel;
            const leftChannel = oldState.channel;

            // 1. Gestión de colas de soporte de voz
            if (joinedChannel && isWaitingRoom(joinedChannel)) {
                if (!client.voiceSupportWaitingTime.has(guild.id)) {
                    client.voiceSupportWaitingTime.set(guild.id, new Map());
                }
                const waitingTimes = client.voiceSupportWaitingTime.get(guild.id);
                if (!waitingTimes.has(member.id)) {
                    waitingTimes.set(member.id, Date.now());
                }

                if (!client.voiceSupportQueue.has(guild.id)) {
                    client.voiceSupportQueue.set(guild.id, []);
                }
                const queue = client.voiceSupportQueue.get(guild.id);
                if (!queue.includes(member.id)) {
                    queue.push(member.id);
                    client.voiceSupportQueue.set(guild.id, queue);
                }
            }

            if (leftChannel && isWaitingRoom(leftChannel) && (!joinedChannel || !isWaitingRoom(joinedChannel))) {
                if (client.voiceSupportWaitingTime.has(guild.id)) {
                    client.voiceSupportWaitingTime.get(guild.id).delete(member.id);
                }
                if (client.voiceSupportQueue.has(guild.id)) {
                    const queue = client.voiceSupportQueue.get(guild.id);
                    const idx = queue.indexOf(member.id);
                    if (idx !== -1) {
                        queue.splice(idx, 1);
                        client.voiceSupportQueue.set(guild.id, queue);
                    }
                }
            }

            // 2. Creación de salas temporales
            if (joinedChannel && (joinedChannel.name === '🔊 Crear sala' || joinedChannel.name.includes('Crear sala'))) {
                const privateChannel = await guild.channels.create({
                    name: `🔊 Sala de ${member.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: joinedChannel.parent ?? null,
                    permissionOverwrites: [
                        { id: member.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.ManageChannels] }
                    ]
                });

                client.tempVoiceChannels.add(privateChannel.id);
                client.tempVoiceChannelOwners.set(privateChannel.id, member.id);
                await member.voice.setChannel(privateChannel).catch(() => {});

                setTimeout(async () => {
                    const interfacePanel = buildVoiceInterfacePanel();
                    await privateChannel.send({ content: `${member}`, embeds: [interfacePanel.embed], components: interfacePanel.rows }).catch(() => {});
                }, 1500);
            }

            // 3. Eliminación de salas temporales vacías
            if (leftChannel && client.tempVoiceChannels.has(leftChannel.id) && leftChannel.members.size === 0) {
                await leftChannel.delete('Sala temporal vacía').catch(() => {});
                client.tempVoiceChannels.delete(leftChannel.id);
                client.tempVoiceChannelOwners.delete(leftChannel.id);
            }

        } catch (error) {
            console.error('❌ Error en el evento voiceStateUpdate:', error);
        }
    }
};
