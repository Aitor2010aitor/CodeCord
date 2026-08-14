// Archivo: src/index.js

/**
 * @file index.js
 * @description Inicializador del cliente de Discord.js v14 para CodeCord.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadEvents } = require('./handlers/eventHandler.js');
const { loadCommands } = require('./handlers/commandHandler.js');
const { initAntiRaid } = require('../scripts/antiraid.js');



// Captura global de excepciones
process.on('uncaughtException', (err) => {
    console.error('❌ [CodeCord] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('❌ [CodeCord] Unhandled Rejection at:', p, 'reason:', reason);
});

// =====================================================================
// 🔒 BLOQUEO DE INSTANCIA ÚNICA: evita que se ejecuten 2 bots a la vez
// (dos instancias = mensajes duplicados y conflicto de puerto 25816)
// =====================================================================
const LOCK_FILE = path.join(__dirname, '..', 'bot.lock');

function isProcessAlive(pid) {
    if (!pid || pid === process.pid) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === 'EPERM';
    }
}

function checkSingleInstance() {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            const lockedPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
            if (isProcessAlive(lockedPid)) {
                console.error(`❌ [CodeCord] Ya hay OTRA instancia del bot ejecutándose (PID ${lockedPid}).`);
                console.error(`❌ [CodeCord] Ciérrala antes de iniciar otra para evitar mensajes duplicados.`);
                process.exit(1);
            }
        }
        fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
        process.on('exit', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) { } });
        process.on('SIGINT', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) { } process.exit(0); });
        process.on('SIGTERM', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) { } process.exit(0); });
    } catch (e) {
        console.warn('⚠️ [CodeCord] No se pudo usar el archivo de bloqueo:', e.message);
    }
}

checkSingleInstance();
// =====================================================================

// Instanciación del cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.ThreadMember
    ]
});

// Colecciones e infraestructura en memoria
client.commands = new Collection();
client.tempVoiceChannels = new Set();
client.tempVoiceChannelOwners = new Map();

client.voiceSupportQueue = new Map();
client.voiceSupportWaitingTime = new Map();
client.voiceSupportWarningSent = new Map();
client.voiceSupportNextRole = new Map();
client.voiceSupportStaffRole = new Map();
client.voiceSupportSanctionedRole = new Map();
client.voiceSupportSanctionedUsers = new Map();

client.ticketStaffRole = new Map();
client.commandRoles = new Map();
client.colorRoles = new Map();
client.colorIntervals = new Map();
client.juegosCooldowns = new Map();

client.antiRaid = {
    messageTracker: new Map(),
    channelActions: new Map(),
    whitelist: new Map(),
    logChannel: new Map(),
    settings: new Map(),
    adminRole: new Map(),
    infractions: new Map()
};

// Inicialización de AntiRaid V2
initAntiRaid(client);

// Carga de Handlers
loadCommands(client);
loadEvents(client);

// Login con Token de Discord
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ Error: BOT_TOKEN no definido en el archivo .env');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('❌ Error iniciando sesión en Discord API:', err);
});

module.exports = client;
