// Archivo: src/systems/colorSystem.js

/**
 * @file colorSystem.js
 * @description Sistema de rotación automática de colores para roles de CodeCord.
 */

const ROTATION_COLORS = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500, 0x800080];

/**
 * Inicia la rotación de colores de un rol en la guild.
 * @param {Client} client 
 * @param {Guild} guild 
 * @param {number} speedSeconds - Velocidad en segundos entre cambios.
 */
function startColorRotation(client, guild, speedSeconds = 5) {
    let currentIndex = 0;

    const existingInterval = client.colorIntervals?.get(guild.id);
    if (existingInterval) {
        clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
        const colorRoleId = client.colorRoles.get(guild.id);
        if (colorRoleId) {
            const role = guild.roles.cache.get(colorRoleId);
            if (role) {
                try {
                    await role.setColor(ROTATION_COLORS[currentIndex]);
                    currentIndex = (currentIndex + 1) % ROTATION_COLORS.length;
                } catch (error) {
                    console.error('Error cambiando color:', error);
                }
            }
        }
    }, speedSeconds * 1000);

    if (!client.colorIntervals) {
        client.colorIntervals = new Map();
    }
    client.colorIntervals.set(guild.id, interval);
}

/**
 * Detiene la rotación de colores de un rol en la guild.
 * @param {Client} client 
 * @param {Guild} guild 
 */
function stopColorRotation(client, guild) {
    const existingInterval = client.colorIntervals?.get(guild.id);
    if (existingInterval) {
        clearInterval(existingInterval);
        client.colorIntervals.delete(guild.id);
    }
}

module.exports = {
    startColorRotation,
    stopColorRotation,
    ROTATION_COLORS
};
