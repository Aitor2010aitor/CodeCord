const { EmbedBuilder } = require('discord.js');

function buildNewVideoEmbed(profileConfig, userInfo, newVideoCount, profileUrl) {
    return new EmbedBuilder()
        .setColor('#000000')
        .setTitle(`🎵 ${userInfo.nickname} publicó en TikTok`)
        .setURL(profileUrl)
        .setAuthor({
            name: profileConfig.displayName || userInfo.nickname,
            iconURL: userInfo.avatar || 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png'
        })
        .setDescription(
            `**${profileConfig.displayName || userInfo.nickname}** ha publicado${newVideoCount > 1 ? ` ${newVideoCount} nuevos vídeos` : ' un nuevo vídeo'} en TikTok`
        )
        .setThumbnail(userInfo.avatar || 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png')
        .addFields(
            {
                name: '👁️ Seguidores',
                value: formatNumber(userInfo.followerCount),
                inline: true
            },
            {
                name: '🎥 Vídeos',
                value: formatNumber(userInfo.videoCount),
                inline: true
            },
            {
                name: '❤️ Likes',
                value: formatNumber(userInfo.heartCount),
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({ text: 'TikTok • Nuevo vídeo detectado' });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

async function sendNotification(client, guildId, profileConfig, embed, mentionRoleId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return false;

        const textChannel = guild.channels.cache.get(profileConfig.discordChannelId);
        if (!textChannel) return false;

        const permissions = textChannel.permissionsFor(client.user);
        if (!permissions || !permissions.has('SendMessages')) return false;

        const mentionText = mentionRoleId ? `<@&${mentionRoleId}> ` : '';
        await textChannel.send({ content: mentionText || null, embeds: [embed] });
        return true;
    } catch (e) {
        console.error(`[TikTok] Error enviando notificación a ${profileConfig.discordChannelId}:`, e.message);
        return false;
    }
}

module.exports = { buildNewVideoEmbed, sendNotification };
