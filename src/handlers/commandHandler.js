// Archivo: src/handlers/commandHandler.js

/**
 * @file commandHandler.js
 * @description Cargador dinámico y recursivo de comandos (Slash & Prefix) para CodeCord.
 */

const fs = require('fs');
const path = require('path');

/**
 * Carga recursivamente los comandos ubicados en el directorio de comandos.
 * @param {Client} client - Instancia del cliente de Discord.js.
 */
function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
    }

    let commandCount = 0;

    function readCommandsRecursive(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            if (file.isDirectory()) {
                readCommandsRecursive(fullPath);
            } else if (file.name.endsWith('.js')) {
                try {
                    delete require.cache[require.resolve(fullPath)];
                    const command = require(fullPath);

                    const commandName = command.name || command.data?.name;
                    if (commandName && typeof command.execute === 'function') {
                        client.commands.set(commandName, command);
                        commandCount++;
                    } else {
                        console.warn(`⚠️ [CodeCord CommandHandler] El comando en ${file.name} no posee un 'name' o 'execute' válido.`);
                    }
                } catch (error) {
                    console.error(`❌ [CodeCord CommandHandler] Error cargando comando en ${file.name}:`, error);
                }
            }
        }
    }

    readCommandsRecursive(commandsPath);
    console.log(`📦 [CodeCord] Se cargaron ${commandCount} comandos correctamente.`);
}

module.exports = { loadCommands };
