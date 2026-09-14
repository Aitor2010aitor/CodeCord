// Archivo: src/handlers/eventHandler.js

/**
 * @file eventHandler.js
 * @description Cargador dinámico de eventos de Discord.js para CodeCord.
 */

const fs = require('fs');
const path = require('path');

/**
 * Carga automáticamente todos los listeners de eventos desde la carpeta /src/events.
 * @param {Client} client - Instancia del cliente de Discord.js.
 */
function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    let eventCount = 0;

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const exported = require(filePath);
            const events = Array.isArray(exported) ? exported : [exported];

            for (const event of events) {
                if (event.name && typeof event.execute === 'function') {
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                    eventCount++;
                } else {
                    console.warn(`⚠️ [CodeCord EventHandler] El evento en ${file} no posee 'name' o 'execute' válido.`);
                }
            }
        } catch (error) {
            console.error(`❌ [CodeCord EventHandler] Error al cargar evento ${file}:`, error);
        }
    }

    console.log(`⚡ [CodeCord] Se registraron ${eventCount} eventos de Discord.js.`);
}

module.exports = { loadEvents };
