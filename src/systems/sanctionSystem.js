// Archivo: src/systems/sanctionSystem.js

/**
 * @file sanctionSystem.js
 * @description Sistema de persistencia y gestión de sanciones para CodeCord.
 */

const fs = require('fs');
const path = require('path');
const configManager = require('../../scripts/config-manager.js');

function getSanctionsFolder(guildId) {
    return path.join(configManager.getGuildFolder(guildId), 'sanciones');
}

/**
 * Registra una sanción en la configuración del servidor y en un archivo de texto.
 * @param {string} guildId - ID del servidor.
 * @param {Object} record - Objeto con información de la sanción.
 */
function addSanctionRecord(guildId, record) {
    try {
        const data = configManager.loadGuildConfig(guildId, 'sanctions', []);
        data.push(record);
        configManager.saveGuildConfig(guildId, 'sanctions', data);

        const sanctionsFolderPath = getSanctionsFolder(guildId);
        if (!fs.existsSync(sanctionsFolderPath)) {
            fs.mkdirSync(sanctionsFolderPath, { recursive: true });
        }

        const filePath = path.join(sanctionsFolderPath, `sanciones_${guildId}.txt`);
        const line = `[${new Date(record.timestamp || Date.now()).toLocaleString('es-ES')}] ${record.type || 'VOICE_SUPPORT'}: ${record.userTag} (${record.userId}) sancionado por ${record.moderatorTag || 'Sistema'} - ${record.reason}\n`;
        fs.appendFileSync(filePath, line, 'utf8');
    } catch (error) {
        console.error('❌ Error registrando sanción en sanctionSystem:', error);
    }
}

/**
 * Obtiene el historial de sanciones registradas para un servidor o usuario específico.
 * @param {string} guildId - ID del servidor.
 * @param {string|null} [userId=null] - ID opcional del usuario.
 * @returns {Array<Object>} Lista de registros de sanciones.
 */
function getSanctionRecords(guildId, userId = null) {
    try {
        const data = configManager.loadGuildConfig(guildId, 'sanctions', []);
        if (data.length === 0) return [];
        if (!userId) return data;
        return data.filter(record => record.userId === userId);
    } catch (error) {
        console.error('❌ Error obteniendo registros de sanciones:', error);
        return [];
    }
}

function removeWarning(guildId, userId, warningIndex) {
    try {
        const data = configManager.loadGuildConfig(guildId, 'sanctions', []);
        const warningIndexes = data.reduce((indexes, record, recordIndex) => {
            if (record.type === 'WARN' && record.userId === userId) indexes.push(recordIndex);
            return indexes;
        }, []);
        const userIndex = warningIndexes[warningIndex];
        if (userIndex === undefined) return null;

        const removedWarning = data.splice(userIndex, 1)[0];
        configManager.saveGuildConfig(guildId, 'sanctions', data);
        return removedWarning;
    } catch (error) {
        console.error('❌ Error retirando advertencia en sanctionSystem:', error);
        return null;
    }
}

/**
 * Sanciona a un usuario del sistema de soporte de voz.
 * @param {Guild} guild - Instancia de la guild de Discord.js.
 * @param {string} userId - ID del usuario a sancionar.
 * @param {string} reason - Razón de la sanción.
 * @param {User|null} [sanctionedBy=null] - Usuario o staff que aplicó la sanción.
 */
async function sanctionSupportUser(guild, userId, reason, sanctionedBy = null) {
    try {
        const voiceSupportSanctionedUsers = guild.client.voiceSupportSanctionedUsers;
        const voiceSupportSanctionedRole = guild.client.voiceSupportSanctionedRole;

        if (!voiceSupportSanctionedUsers.has(guild.id)) {
            voiceSupportSanctionedUsers.set(guild.id, new Set());
        }
        voiceSupportSanctionedUsers.get(guild.id).add(userId);

        const member = await guild.members.fetch(userId).catch(() => null);
        let userTag = userId;

        if (member) {
            userTag = member.user.tag;
            const sanctionedRoleId = voiceSupportSanctionedRole.get(guild.id);
            if (sanctionedRoleId) {
                const role = guild.roles.cache.get(sanctionedRoleId);
                if (role) {
                    await member.roles.add(role).catch(err => console.error('Error al asignar rol de sancionado:', err));
                }
            }
            if (member.voice.channel) {
                await member.voice.disconnect(`Sancionado del soporte de voz: ${reason}`).catch(() => {});
            }
        }

        addSanctionRecord(guild.id, {
            userId,
            userTag,
            reason,
            timestamp: Date.now(),
            moderatorTag: sanctionedBy ? sanctionedBy.tag : 'Sistema (Automático)',
            moderatorId: sanctionedBy ? sanctionedBy.id : 'SYSTEM',
            type: 'VOICE_SUPPORT'
        });

        return true;
    } catch (error) {
        console.error('❌ Error sancionando usuario de soporte de voz:', error);
        return false;
    }
}

module.exports = {
    addSanctionRecord,
    getSanctionRecords,
    removeWarning,
    sanctionSupportUser
};
