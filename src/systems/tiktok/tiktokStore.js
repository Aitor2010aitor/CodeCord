const fs = require('fs');
const path = require('path');
const configManager = require('../../../scripts/config-manager.js');

const TRACKED_FILE = path.join(__dirname, '../../../data/tiktok-tracked.json');

function getConfig(guildId) {
    return configManager.loadGuildConfig(guildId, 'tiktok') || { profiles: [], globalEnabled: true };
}

function saveConfig(guildId, config) {
    configManager.saveGuildConfig(guildId, 'tiktok', config);
}

function getTrackedVideos() {
    try {
        if (fs.existsSync(TRACKED_FILE)) {
            return JSON.parse(fs.readFileSync(TRACKED_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveTrackedVideos(data) {
    fs.writeFileSync(TRACKED_FILE, JSON.stringify(data, null, 2));
}

function getAllProfiles() {
    const serversDir = path.join(__dirname, '../../../servidores');
    const results = [];
    if (!fs.existsSync(serversDir)) return results;
    const dirs = fs.readdirSync(serversDir).filter(d => d.includes('_'));
    for (const dir of dirs) {
        const configPath = path.join(serversDir, dir, 'configuracion', 'tiktok.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const guildId = dir.split('_').pop();
                results.push({ guildId, config });
            } catch (e) {}
        }
    }
    return results;
}

module.exports = { getConfig, saveConfig, getTrackedVideos, saveTrackedVideos, getAllProfiles };
