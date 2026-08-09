// Archivo: src/systems/voiceSystem.js

/**
 * @file voiceSystem.js
 * @description Sistema de soporte de voz, salas temporales e interfaz de control para CodeCord.
 */

const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Comprueba si un canal de voz es una sala de espera de soporte.
 * @param {GuildChannel} channel 
 * @returns {boolean}
 */
function isWaitingRoom(channel) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return false;
    const name = channel.name.toLowerCase();
    return name.includes('espera') || name.includes('waiting') || name.includes('sala-de-espera');
}

/**
 * Comprueba si un canal de voz es un canal de atención de soporte.
 * @param {GuildChannel} channel 
 * @returns {boolean}
 */
function isSupportChannel(channel) {
    if (!channel || channel.type !== ChannelType.GuildVoice) return false;
    const name = channel.name.toLowerCase();
    return (name.includes('soporte') || name.includes('support')) && !isWaitingRoom(channel);
}

/**
 * Busca la sala de espera de soporte en la guild.
 * @param {Guild} guild 
 * @returns {VoiceChannel|null}
 */
function findWaitingRoom(guild) {
    return guild.channels.cache.find(ch => isWaitingRoom(ch)) || null;
}

/**
 * Obtiene la colección de canales de soporte de voz en la guild.
 * @param {Guild} guild 
 * @returns {Collection<string, VoiceChannel>}
 */
function findSupportChannels(guild) {
    return guild.channels.cache.filter(ch => isSupportChannel(ch));
}

/**
 * Verifica si un miembro posee el rol de staff de soporte de voz.
 * @param {GuildMember} member 
 * @param {Guild} guild 
 * @returns {boolean}
 */
function hasSupportStaffRole(member, guild) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    const staffRoleId = guild.client.voiceSupportStaffRole?.get(guild.id);
    return staffRoleId ? member.roles.cache.has(staffRoleId) : false;
}

/**
 * Verifica si un usuario tiene permisos autorizados para usar comandos configurables.
 * @param {GuildMember} member 
 * @param {string} guildId 
 * @returns {boolean}
 */
function canUseCommand(member, guildId) {
    if (!member || !member.guild) return false;
    if (member.id === member.guild.ownerId) return true;

    const allowedRoles = member.client.commandRoles?.get(guildId);
    if (!allowedRoles || allowedRoles.length === 0) return true;

    return allowedRoles.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Construye el panel visual de control para salas de voz temporales.
 * @returns {{ embed: EmbedBuilder, rows: ActionRowBuilder[] }}
 */
function buildVoiceInterfacePanel() {
    const embed = new EmbedBuilder()
        .setTitle('🎶 Interfaz de Canales de Voz Temporales | CodeCord')
        .setDescription('Panel interactivo para controlar tu sala de voz privada.')
        .addFields(
            { name: '📝 Acciones disponibles:', value: '✏️ NOMBRE - Cambiar nombre del canal\n🎚️ LÍMITE - Establecer límite de usuarios\n🔒 PRIVACIDAD - Hacer canal privado/público\n📨 INVITAR - Invitar usuarios\n👢 EXPULSAR - Expulsar usuario (puede volver)\n🚫 BAN - Banear usuario (no puede volver)\n✅ UNBAN - Quitar ban de usuario\n👑 REIVINDICAR - Tomar control si el dueño se fue\n🔁 TRANSFERIR - Transferir propiedad\n🗑️ ELIMINAR - Eliminar canal' }
        )
        .setColor(0x00FFAA)
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vi_name').setLabel('NOMBRE').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('vi_limit').setLabel('LÍMITE').setStyle(ButtonStyle.Primary).setEmoji('🎚️'),
        new ButtonBuilder().setCustomId('vi_privacy').setLabel('PRIVACIDAD').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('vi_invite').setLabel('INVITAR').setStyle(ButtonStyle.Success).setEmoji('📨')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vi_kick').setLabel('EXPULSAR').setStyle(ButtonStyle.Danger).setEmoji('👢'),
        new ButtonBuilder().setCustomId('vi_ban').setLabel('BAN').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
        new ButtonBuilder().setCustomId('vi_unban').setLabel('UNBAN').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('vi_claim').setLabel('REIVINDICAR').setStyle(ButtonStyle.Success).setEmoji('👑'),
        new ButtonBuilder().setCustomId('vi_transfer').setLabel('TRANSFERIR').setStyle(ButtonStyle.Secondary).setEmoji('🔁')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vi_delete').setLabel('ELIMINAR').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
        new ButtonBuilder().setCustomId('vi_info').setLabel('INFO').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️')
    );

    return { embed, rows: [row1, row2, row3] };
}

module.exports = {
    isWaitingRoom,
    isSupportChannel,
    findWaitingRoom,
    findSupportChannels,
    hasSupportStaffRole,
    canUseCommand,
    buildVoiceInterfacePanel
};
