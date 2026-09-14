// src/systems/backupSystem.js
// Sistema avanzado de Copias de Seguridad (Backups) para CodeCord (v11.0)
// Permite guardar y restaurar servidores con throttling anti-rate-limits y mapeo de permisos

const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionsBitField } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');

// Delay seguro para evitar rate limits de Discord (850ms)
const SAFE_RESTORE_DELAY = 850;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Estado global de restauración en memoria por servidor
const activeRestorations = new Map();

/**
 * Obtiene el directorio de backups del servidor
 */
function getBackupsDir(guildId) {
    const guildFolder = configManager.getGuildFolder(guildId);
    const backupsDir = path.join(guildFolder, 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    return backupsDir;
}

/**
 * Convierte un bitfield de permisos a una lista de nombres de permisos legibles
 */
function permissionsToFlagArray(bitfield) {
    try {
        const bits = new PermissionsBitField(BigInt(bitfield));
        return bits.toArray();
    } catch (e) {
        return [];
    }
}

/**
 * Obtiene el nombre amigable del tipo de canal
 */
function getChannelTypeName(type) {
    switch (type) {
        case ChannelType.GuildText:
            return 'text';
        case ChannelType.GuildVoice:
            return 'voice';
        case ChannelType.GuildCategory:
            return 'category';
        case ChannelType.GuildAnnouncement:
            return 'announcement';
        case ChannelType.GuildStageVoice:
            return 'stage';
        case ChannelType.GuildForum:
            return 'forum';
        default:
            return 'text';
    }
}

/**
 * Ejecuta una acción con reintentos automáticos en caso de Rate Limit (429)
 */
async function executeWithRetry(fn, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.status === 429 || error.code === 429 || (error.message && error.message.includes('rate limit'));
            if (isRateLimit && attempt < maxRetries) {
                const retryAfter = (error.retry_after || error.rawError?.retry_after || 2) * 1000 + 500;
                console.warn(`[BackupSystem] Rate limit alcanzado. Esperando ${retryAfter}ms antes de reintentar (intento ${attempt}/${maxRetries})...`);
                await sleep(retryAfter);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Crea una copia de seguridad completa del servidor
 */
async function createBackup(guild, versionName = 'Copia de Seguridad') {
    if (!guild) throw new Error('Servidor no encontrado');

    const backupsDir = getBackupsDir(guild.id);
    const backupId = `backup_${Date.now()}`;

    // 1. Roles
    const rawRoles = await guild.roles.fetch();
    const roles = rawRoles
        .filter(r => !r.managed && r.id !== guild.id) // excluir roles integrados y @everyone para crearlos luego
        .sort((a, b) => b.position - a.position)
        .map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions.bitfield.toString(),
            permissionsList: permissionsToFlagArray(role.permissions.bitfield),
            mentionable: role.mentionable,
            isEveryone: false
        }));

    // Añadir @everyone
    const everyoneRole = guild.roles.everyone;
    if (everyoneRole) {
        roles.unshift({
            id: everyoneRole.id,
            name: '@everyone',
            color: '#99aab5',
            hoist: false,
            position: 0,
            permissions: everyoneRole.permissions.bitfield.toString(),
            permissionsList: permissionsToFlagArray(everyoneRole.permissions.bitfield),
            mentionable: false,
            isEveryone: true
        });
    }

    // 2. Canales
    const rawChannels = await guild.channels.fetch();
    const categories = [];
    const channels = [];

    // Formateador de permission overwrites
    const formatOverwrites = (overwrites) => {
        return overwrites.map(ow => {
            const role = guild.roles.cache.get(ow.id);
            return {
                id: ow.id,
                type: ow.type === 0 ? 'role' : 'member',
                roleName: role ? role.name : (ow.id === guild.id ? '@everyone' : null),
                allow: ow.allow.bitfield.toString(),
                allowFlags: permissionsToFlagArray(ow.allow.bitfield),
                deny: ow.deny.bitfield.toString(),
                denyFlags: permissionsToFlagArray(ow.deny.bitfield)
            };
        });
    };

    // Separar categorías de canales regulares
    rawChannels.forEach(channel => {
        if (!channel) return;
        if (channel.type === ChannelType.GuildCategory) {
            categories.push({
                id: channel.id,
                name: channel.name,
                position: channel.position,
                permissionOverwrites: formatOverwrites(Array.from(channel.permissionOverwrites.cache.values()))
            });
        }
    });

    categories.sort((a, b) => a.position - b.position);

    rawChannels.forEach(channel => {
        if (!channel || channel.type === ChannelType.GuildCategory) return;
        const parentCategory = channel.parentId ? guild.channels.cache.get(channel.parentId) : null;
        channels.push({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            typeName: getChannelTypeName(channel.type),
            parentCategoryName: parentCategory ? parentCategory.name : null,
            position: channel.position,
            topic: channel.topic || '',
            nsfw: !!channel.nsfw,
            rateLimitPerUser: channel.rateLimitPerUser || 0,
            bitrate: channel.bitrate || null,
            userLimit: channel.userLimit || null,
            permissionOverwrites: formatOverwrites(Array.from(channel.permissionOverwrites.cache.values()))
        });
    });

    channels.sort((a, b) => a.position - b.position);

    const backupData = {
        id: backupId,
        versionName: versionName.trim() || `Versión ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        guildId: guild.id,
        guildName: guild.name,
        iconURL: guild.iconURL({ dynamic: true, size: 512 }) || null,
        bannerURL: guild.bannerURL({ size: 1024 }) || null,
        memberCount: guild.memberCount,
        stats: {
            categoriesCount: categories.length,
            channelsCount: channels.length,
            rolesCount: roles.length
        },
        settings: {
            afkTimeout: guild.afkTimeout,
            verificationLevel: guild.verificationLevel,
            defaultMessageNotifications: guild.defaultMessageNotifications
        },
        roles,
        categories,
        channels
    };

    const filePath = path.join(backupsDir, `${backupId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    return {
        id: backupData.id,
        versionName: backupData.versionName,
        createdAt: backupData.createdAt,
        guildName: backupData.guildName,
        iconURL: backupData.iconURL,
        stats: backupData.stats
    };
}

/**
 * Lista todas las copias de seguridad de un servidor
 */
function listBackups(guildId) {
    const backupsDir = getBackupsDir(guildId);
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json'));

    const list = [];
    files.forEach(file => {
        try {
            const raw = fs.readFileSync(path.join(backupsDir, file), 'utf-8');
            const data = JSON.parse(raw);
            list.push({
                id: data.id || file.replace('.json', ''),
                versionName: data.versionName || file.replace('.json', ''),
                createdAt: data.createdAt || new Date().toISOString(),
                guildName: data.guildName || 'Servidor',
                iconURL: data.iconURL || null,
                stats: data.stats || {
                    categoriesCount: (data.categories || []).length,
                    channelsCount: (data.channels || []).length,
                    rolesCount: (data.roles || []).length
                }
            });
        } catch (e) {
            // Ignorar archivos corruptos
        }
    });

    // Ordenar por fecha descendente
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
}

/**
 * Obtiene la información completa de una copia de seguridad específica
 */
function getBackup(guildId, backupId) {
    const backupsDir = getBackupsDir(guildId);
    const safeBackupId = path.basename(backupId);
    const filePath = path.join(backupsDir, `${safeBackupId}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error('Copia de seguridad no encontrada');
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

/**
 * Elimina una copia de seguridad
 */
function deleteBackup(guildId, backupId) {
    const backupsDir = getBackupsDir(guildId);
    const safeBackupId = path.basename(backupId);
    const filePath = path.join(backupsDir, `${safeBackupId}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error('Copia de seguridad no encontrada para eliminar');
    }

    fs.unlinkSync(filePath);
    return true;
}

/**
 * Consulta el estado de una restauración activa
 */
function getRestoreStatus(guildId) {
    return activeRestorations.get(guildId) || { inProgress: false, percent: 0, step: '', error: null, completed: false };
}

/**
 * Restaura una copia de seguridad en el servidor con throttling anti-rate-limit
 */
async function restoreBackup(guild, backupId) {
    if (!guild) throw new Error('Servidor no encontrado');
    if (activeRestorations.get(guild.id)?.inProgress) {
        throw new Error('Ya hay una restauración en progreso para este servidor');
    }

    const backup = getBackup(guild.id, backupId);

    const status = {
        inProgress: true,
        percent: 0,
        step: 'Iniciando proceso de restauración...',
        error: null,
        completed: false,
        startedAt: Date.now()
    };
    activeRestorations.set(guild.id, status);

    const updateStatus = (step, percent) => {
        status.step = step;
        status.percent = Math.min(100, Math.max(0, Math.round(percent)));
    };

    // Ejecutar restauración en segundo plano para no congelar la petición HTTP
    (async () => {
        try {
            console.log(`[BackupSystem] Iniciando restauración para ${guild.name} (${guild.id})...`);
            updateStatus('Preparando restauración...', 5);
            await sleep(SAFE_RESTORE_DELAY);

            // =================================================================
            // PASO 1: Eliminar canales actuales
            // =================================================================
            updateStatus('Eliminando canales existentes...', 10);
            const currentChannels = await guild.channels.fetch();
            let channelIndex = 0;
            const totalCurrentChannels = currentChannels.size || 1;

            for (const [, channel] of currentChannels) {
                if (!channel) continue;
                try {
                    await executeWithRetry(() => channel.delete('Restauración de copia de seguridad (CodeCord v11.0)'));
                    await sleep(SAFE_RESTORE_DELAY);
                } catch (err) {
                    console.warn(`[BackupSystem] No se pudo eliminar el canal ${channel.name}: ${err.message}`);
                }
                channelIndex++;
                updateStatus(`Eliminando canales (${channelIndex}/${totalCurrentChannels})...`, 10 + (channelIndex / totalCurrentChannels) * 20);
            }

            // =================================================================
            // PASO 2: Eliminar roles actuales (excepto bot, administradores críticos y @everyone)
            // =================================================================
            updateStatus('Eliminando roles antiguos...', 30);
            const currentRoles = await guild.roles.fetch();
            const botMember = guild.members.me;
            const botHighestRole = botMember ? botMember.roles.highest : null;

            const rolesToDelete = currentRoles.filter(role => role && !role.managed && role.id !== guild.id && (!botHighestRole || role.position < botHighestRole.position));
            let roleDeleteIndex = 0;
            const totalRolesToDelete = rolesToDelete.size || 1;

            for (const [, role] of rolesToDelete) {
                try {
                    await executeWithRetry(() => role.delete('Restauración de copia de seguridad (CodeCord v11.0)'));
                    await sleep(SAFE_RESTORE_DELAY);
                } catch (err) {
                    console.warn(`[BackupSystem] No se pudo eliminar rol ${role.name}: ${err.message}`);
                }
                roleDeleteIndex++;
                updateStatus(`Eliminando roles antiguos (${roleDeleteIndex}/${totalRolesToDelete})...`, 30 + (roleDeleteIndex / totalRolesToDelete) * 10);
            }

            // =================================================================
            // PASO 3: Recrear roles y generar mapa de IDs
            // =================================================================
            updateStatus('Recreando roles del servidor...', 40);
            const roleIdMap = new Map(); // id_antiguo -> id_nuevo
            const roleNameMap = new Map(); // nombre_rol -> id_nuevo

            // Mapear @everyone primero
            const everyoneData = (backup.roles || []).find(r => r.isEveryone || r.name === '@everyone');
            if (everyoneData && guild.roles.everyone) {
                try {
                    await executeWithRetry(() => guild.roles.everyone.setPermissions(BigInt(everyoneData.permissions || '0')));
                } catch (e) {
                    console.warn(`[BackupSystem] Error configurando permisos de @everyone: ${e.message}`);
                }
                roleIdMap.set(everyoneData.id, guild.roles.everyone.id);
                roleIdMap.set(guild.id, guild.roles.everyone.id);
                roleNameMap.set('@everyone', guild.roles.everyone.id);
            }

            // Crear roles nuevos
            const rolesToCreate = (backup.roles || [])
                .filter(r => !r.isEveryone && r.name !== '@everyone')
                .reverse(); // Orden inverso para preservar jerarquía

            let roleCount = 0;
            const totalRolesToCreate = rolesToCreate.length || 1;

            for (const roleData of rolesToCreate) {
                try {
                    const newRole = await executeWithRetry(() => guild.roles.create({
                        name: roleData.name,
                        color: roleData.color || undefined,
                        hoist: !!roleData.hoist,
                        permissions: BigInt(roleData.permissions || '0'),
                        mentionable: !!roleData.mentionable,
                        reason: 'Restauración de copia de seguridad (CodeCord v11.0)'
                    }));

                    roleIdMap.set(roleData.id, newRole.id);
                    roleNameMap.set(roleData.name, newRole.id);
                    await sleep(SAFE_RESTORE_DELAY);
                } catch (err) {
                    console.warn(`[BackupSystem] Error creando rol ${roleData.name}: ${err.message}`);
                }
                roleCount++;
                updateStatus(`Recreando roles (${roleCount}/${totalRolesToCreate})...`, 40 + (roleCount / totalRolesToCreate) * 20);
            }

            // Helper para mapear permission overwrites
            const mapOverwrites = (overwrites = []) => {
                const mapped = [];
                overwrites.forEach(ow => {
                    let targetId = null;
                    if (ow.roleName === '@everyone' || ow.id === backup.guildId) {
                        targetId = guild.roles.everyone.id;
                    } else if (roleIdMap.has(ow.id)) {
                        targetId = roleIdMap.get(ow.id);
                    } else if (ow.roleName && roleNameMap.has(ow.roleName)) {
                        targetId = roleNameMap.get(ow.roleName);
                    }

                    if (targetId) {
                        mapped.push({
                            id: targetId,
                            type: ow.type === 'member' ? 1 : 0,
                            allow: BigInt(ow.allow || '0'),
                            deny: BigInt(ow.deny || '0')
                        });
                    }
                });
                return mapped;
            };

            // =================================================================
            // PASO 4: Recrear categorías
            // =================================================================
            updateStatus('Recreando categorías...', 62);
            const categoryMap = new Map(); // nombre_categoria -> nueva_categoria_id
            const categories = backup.categories || [];
            let catIndex = 0;
            const totalCats = categories.length || 1;

            for (const catData of categories) {
                try {
                    const newCategory = await executeWithRetry(() => guild.channels.create({
                        name: catData.name,
                        type: ChannelType.GuildCategory,
                        position: catData.position,
                        permissionOverwrites: mapOverwrites(catData.permissionOverwrites),
                        reason: 'Restauración de copia de seguridad (CodeCord v11.0)'
                    }));
                    categoryMap.set(catData.name, newCategory.id);
                    await sleep(SAFE_RESTORE_DELAY);
                } catch (err) {
                    console.warn(`[BackupSystem] Error creando categoría ${catData.name}: ${err.message}`);
                }
                catIndex++;
                updateStatus(`Recreando categorías (${catIndex}/${totalCats})...`, 62 + (catIndex / totalCats) * 15);
            }

            // =================================================================
            // PASO 5: Recrear canales regulares
            // =================================================================
            updateStatus('Recreando canales de texto, voz y anuncios...', 78);
            const channels = backup.channels || [];
            let chanIndex = 0;
            const totalChannels = channels.length || 1;

            for (const chanData of channels) {
                try {
                    const parentId = chanData.parentCategoryName ? categoryMap.get(chanData.parentCategoryName) : null;
                    const channelPayload = {
                        name: chanData.name,
                        type: chanData.type || ChannelType.GuildText,
                        position: chanData.position,
                        parent: parentId || undefined,
                        permissionOverwrites: mapOverwrites(chanData.permissionOverwrites),
                        reason: 'Restauración de copia de seguridad (CodeCord v11.0)'
                    };

                    if (chanData.type === ChannelType.GuildText || chanData.type === ChannelType.GuildAnnouncement) {
                        if (chanData.topic) channelPayload.topic = chanData.topic;
                        if (typeof chanData.nsfw === 'boolean') channelPayload.nsfw = chanData.nsfw;
                        if (chanData.rateLimitPerUser) channelPayload.rateLimitPerUser = chanData.rateLimitPerUser;
                    } else if (chanData.type === ChannelType.GuildVoice) {
                        if (chanData.bitrate) channelPayload.bitrate = chanData.bitrate;
                        if (chanData.userLimit) channelPayload.userLimit = chanData.userLimit;
                    }

                    await executeWithRetry(() => guild.channels.create(channelPayload));
                    await sleep(SAFE_RESTORE_DELAY);
                } catch (err) {
                    console.warn(`[BackupSystem] Error creando canal ${chanData.name}: ${err.message}`);
                }
                chanIndex++;
                updateStatus(`Recreando canales (${chanIndex}/${totalChannels})...`, 78 + (chanIndex / totalChannels) * 20);
            }

            // Finalización exitosa
            updateStatus('¡El bot ha terminado la restauración con éxito!', 100);
            status.completed = true;
            status.inProgress = false;
            console.log(`[BackupSystem] Restauración completada exitosamente para ${guild.name}.`);
        } catch (fatalError) {
            console.error(`[BackupSystem] Error fatal en restauración:`, fatalError);
            status.inProgress = false;
            status.error = fatalError.message || 'Error desconocido durante la restauración';
            status.step = `Error: ${status.error}`;
        }
    })();

    return { started: true, message: 'Restauración iniciada en segundo plano con protección anti-rate-limit.' };
}

module.exports = {
    createBackup,
    listBackups,
    getBackup,
    deleteBackup,
    restoreBackup,
    getRestoreStatus
};
