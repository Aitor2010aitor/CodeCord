// Archivo: src/commands/administradores/nex.js

/**
 * @file nex.js
 * @description Comando /nex para mover al siguiente usuario en la cola de atención de soporte de voz.
 */

const { findLogChannel, findSupportChannels } = require('../../systems/voiceSystem.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'nex',
    description: 'Mueve al siguiente usuario en la cola de soporte de voz',
    /**
     * Ejecuta el comando nex.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const logChannel = findLogChannel(interaction.guild);
        const isLogChannel = logChannel && interaction.channel.id === logChannel.id;

        if (!isLogChannel) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en el canal de logs/soporte de voz.', flags: MessageFlags.Ephemeral });
        }

        const nextRoleId = client.voiceSupportNextRole.get(interaction.guild.id);
        const staffRoleId = client.voiceSupportStaffRole.get(interaction.guild.id);

        const hasNextRole = nextRoleId && interaction.member.roles.cache.has(nextRoleId);
        const hasStaffRole = staffRoleId && interaction.member.roles.cache.has(staffRoleId);

        if (!hasNextRole && !hasStaffRole && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ No tienes el rol de soporte de voz para atender la cola.', flags: MessageFlags.Ephemeral });
        }

        const queue = client.voiceSupportQueue.get(interaction.guild.id);
        if (!queue || queue.length === 0) {
            return interaction.reply({ content: '❌ No hay usuarios en la cola de espera.', flags: MessageFlags.Ephemeral });
        }

        const supportChannels = findSupportChannels(interaction.guild);
        if (supportChannels.size === 0) {
            return interaction.reply({ content: '❌ No se encontraron canales de soporte de voz.', flags: MessageFlags.Ephemeral });
        }

        let targetChannel = null;
        for (const ch of supportChannels.values()) {
            if (ch.members.has(interaction.user.id)) {
                targetChannel = ch;
                break;
            }
        }

        if (!targetChannel) targetChannel = supportChannels.first();

        const nextUserId = queue.shift();
        client.voiceSupportQueue.set(interaction.guild.id, queue);

        const memberToMove = await interaction.guild.members.fetch(nextUserId).catch(() => null);
        if (memberToMove && memberToMove.voice.channel) {
            await memberToMove.voice.setChannel(targetChannel).catch(() => {});
            await interaction.reply({ content: `✅ **${memberToMove.user.tag}** movido exitosamente a **${targetChannel.name}**.` });
        } else {
            await interaction.reply({ content: `⚠️ El usuario <@${nextUserId}> ya no está en la sala de espera.` });
        }
    }
};
