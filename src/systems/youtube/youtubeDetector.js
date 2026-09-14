const RssParser = require('rss-parser');
const store = require('./youtubeStore.js');
const { buildNewVideoEmbed, sendNotification } = require('./youtubeNotifications.js');

const POLL_INTERVAL = 30 * 1000;
let pollIntervals = [];

const parser = new RssParser();

async function checkChannel(client, guildId, channelConfig) {
    if (!channelConfig.enabled) return;

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelConfig.channelId}`;
    try {
        const feed = await parser.parseURL(feedUrl);
        if (!feed.items || feed.items.length === 0) return;

        const latestVideo = feed.items[0];
        const videoId = latestVideo.id?.replace('yt:video:', '') || latestVideo.link?.split('v=')[1];
        if (!videoId) return;

        const tracked = store.getTrackedVideos();
        const trackKey = `${guildId}_${channelConfig.channelId}`;

        if (!tracked[trackKey]) {
            tracked[trackKey] = { videoId, timestamp: Date.now() };
            store.saveTrackedVideos(tracked);
            console.log(`[YouTube] Primer check: ${channelConfig.channelName} → ${videoId} — guardado sin notificar`);
            return;
        }

        if (tracked[trackKey].videoId === videoId) return;

        const prevVideoId = tracked[trackKey].videoId;
        console.log(`[YouTube] Nuevo vídeo detectado en ${channelConfig.channelName}: ${videoId}`);

        if (channelConfig.announceNewVideos) {
            const embed = buildNewVideoEmbed(channelConfig, latestVideo, feed);
            const sent = await sendNotification(client, guildId, channelConfig, embed, channelConfig.mentionRoleId);
            if (sent) {
                console.log(`[YouTube] Notificación enviada: ${channelConfig.channelName}`);
            }
        }

        tracked[trackKey] = { videoId, timestamp: Date.now() };
        store.saveTrackedVideos(tracked);
    } catch (e) {
        console.error(`[YouTube] Error checking ${channelConfig.channelName}:`, e.message);
    }
}

function startPolling(client) {
    stopPolling();

    async function pollAll() {
        console.log(`[YouTube] Checking channels... ${new Date().toLocaleTimeString()}`);
        const allConfigs = store.getAllConfigs();
        for (const { guildId, config } of allConfigs) {
            if (config.globalEnabled === false) continue;
            for (const channelConfig of config.channels) {
                await checkChannel(client, guildId, channelConfig);
            }
        }
    }

    console.log(`[YouTube] Iniciando polling cada ${POLL_INTERVAL / 1000}s`);
    pollAll();
    const interval = setInterval(pollAll, POLL_INTERVAL);
    pollIntervals.push(interval);
}

function stopPolling() {
    for (const interval of pollIntervals) {
        clearInterval(interval);
    }
    pollIntervals = [];
}

module.exports = { startPolling, stopPolling, checkChannel };
