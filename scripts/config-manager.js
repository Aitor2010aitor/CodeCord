const fs = require('fs');
const path = require('path');

let botClient = null;

function setClient(client) {
    botClient = client;
}

function sanitizeFolderName(name) {
    if (!name) return 'unknown';
    // Remove invalid path characters
    return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'unnamed';
}

function getGuildFolder(guildId) {
    const parentDir = path.join(__dirname, '..', 'servidores');
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // Look for an existing folder that ends with _guildId
    const files = fs.readdirSync(parentDir);
    const existing = files.find(f => f.endsWith(`_${guildId}`));
    
    let guildName = 'servidor';
    if (botClient) {
        const guild = botClient.guilds.cache.get(guildId);
        if (guild) {
            guildName = sanitizeFolderName(guild.name);
        }
    }
    
    const folderName = `${guildName}_${guildId}`;
    const newPath = path.join(parentDir, folderName);
    
    if (existing) {
        const oldPath = path.join(parentDir, existing);
        // If the guild name changed, rename the folder
        if (existing !== folderName && guildName !== 'servidor') {
            try {
                fs.renameSync(oldPath, newPath);
                return newPath;
            } catch (e) {
                console.error(`Error renaming guild folder from ${oldPath} to ${newPath}: ${e.message}`);
                return oldPath;
            }
        }
        return oldPath;
    }
    
    // Create new folder
    const configDir = path.join(newPath, 'configuracion');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    return newPath;
}

function getGuildConfigPath(guildId, configType) {
    const guildDir = getGuildFolder(guildId);
    const configDir = path.join(guildDir, 'configuracion');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    return path.join(configDir, `${configType}.json`);
}

function loadGuildConfig(guildId, configType, defaultVal = {}) {
    const filePath = getGuildConfigPath(guildId, configType);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`Error reading config ${configType} for guild ${guildId}:`, e);
        }
    }
    return defaultVal;
}

function saveGuildConfig(guildId, configType, data) {
    const filePath = getGuildConfigPath(guildId, configType);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Error writing config ${configType} for guild ${guildId}:`, e);
        return false;
    }
}

function migrateExistingConfigs() {
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
        return;
    }
    console.log('[CONFIG] Iniciando migración de configuraciones a carpetas por servidor...');
    const parentDir = path.join(__dirname, '..', 'servidores');
    
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
    
    const configsToMigrate = [
        { file: 'tickets-config.json', type: 'tickets', isGuildsKey: true },
        { file: 'suggestions-config.json', type: 'suggestions', isGuildsKey: true },
        { file: 'welcome-config.json', type: 'welcome', isGuildsKey: false },
        { file: 'logs-config.json', type: 'logs', isGuildsKey: false },
        { file: 'auto-responses.json', type: 'autoresponses', isGuildsKey: true },
        { file: 'staff-roles.json', type: 'staffroles', isGuildsKey: false },
        { file: 'color-roles.json', type: 'colorroles', isGuildsKey: false },
        { file: 'giveaways-config.json', type: 'giveaways', isGuildsKey: true },
        { file: 'sanctions.json', type: 'sanctions', isGuildsKey: false }
    ];
    
    for (const item of configsToMigrate) {
        const filePath = path.join(configDir, item.file);
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                let guildsData = {};
                
                if (item.isGuildsKey) {
                    guildsData = data.guilds || {};
                } else {
                    guildsData = data || {};
                }
                
                let migratedCount = 0;
                for (const [guildId, guildConfig] of Object.entries(guildsData)) {
                    // Solo migrar si tiene datos
                    if (guildConfig && (Object.keys(guildConfig).length > 0 || (Array.isArray(guildConfig) && guildConfig.length > 0))) {
                         const targetFile = getGuildConfigPath(guildId, item.type);
                         if (!fs.existsSync(targetFile)) {
                             fs.writeFileSync(targetFile, JSON.stringify(guildConfig, null, 2), 'utf8');
                             migratedCount++;
                         }
                    }
                }
                
                fs.renameSync(filePath, `${filePath}.bak`);
                console.log(`[CONFIG] Migrados ${migratedCount} servidores de ${item.file}`);
            } catch (e) {
                console.error(`[CONFIG] Error migrando ${item.file}:`, e);
            }
        }
    }
    console.log('[CONFIG] Migración completada.');
}

module.exports = {
    setClient,
    getGuildFolder,
    getGuildConfigPath,
    loadGuildConfig,
    saveGuildConfig,
    migrateExistingConfigs
};
