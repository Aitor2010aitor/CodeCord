const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const configManager = require('./config-manager');

const MODULOS = {
    crearCanales: {
        evento: 'channelCreate',
        nombre: 'Crear Canales',
        descripcion: 'Limita el número máximo de canales que un usuario podrá crear por minuto',
        obtenerId: (data) => data?.executor?.id || data?.member?.id
    },
    borrarCanales: {
        evento: 'channelDelete',
        nombre: 'Borrar Canales',
        descripcion: 'Limita el número máximo de canales que un usuario podrá borrar por minuto',
        obtenerId: (data) => data?.executor?.id || data?.member?.id
    },
    editarCanales: {
        evento: 'channelUpdate',
        nombre: 'Editar Canales',
        descripcion: 'Limita el número máximo de canales que un usuario podrá editar por minuto',
        obtenerId: (data) => data?.executor?.id || data?.member?.id
    },
    crearRoles: {
        evento: 'roleCreate',
        nombre: 'Crear Roles',
        descripcion: 'Limita el número máximo de roles que un usuario podrá crear por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    borrarRoles: {
        evento: 'roleDelete',
        nombre: 'Borrar Roles',
        descripcion: 'Limita el número máximo de roles que un usuario podrá borrar por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    editarRoles: {
        evento: 'roleUpdate',
        nombre: 'Editar Roles',
        descripcion: 'Limita el número máximo de roles que un usuario podrá editar por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    crearEmojis: {
        evento: 'emojiCreate',
        nombre: 'Crear Emojis',
        descripcion: 'Limita el número máximo de emojis que un usuario podrá crear por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    borrarEmojis: {
        evento: 'emojiDelete',
        nombre: 'Borrar Emojis',
        descripcion: 'Limita el número máximo de emojis que un usuario podrá borrar por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    expulsarUsuarios: {
        evento: 'guildMemberRemove',
        nombre: 'Expulsar Usuarios',
        descripcion: 'Limita el número máximo de expulsiones (kicks) que un usuario podrá realizar por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    banearUsuarios: {
        evento: 'guildBanAdd',
        nombre: 'Banear Usuarios',
        descripcion: 'Limita el número máximo de baneos que un usuario podrá realizar por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    desbanearUsuarios: {
        evento: 'guildBanRemove',
        nombre: 'Desbanear Usuarios',
        descripcion: 'Limita el número máximo de desbaneos que un usuario podrá realizar por minuto',
        obtenerId: (data) => data?.executor?.id
    },
    editarWebhooks: {
        evento: 'webhookUpdate',
        nombre: 'Editar Webhooks',
        descripcion: 'Limita el número máximo de cambios en webhooks por minuto',
        obtenerId: (data) => data?.executor?.id
    }
};

const VENTANA_MS = 60000;

class AntiRaid {
    constructor(client) {
        this.client = client;
        this.contadores = new Map();
        this.configs = new Map();
        this.client.antiRaidV2 = this;
        this.cargarConfigs();
        this.registrarEventos();
    }

    cargarConfigs() {
        const parentDir = require('path').join(__dirname, '..', 'servidores');
        if (!require('fs').existsSync(parentDir)) return;
        const folders = require('fs').readdirSync(parentDir);
        for (const folder of folders) {
            const match = folder.match(/_(\d+)$/);
            if (match) {
                const guildId = match[1];
                const config = this.obtenerConfig(guildId);
                this.configs.set(guildId, config);
            }
        }
    }

    obtenerConfig(guildId) {
        const predeterminado = {
            whitelist: [],
            modulos: {}
        };
        for (const [key, mod] of Object.entries(MODULOS)) {
            predeterminado.modulos[key] = {
                activado: false,
                limite: 1,
                accion: 'ban'
            };
        }
        return configManager.loadGuildConfig(guildId, 'antiraid', predeterminado);
    }

    guardarConfig(guildId, config) {
        this.configs.set(guildId, config);
        configManager.saveGuildConfig(guildId, 'antiraid', config);
    }

    obtenerLogChannel(guildId) {
        try {
            const logsConfig = configManager.loadGuildConfig(guildId, 'logs', {});
            for (const [, ev] of Object.entries(logsConfig)) {
                if (ev.enabled && ev.channel) {
                    return ev.channel;
                }
            }
        } catch (e) {}
        return null;
    }

    obtenerContador(guildId, userId, modulo) {
        const clave = `${guildId}:${userId}:${modulo}`;
        if (!this.contadores.has(clave)) {
            this.contadores.set(clave, []);
        }
        return this.contadores.get(clave);
    }

    limpiarVentana(marcas) {
        const ahora = Date.now();
        return marcas.filter(ts => ahora - ts < VENTANA_MS);
    }

    verificarLimite(guildId, userId, nombreModulo) {
        const config = this.configs.get(guildId) || this.obtenerConfig(guildId);
        const modulo = config.modulos[nombreModulo];
        if (!modulo || !modulo.activado) return null;

        if (config.whitelist && config.whitelist.includes(userId)) return null;

        const marcas = this.obtenerContador(guildId, userId, nombreModulo);
        marcas.push(Date.now());
        const recientes = this.limpiarVentana(marcas);
        this.contadores.set(`${guildId}:${userId}:${nombreModulo}`, recientes);

        if (recientes.length > modulo.limite) {
            return { count: recientes.length, limit: modulo.limite, config: modulo };
        }
        return null;
    }

    async ejecutarRespuesta(guild, member, userId, nombreModulo, count, limit, accion) {
        try {
            const guildId = guild.id;
            const config = this.configs.get(guildId) || this.obtenerConfig(guildId);

            let miembro = member;
            if (!miembro && userId) {
                try {
                    miembro = await guild.members.fetch(userId);
                } catch (e) {
                    miembro = null;
                }
            }
            if (!miembro) {
                console.error(`[ANTIRAID] No se pudo obtener el miembro ${userId} en ${guild.name}`);
                return;
            }

            const modInfo = MODULOS[nombreModulo];
            const nombreModuloDisplay = modInfo ? modInfo.nombre : nombreModulo;

            const rolesGuardados = [];
            if (miembro) {
                for (const [id, role] of miembro.roles.cache) {
                    if (id !== guild.id) {
                        rolesGuardados.push(id);
                    }
                }
            }

            try {
                if (miembro) {
                    await miembro.roles.set([], `Antiraid: aislamiento por superar límite de ${nombreModuloDisplay}`);
                }
            } catch (e) {
                console.error(`[ANTIRAID] Error aislando a ${userId} en ${guild.name}: ${e.message}`);
            }

            const motivo = `Antiraid: superó el límite de ${nombreModuloDisplay} (${count} acciones/min, límite: ${limit})`;

            let accionTomada = accion || 'ban';
            let exito = false;
            try {
                if (accionTomada === 'kick') {
                    if (miembro) {
                        await miembro.kick(motivo);
                    }
                    exito = true;
                } else {
                    if (miembro) {
                        await miembro.ban({ reason: motivo });
                    }
                    exito = true;
                }
            } catch (e) {
                console.error(`[ANTIRAID] Error ejecutando ${accionTomada} a ${userId}: ${e.message}`);
                const logErrorEmbed = new EmbedBuilder()
                    .setTitle('ERROR - Antiraid')
                    .setDescription(`No se pudo ejecutar **${accionTomada}** a <@${userId}>.\nRazón: ${e.message}\n\nEl bot necesita tener el rol por encima del usuario y permisos suficientes.`)
                    .setColor(0xFF0000)
                    .setTimestamp();
                const logChannelIdErr = this.obtenerLogChannel(guildId);
                if (logChannelIdErr) {
                    const logChannel = guild.channels.cache.get(logChannelIdErr);
                    if (logChannel) {
                        await logChannel.send({ embeds: [logErrorEmbed] }).catch(() => {});
                    }
                }
                return;
            }

            const logEmbed = new EmbedBuilder()
                .setTitle('🛡️ Antiraid - Acción Automática')
                .setDescription(`**Usuario:** ${miembro ? miembro.user.tag : userId} (<@${userId}>)\n**ID:** ${userId}\n**Módulo:** ${nombreModuloDisplay}\n**Acciones detectadas:** ${count}\n**Límite configurado:** ${limit}\n**Acción tomada:** ${accionTomada.toUpperCase()}\n**Razón:** ${motivo}`)
                .setColor(accionTomada === 'ban' ? 0xFF0000 : 0xFFA500)
                .setTimestamp();

            const logChannelIdOk = this.obtenerLogChannel(guildId);
            if (logChannelIdOk) {
                const logChannel = guild.channels.cache.get(logChannelIdOk);
                if (logChannel) {
                    try {
                        await logChannel.send({ embeds: [logEmbed] });
                    } catch (e) {
                        console.error(`[ANTIRAID] Error enviando log: ${e.message}`);
                    }
                }
            }

            const usuarioRegistro = miembro ? miembro.user.tag : userId;
            try {
                const logBotActivity = require('../index').logBotActivity;
                if (logBotActivity) {
                    await logBotActivity(guildId, 'ANTIRAID', `${nombreModuloDisplay}: ${usuarioRegistro} - ${accionTomada} (${count} acc/min)`);
                }
            } catch (e) {}

            console.log(`[ANTIRAID] ${accionTomada.toUpperCase()} a ${usuarioRegistro} en ${guild.name} por ${nombreModuloDisplay} (${count} acc/min)`);

        } catch (error) {
            console.error(`[ANTIRAID] Error en ejecutarRespuesta:`, error);
        }
    }

    async obtenerEjecutor(guild, auditLogEvent) {
        try {
            const ahora = Date.now();
            const entry = await guild.fetchAuditLogs({ limit: 1, type: auditLogEvent });
            if (entry && entry.entries.first()) {
                const log = entry.entries.first();
                if (ahora - log.createdTimestamp < 5000) {
                    return log.executor;
                }
            }
        } catch (e) {
            /* ignorar */
        }
        return null;
    }

    async manejarEvento(evento, nombreModulo, auditLogEvent, obtenerData) {
        try {
            let guild, ejecutor, dataExtra;

            if (evento.guild) {
                guild = evento.guild;
            } else if (evento.channel && evento.channel.guild) {
                guild = evento.channel.guild;
            } else {
                return;
            }

            if (auditLogEvent !== null) {
                ejecutor = await this.obtenerEjecutor(guild, auditLogEvent);
            }

            if (!ejecutor || ejecutor.bot) return;

            const resultado = this.verificarLimite(guild.id, ejecutor.id, nombreModulo);
            if (resultado) {
                const miembro = await guild.members.fetch(ejecutor.id).catch(() => null);
                await this.ejecutarRespuesta(
                    guild,
                    miembro,
                    ejecutor.id,
                    nombreModulo,
                    resultado.count,
                    resultado.limit,
                    resultado.config.accion
                );
            }
        } catch (error) {
            console.error(`[ANTIRAID] Error en evento ${nombreModulo}:`, error.message);
        }
    }

    manejarGuildMemberRemove(miembro) {
        try {
            const guild = miembro.guild;
            this.obtenerEjecutor(guild, AuditLogEvent.MemberKick).then(ejecutor => {
                if (!ejecutor || ejecutor.bot) return;
                const resultado = this.verificarLimite(guild.id, ejecutor.id, 'expulsarUsuarios');
                if (resultado) {
                    guild.members.fetch(ejecutor.id).then(m => {
                        this.ejecutarRespuesta(guild, m, ejecutor.id, 'expulsarUsuarios', resultado.count, resultado.limit, resultado.config.accion);
                    }).catch(() => {});
                }
            }).catch(() => {});
        } catch (e) {}
    }

    manejarWebhookUpdate(channel) {
        try {
            const guild = channel.guild;
            this.obtenerEjecutor(guild, AuditLogEvent.WebhookUpdate).then(ejecutor => {
                if (!ejecutor || ejecutor.bot) return;
                const resultado = this.verificarLimite(guild.id, ejecutor.id, 'editarWebhooks');
                if (resultado) {
                    guild.members.fetch(ejecutor.id).then(m => {
                        this.ejecutarRespuesta(guild, m, ejecutor.id, 'editarWebhooks', resultado.count, resultado.limit, resultado.config.accion);
                    }).catch(() => {});
                }
            }).catch(() => {});
        } catch (e) {}
    }

    registrarEventos() {
        const client = this.client;

        client.on('channelCreate', (channel) => {
            this.manejarEvento(channel, 'crearCanales', AuditLogEvent.ChannelCreate);
        });

        client.on('channelDelete', (channel) => {
            this.manejarEvento(channel, 'borrarCanales', AuditLogEvent.ChannelDelete);
        });

        client.on('channelUpdate', (oldChannel, newChannel) => {
            this.manejarEvento(newChannel, 'editarCanales', AuditLogEvent.ChannelUpdate);
        });

        client.on('roleCreate', (role) => {
            this.manejarEvento(role, 'crearRoles', AuditLogEvent.RoleCreate);
        });

        client.on('roleDelete', (role) => {
            this.manejarEvento(role, 'borrarRoles', AuditLogEvent.RoleDelete);
        });

        client.on('roleUpdate', (oldRole, newRole) => {
            this.manejarEvento(newRole, 'editarRoles', AuditLogEvent.RoleUpdate);
        });

        client.on('emojiCreate', (emoji) => {
            this.manejarEvento(emoji, 'crearEmojis', AuditLogEvent.EmojiCreate);
        });

        client.on('emojiDelete', (emoji) => {
            this.manejarEvento(emoji, 'borrarEmojis', AuditLogEvent.EmojiDelete);
        });

        client.on('guildMemberRemove', (miembro) => {
            this.manejarGuildMemberRemove(miembro);
        });

        client.on('guildBanAdd', (ban) => {
            const guild = ban.guild;
            this.obtenerEjecutor(guild, AuditLogEvent.MemberBanAdd).then(ejecutor => {
                if (!ejecutor || ejecutor.bot) return;
                const resultado = this.verificarLimite(guild.id, ejecutor.id, 'banearUsuarios');
                if (resultado) {
                    guild.members.fetch(ejecutor.id).then(m => {
                        this.ejecutarRespuesta(guild, m, ejecutor.id, 'banearUsuarios', resultado.count, resultado.limit, resultado.config.accion);
                    }).catch(() => {});
                }
            }).catch(() => {});
        });

        client.on('guildBanRemove', (ban) => {
            const guild = ban.guild;
            this.obtenerEjecutor(guild, AuditLogEvent.MemberBanRemove).then(ejecutor => {
                if (!ejecutor || ejecutor.bot) return;
                const resultado = this.verificarLimite(guild.id, ejecutor.id, 'desbanearUsuarios');
                if (resultado) {
                    guild.members.fetch(ejecutor.id).then(m => {
                        this.ejecutarRespuesta(guild, m, ejecutor.id, 'desbanearUsuarios', resultado.count, resultado.limit, resultado.config.accion);
                    }).catch(() => {});
                }
            }).catch(() => {});
        });

        client.on('webhookUpdate', (channel) => {
            this.manejarWebhookUpdate(channel);
        });
    }
}

function initAntiRaid(client) {
    return new AntiRaid(client);
}

module.exports = { initAntiRaid, MODULOS, AntiRaid };
