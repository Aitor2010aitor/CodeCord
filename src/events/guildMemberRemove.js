// Archivo: src/events/guildMemberRemove.js

/**
 * @file guildMemberRemove.js
 * @description Evento 'guildMemberRemove' para registrar salidas de miembros en CodeCord.
 */

const { EmbedBuilder } = require('discord.js');
const { sendLogEmbed } = require('../systems/loggerSystem.js');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    /**
     * Ejecución cuando un usuario sale o es expulsado del servidor.
     * @param {GuildMember} member 
     * @param {Client} client 
     */
    async execute(member, client) {
        try {
            console.log(`📤 [CodeCord] Usuario salió: ${member.user.tag} de ${member.guild.name}`);

            const leaveEmbed = new EmbedBuilder()
                .setTitle('📤 Usuario Salido')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'Usuario', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: 'Unido el', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconocido', inline: true }
                )
                .setColor(0xFF0000)
                .setTimestamp();

            await sendLogEmbed(member.guild, leaveEmbed, 'MEMBER_LEAVE');
        } catch (error) {
            console.error('❌ Error en el evento guildMemberRemove:', error);
        }
    }
};
