const { TikTokClient } = require('@ssut/tiktok-api');
const store = require('./tiktokStore.js');
const { buildNewVideoEmbed, sendNotification } = require('./tiktokNotifications.js');

const POLL_INTERVAL = 30 * 1000;
let pollIntervals = [];

const tiktokClient = new TikTokClient({ region: 'US' });

async function getUserInfo(username) {
    try {
        const resp = await tiktokClient.getUser(username);
        const user = resp?.data?.userInfo?.user;
        const stats = resp?.data?.userInfo?.stats;
        if (!user) return null;
        return {
            uniqueId: user.uniqueId,
            nickname: user.nickname,
            secUid: user.secUid,
            avatar: user.avatarLarger || user.avatarThumb || null,
            verified: user.verified || false,
            signature: user.signature || '',
            videoCount: stats?.videoCount || 0,
            followerCount: stats?.followerCount || 0,
            heartCount: stats?.heartCount || 0
        };
    } catch (e) {
        console.error(`[TikTok] Error obteniendo info de @${username}:`, e.message);
        return null;
    }
}

async function checkProfile(client, guildId, profileConfig) {
    if (!profileConfig.enabled) return;

    const userInfo = await getUserInfo(profileConfig.username);
    if (!userInfo) return;

    const tracked = store.getTrackedVideos();
    const trackKey = `${guildId}_${profileConfig.username}`;

    if (!tracked[trackKey]) {
        tracked[trackKey] = {
            videoCount: userInfo.videoCount,
            timestamp: Date.now()
        };
        store.saveTrackedVideos(tracked);
        console.log(`[TikTok] Primer check: @${profileConfig.username} → ${userInfo.videoCount} vídeos — guardado sin notificar`);
        return;
    }

    const prevCount = tracked[trackKey].videoCount || 0;
    const newCount = userInfo.videoCount;

    if (newCount < prevCount) {
        tracked[trackKey] = { videoCount: newCount, timestamp: Date.now() };
        store.saveTrackedVideos(tracked);
        console.log(`[TikTok] @${profileConfig.username} bajó de ${prevCount} a ${newCount} vídeos — reset tracking`);
        return;
    }

    if (newCount === prevCount) return;

    const newVideos = newCount - prevCount;
    console.log(`[TikTok] Detectados ${newVideos} nuevos vídeos de @${profileConfig.username} (${prevCount} → ${newCount})`);

    if (profileConfig.announceNewVideos) {
        const profileUrl = `https://www.tiktok.com/@${userInfo.uniqueId}`;
        const embed = buildNewVideoEmbed(profileConfig, userInfo, newVideos, profileUrl);
        const sent = await sendNotification(client, guildId, profileConfig, embed, profileConfig.mentionRoleId);
        if (sent) {
            console.log(`[TikTok] Notificación enviada: @${profileConfig.username} (${newVideos} nuevo(s))`);
        }
    }

    tracked[trackKey] = { videoCount: newCount, timestamp: Date.now() };
    store.saveTrackedVideos(tracked);
}

function startPolling(client) {
    stopPolling();

    async function pollAll() {
        console.log(`[TikTok] Checking profiles... ${new Date().toLocaleTimeString()}`);
        const allProfiles = store.getAllProfiles();
        for (const { guildId, config } of allProfiles) {
            if (config.globalEnabled === false) continue;
            for (const profileConfig of config.profiles) {
                await checkProfile(client, guildId, profileConfig);
            }
        }
    }

    console.log(`[TikTok] Iniciando polling cada ${POLL_INTERVAL / 1000}s`);
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

module.exports = { startPolling, stopPolling, checkProfile, getUserInfo };
