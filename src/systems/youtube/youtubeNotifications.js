const { EmbedBuilder } = require('discord.js');

function buildNewVideoEmbed(channelConfig, video, feed) {
    const videoUrl = `https://www.youtube.com/watch?v=${video.id?.replace('yt:video:', '') || ''}`;
    const thumbnail = `https://img.youtube.com/vi/${video.id?.replace('yt:video:', '') || ''}/maxresdefault.jpg`;
    const channelThumbnail = feed.image?.url || null;

    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(video.title || 'Nuevo vídeo en YouTube')
        .setURL(videoUrl)
        .setAuthor({
            name: channelConfig.channelName,
            iconURL: channelThumbnail || 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
        })
        .setDescription(video.contentSnippet ? video.contentSnippet.substring(0, 300) + '...' : '')
        .setThumbnail(thumbnail)
        .setTimestamp(new Date(video.pubDate || Date.now()))
        .setFooter({ text: 'YouTube • Nuevo vídeo detectado' });
}

async function sendNotification(client, guildId, channelConfig, embed, mentionRoleId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return false;

        const textChannel = guild.channels.cache.get(channelConfig.discordChannelId);
        if (!textChannel) return false;

        const permissions = textChannel.permissionsFor(client.user);
        if (!permissions || !permissions.has('SendMessages')) return false;

        const mentionText = mentionRoleId ? `<@&${mentionRoleId}> ` : '';
        await textChannel.send({ content: mentionText || null, embeds: [embed] });
        return true;
    } catch (e) {
        console.error(`[YouTube] Error enviando notificación a ${channelConfig.discordChannelId}:`, e.message);
        return false;
    }
}

module.exports = { buildNewVideoEmbed, sendNotification };
