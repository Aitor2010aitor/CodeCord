// Archivo: src/events/ready.js

/**
 * @file ready.js
 * @description Evento 'ready' y 'clientReady' que se dispara cuando el bot CodeCord se conecta a Discord API.
 */

const fs = require('fs');
const path = require('path');
const configManager = require('../../scripts/config-manager.js');
const { initWebServer } = require('../server.js');
const { loadStaffConfig } = require('../systems/ticketSystem.js');
const { loadLogChannelConfig } = require('../systems/loggerSystem.js');
const { findWaitingRoom } = require('../systems/voiceSystem.js');


let hasInitialized = false;

async function onClientReady(client) {
    if (hasInitialized) return;
    hasInitialized = true;

    try {
        fs.writeFileSync('debug-ready.txt', `Bot listo a las ${new Date().toLocaleString()} como ${client.user.tag}`);
        console.log(`\n==================================================`);
        console.log(`✅ CodeCord conectado con éxito como: ${client.user.tag}`);
        console.log(`📊 Servidores detectados (${client.guilds.cache.size}): ${client.guilds.cache.map(g => g.name).join(', ')}`);
        console.log(`🛡️ Sistema Anti-Raid activado`);
        console.log(`==================================================\n`);



        // Inicializar gestor de configuración
        configManager.setClient(client);
        configManager.migrateExistingConfigs();

        // Iniciar servidor web de /WEB
        initWebServer(client);

        // Cargar configuraciones iniciales
        loadStaffConfig(client);
        loadLogChannelConfig(client);

        // Restaurar rotación automática de colores
        try {
            const servidoresDir = path.join(__dirname, '..', '..', 'servidores');
            if (fs.existsSync(servidoresDir)) {
                const folders = fs.readdirSync(servidoresDir);
                for (const folder of folders) {
                    const match = folder.match(/_(\d+)$/);
                    if (match) {
                        const guildId = match[1];
                        const colorData = configManager.loadGuildConfig(guildId, 'colorroles', {});
                        if (colorData.roleId) {
                            const guild = client.guilds.cache.get(guildId);
                            if (guild) {
                                client.colorRoles.set(guildId, colorData.roleId);
                                console.log(`🎨 [CodeCord] Rol de color cargado para el servidor ${guild.name}`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error restaurando roles de color:', error);
        }

        // Intervalo de comprobación para salas de espera de soporte de voz (cada 30 segundos)
        setInterval(async () => {
            try {
                for (const [guildId, waitingTimes] of client.voiceSupportWaitingTime) {
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) continue;

                    const waitingRoom = findWaitingRoom(guild);
                    if (!waitingRoom) continue;

                    if (!client.voiceSupportWarningSent.has(guildId)) {
                        client.voiceSupportWarningSent.set(guildId, new Set());
                    }
                    const warningSent = client.voiceSupportWarningSent.get(guildId);

                    for (const [userId, entryTime] of waitingTimes) {
                        const timeWaiting = Date.now() - entryTime;
                        const oneMinute = 1 * 60 * 1000;
                        const threeMinutes = 3 * 60 * 1000;

                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (!member || !member.voice.channel || member.voice.channel.id !== waitingRoom.id) {
                            waitingTimes.delete(userId);
                            warningSent.delete(userId);
                            continue;
                        }

                        if (timeWaiting >= threeMinutes && warningSent.has(userId)) {
                            continue;
                        }

                        if (timeWaiting >= oneMinute && !warningSent.has(userId)) {
                            warningSent.add(userId);
                        }
                    }
                }
            } catch (loopErr) {
                console.error('Error en intervalo de voz:', loopErr);
            }
        }, 30000);

    } catch (err) {
        console.error('❌ Error en el evento ready de CodeCord:', err);
    }
}

module.exports = [
    {
        name: 'ready',
        once: true,
        execute: onClientReady
    },
    {
        name: 'clientReady',
        once: true,
        execute: onClientReady
    }
];
