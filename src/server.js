// Archivo: src/server.js

/**
 * @file server.js
 * @description Servidor Backend de CodeCord que conecta e inicializa el Panel Web de la carpeta /WEB de forma 100% compatible.
 */

const { startAdminPanel, handleGiveawayInteraction } = require('../WEB/admin-panel.js');

/**
 * Inicializa el servidor web Express y el panel administrativo.
 * @param {Client} client - Cliente activado de Discord.js.
 */
function initWebServer(client) {
    try {
        console.log('🌐 [CodeCord Backend] Arrancando servidor web desde /WEB...');
        startAdminPanel(client);
    } catch (error) {
        console.error('❌ [CodeCord Backend] Error iniciando el panel web de /WEB:', error);
    }
}

module.exports = {
    initWebServer,
    handleGiveawayInteraction
};
