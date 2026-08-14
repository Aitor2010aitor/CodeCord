// Archivo: src/events/guildMemberAdd.js

/**
 * @file guildMemberAdd.js
 * @description Evento 'guildMemberAdd' para bienvenidas y asignación de autorol en CodeCord.
 */

const { EmbedBuilder } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');
const { processWelcomeMember } = require('../systems/welcomeSystem.js');
const { sendLogEmbed } = require('../systems/loggerSystem.js');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    /**
     * Ejecución cuando un usuario se une al servidor.
     * @param {GuildMember} member 
     * @param {Client} client 
     */
    async execute(member, client) {
        try {
            console.log(`👤 [CodeCord] Nuevo miembro: ${member.user.tag} (${member.user.id}) en ${member.guild.name} (${member.guild.id}) | Miembros: ${member.guild.memberCount}`);

            // 1. Auto-rol al entrar
            try {
                const modConfig = configManager.loadGuildConfig(member.guild.id, 'moderation', null);
                if (modConfig && modConfig.autorole && modConfig.autorole.enabled && modConfig.autorole.roleId) {
                    const role = member.guild.roles.cache.get(modConfig.autorole.roleId);
                    if (role) {
                        await member.roles.add(role).catch(err => console.error('Error en AutoRol:', err));
                    }
                }
            } catch (err) {
                console.error('Error procesando AutoRol:', err);
            }

            // 2. Tarjeta y mensaje de bienvenida pro
            await processWelcomeMember(member);

            // 3. Log de entrada de usuario
            const joinEmbed = new EmbedBuilder()
                .setTitle('📥 Usuario Unido')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'Usuario', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                    { name: 'ID del Usuario', value: member.id, inline: true },
                    { name: 'Cuenta Creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await sendLogEmbed(member.guild, joinEmbed, 'MEMBER_JOIN');

        } catch (error) {
            console.error('❌ Error en el evento guildMemberAdd:', error);
        }
    }
};
