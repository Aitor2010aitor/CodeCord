// admin-panel.js
// Panel de administración web para el bot de Discord

require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const configManager = require('../scripts/config-manager.js');
const path = require('path');
const os = require('os');
const { MessageFlags } = require('discord.js');

// =====================================================================
// ⚙️ CARGAR CONFIGURACIÓN DESDE PANEL-CONFIG.JSON
// =====================================================================
let panelConfig = {
    url: process.env.PANEL_URL || 'lik',
    port: parseInt(process.env.PORT || process.env.PANEL_PORT || 'puerto', 10),
    requireDiscordAuth: process.env.REQUIRE_DISCORD_AUTH === 'true'
};

// LOGIN: true = pide Discord | false = abre directo. Cambiar aquí para activar/desactivar
const LOGIN = false;  // Cambiar a true para activar login con Discord
const loginRequired = LOGIN === true;

function getSessionSecret() {
    const configuredSecret = process.env.SESSION_SECRET?.trim();
    if (configuredSecret) return configuredSecret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET no está configurado. Define un valor aleatorio y seguro en tu archivo .env.');
    }

    return crypto.randomBytes(32).toString('hex');
}

// Auto-extraer puerto de la URL si se especifica
let tempUrl = panelConfig.url.trim();
if (tempUrl) {
    if (tempUrl.endsWith('/')) tempUrl = tempUrl.slice(0, -1);

    try {
        const parsedUrl = new URL(tempUrl.startsWith('http') ? tempUrl : 'http://' + tempUrl);
        if (parsedUrl.port) {
            panelConfig.port = parseInt(parsedUrl.port, 10);
        }
    } catch (err) {
        // Ignorar error de URL inválida
    }
}
// =====================================================================

const session = require('express-session');
const multer = require('multer');
const app = express();

// Crear carpeta de uploads si no existe
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath);

app.use(express.json());
app.use('/uploads', express.static(uploadsPath));

app.get('/api/list-uploads', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsPath)
            .filter(file => {
                const fullPath = path.join(uploadsPath, file);
                return fs.statSync(fullPath).isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
            })
            .map(file => `/uploads/${file}`);
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: 'Error al listar archivos' });
    }
});

const Store = session.Store;
class SimpleFileStore extends Store {
    constructor() {
        super();
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.path = path.join(dataDir, 'sessions.json');
        this.sessions = {};
        if (fs.existsSync(this.path)) {
            try { this.sessions = JSON.parse(fs.readFileSync(this.path, 'utf8')); } catch (e) { }
        }
    }
    get(sid, cb) { cb(null, this.sessions[sid] || null); }
    set(sid, sess, cb) {
        this.sessions[sid] = sess;
        fs.writeFileSync(this.path, JSON.stringify(this.sessions));
        cb(null);
    }
    destroy(sid, cb) {
        delete this.sessions[sid];
        fs.writeFileSync(this.path, JSON.stringify(this.sessions));
        if (typeof cb === 'function') cb(null);
    }
}

app.use(session({
    store: new SimpleFileStore(),
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}));

// Configurar Multer para guardar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsPath),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// NUEVO: Función para registrar actividad desde el panel
function logPanelActivity(guildId, type, message) {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const activityPath = path.join(dataDir, 'bot-activity.json');
    let activity = [];
    try {
        if (fs.existsSync(activityPath)) {
            activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
        }
    } catch (e) { }

    activity.unshift({
        guildId,
        type: `PANEL_${type}`,
        message,
        timestamp: new Date().toISOString()
    });

    if (activity.length > 50) activity = activity.slice(0, 50);

    try {
        fs.writeFileSync(activityPath, JSON.stringify(activity, null, 2), 'utf8');
    } catch (e) { }
}

// Configuración de Discord OAuth2 (Añadir a .env)
const CLIENT_ID = (process.env.CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
const CLIENT_SECRET = (process.env.CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

function getRedirectUri(type = 'callback') {
    if (type === 'callback' && process.env.REDIRECT_URI) return process.env.REDIRECT_URI.trim();
    if (type === 'verify-callback' && process.env.VERIFY_REDIRECT_URI) return process.env.VERIFY_REDIRECT_URI.trim();

    let url = panelConfig.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
    }
    if (url.endsWith('/')) url = url.slice(0, -1);
    return `${url}/${type}`;
}

const REDIRECT_URI = getRedirectUri('callback');

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Ruta de Login
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    // Si el inicio de sesión está desactivado ('no'), ir directo al panel
    if (!loginRequired) return res.redirect('/');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    const botAvatar = botClient?.user?.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const botName = botClient?.user?.username || 'Bot Admin';
    const errorMsg = req.query.error === 'no_admin_perms' ? 'Acceso denegado: Tu cuenta no es administradora del bot.' : '';

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Iniciar Sesión - ${botName}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body { background: #0f0f13; color: white; font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .login-card { background: #181825; padding: 40px 30px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); width: 100%; max-width: 380px; }
                .bot-logo { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; border: 3px solid #5865f2; box-shadow: 0 0 20px rgba(88,101,242,0.4); object-fit: cover; }
                h2 { margin: 0 0 6px; font-size: 1.6rem; font-weight: 800; }
                p { color: #a9a9b3; font-size: 0.9rem; margin-bottom: 25px; line-height: 1.4; }
                .error-box { background: rgba(243,139,168,0.15); border: 1px solid #f38ba8; color: #f38ba8; padding: 10px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 20px; }
                .discord-btn { background: #5865f2; color: white; border: none; padding: 14px; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.2s; box-shadow: 0 5px 15px rgba(88,101,242,0.3); }
                .discord-btn:hover { background: #4752c4; transform: translateY(-2px); }
            </style>
        </head>
        <body>
            <div class="login-card">
                <img src="${botAvatar}" class="bot-logo">
                <h2>${botName}</h2>
                <p>Panel de Administración Web</p>

                ${errorMsg ? `<div class="error-box"><i class="fas fa-exclamation-circle"></i> ${errorMsg}</div>` : ''}

                <a href="${url}" class="discord-btn"><i class="fab fa-discord"></i> Iniciar Sesión con Discord</a>
            </div>
        </body>
        </html>
    `);
});

// Ruta de Callback para Login de Discord (Administradores)
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/login');

    try {
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            scope: 'identify guilds'
        });

        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || tokenData.error) {
            let hint = '';
            if (tokenData.error === 'invalid_client') {
                hint = 'CLIENT_SECRET o CLIENT_ID no coinciden con Discord Developer Portal (OAuth2 > Client Secret). No uses el BOT_TOKEN en CLIENT_SECRET.';
            } else if (tokenData.error === 'invalid_grant') {
                hint = 'El código expiró o la Redirect URI no coincide con la registrada en Discord Developer Portal.';
            }
            console.error('[OAuth2] Error al intercambiar el código con Discord:', {
                status: tokenRes.status,
                ok: tokenRes.ok,
                error: tokenData.error,
                error_description: tokenData.error_description || undefined,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID ? 'configurado' : 'faltante',
                client_secret: CLIENT_SECRET ? 'configurado' : 'faltante',
                hint: hint || undefined
            });
            throw new Error(tokenData.error_description || `Discord OAuth error (${tokenRes.status}: ${tokenData.error || 'error'})`);
        }

        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userRes.json();

        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userGuildsRaw = await guildsRes.json();

        let allowedGuilds = [];
        if (Array.isArray(userGuildsRaw)) {
            allowedGuilds = userGuildsRaw.filter(g => {
                try {
                    const isOwner = g.owner === true;
                    const perms = BigInt(g.permissions || 0);
                    return isOwner || (perms & 8n) === 8n || (perms & 32n) === 32n;
                } catch (err) {
                    return false;
                }
            }).map(g => g.id);
        }

        // Si el usuario no es administrador en ningún servidor del bot, denegar acceso al panel
        if (allowedGuilds.length === 0) {
            console.log(`[OAuth2] Denegado acceso al panel a usuario no administrador: ${userData.username}`);
            return res.redirect('/login?error=no_admin_perms');
        }

        userData.isAdmin = true;
        req.session.user = userData;
        req.session.userGuilds = allowedGuilds;
        logPanelActivity(allowedGuilds[0] || 'SYSTEM', 'DISCORD_ADMIN_LOGIN', `Admin ${userData.username} inició sesión vía Discord`);
        res.redirect('/');
    } catch (e) {
        console.error('Error en OAuth2 Admin Login:', e);
        res.redirect('/login?error=invalid_password');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Proteger estrictamente el panel y todas las rutas API
app.use((req, res, next) => {
    const publicPaths = ['/login', '/login/password', '/callback', '/verify-callback', '/logout'];
    if (publicPaths.includes(req.path) || req.path.startsWith('/public') || req.path.startsWith('/uploads')) {
        return next();
    }

    // Si el inicio de sesión está desactivado ('no'), el panel se abre sin login
    if (!loginRequired) {
        return next();
    }

    // Si el usuario no ha iniciado sesión como Administrador, rechazar acceso
    if (!req.session.user || !req.session.user.id) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
        }
        return res.redirect('/login');
    }

    // Autorización por servidor para las rutas de la API
    if (req.path.startsWith('/api/guilds/') && !req.session.user.isAdmin && req.session.user.id !== 'admin') {
        const match = req.path.match(/^\/api\/guilds\/(\d+)/);
        if (match) {
            const guildId = match[1];
            const allowedGuilds = req.session.userGuilds || [];
            if (!allowedGuilds.includes(guildId)) {
                return res.status(403).json({ error: 'No tienes permisos de Administrador en este servidor.' });
            }
        }
    }

    next();
});

// Ruta para subir imágenes
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
    let baseUrl = '';
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    if (host) {
        baseUrl = `${protocol}://${host}`;
    } else {
        baseUrl = panelConfig.url.trim();
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'http://' + baseUrl;
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    }
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// Servir archivos estáticos si existen
const publicPath = path.join(__dirname, '..', 'admin-public');
if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
}

const PORT = process.env.PORT || process.env.ADMIN_PORT || panelConfig.port;

let botClient = null;
let botInfo = {
    uptime: 0,
    servers: 0,
    users: 0,
    channels: 0,
    startTime: Date.now()
};

function setBotClient(client) {
    botClient = client;
    botInfo.startTime = Date.now();
    console.log(`[DEBUG] Panel vinculado al bot: ${client.user?.tag || 'Desconocido'}`);
}

function updateBotStats() {
    if (!botClient) return;

    botInfo.servers = botClient.guilds.cache.size;
    botInfo.uptime = Date.now() - botInfo.startTime;

    let totalUsers = 0;
    let totalChannels = 0;

    botClient.guilds.cache.forEach(guild => {
        totalUsers += guild.memberCount;
        totalChannels += guild.channels.cache.size;
    });

    botInfo.users = totalUsers;
    botInfo.channels = totalChannels;
}

setInterval(updateBotStats, 30000);

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function getTicketLogs() {
    const ticketsDir = path.join(__dirname, '..', 'tickets');
    const logs = [];

    if (!fs.existsSync(ticketsDir)) {
        return logs;
    }

    const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.html'));

    files.forEach(file => {
        try {
            const stats = fs.statSync(path.join(ticketsDir, file));
            logs.push({
                name: file.replace('ticket_', '').replace('.html', ''),
                file: file,
                created: stats.mtime
            });
        } catch (e) {
            logs.push({ name: file, file: file, created: new Date() });
        }
    });

    return logs.sort((a, b) => new Date(b.created) - new Date(a.created));
}

// Endpoint para obtener logs del bot (actividad real)
app.get('/api/logs', (req, res) => {
    const activityPath = path.join(__dirname, '..', 'data', 'bot-activity.json');
    try {
        if (fs.existsSync(activityPath)) {
            let activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));

            // Filtrar logs si el usuario no tiene bypass
            if (req.session.user && !req.session.user.bypass) {
                const allowed = req.session.userGuilds || [];
                activity = activity.filter(log => !log.guildId || allowed.includes(log.guildId));
            }

            return res.json(activity);
        }
    } catch (e) { }
    res.json([]);
});

app.post('/api/logs/clear', (req, res) => {
    const activityPath = path.join(__dirname, '..', 'data', 'bot-activity.json');
    try {
        fs.writeFileSync(activityPath, JSON.stringify([]), 'utf8');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/status', (req, res) => {
    if (!botClient) {
        return res.json({ online: false, error: 'Bot no conectado' });
    }

    res.json({
        online: true,
        uptime: formatUptime(botInfo.uptime),
        servers: botClient.guilds.cache.size,
        users: botInfo.users,
        channels: botInfo.channels,
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        botName: botClient.user.username,
        botId: botClient.user.id,
        avatar: botClient.user.displayAvatarURL(),
        platform: os.platform(),
        nodeVersion: process.version,
        readyTimestamp: botClient.readyTimestamp,
        guildsNames: botClient.guilds.cache.map(g => g.name)
    });
});

app.get('/api/tickets', (req, res) => {
    const logs = getTicketLogs();
    res.json(logs);
});

// Endpoint: Listar tickets activos (canales abiertos) de un servidor
app.get('/api/guilds/:guildId/active-tickets', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const ticketChannels = guild.channels.cache.filter(c =>
            c.type === 0 && // GuildText
            c.name.startsWith('ticket-')
        );

        const allTickets = await Promise.all(ticketChannels.map(async ch => {
            // Extraer userId del nombre del canal (ticket-{userId} o ticket-{userId}-{texto})
            const parts = ch.name.replace('ticket-', '').split('-');
            const userId = parts[0];
            let member = guild.members.cache.get(userId);
            if (!member) {
                member = await guild.members.fetch(userId).catch(() => null);
            }

            let userAvatar = `https://cdn.discordapp.com/embed/avatars/0.png`;
            let userName = `Usuario#${userId}`;
            if (member) {
                userAvatar = member.user.displayAvatarURL({ size: 128 }) || member.user.defaultAvatarURL;
                userName = member.user.tag;
            }

            return {
                channelId: ch.id,
                channelName: ch.name,
                userId: userId,
                userName: userName,
                userAvatar: userAvatar,
                categoryName: ch.parent ? ch.parent.name : 'Sin categoría',
                createdAt: ch.createdAt ? ch.createdAt.toISOString() : null
            };
        }));
        allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = allTickets.length;
        const tickets = allTickets.slice(offset, offset + limit);
        const hasMore = offset + limit < total;

        res.json({
            tickets: tickets,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                hasMore: hasMore,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        console.error('Error obteniendo tickets activos:', e);
        res.status(500).json({ error: 'Error obteniendo tickets activos' });
    }
});

// Endpoint: Cerrar un ticket activo desde el panel de admin
app.post('/api/guilds/:guildId/close-ticket', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId requerido' });

    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal de ticket no encontrado' });

        // Generar log del ticket antes de cerrar
        const { MessageFlags, EmbedBuilder } = require('discord.js');
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            const transcript = messages.reverse().map(m =>
                `[${m.createdAt.toLocaleString('es-ES')}] ${m.author.tag}: ${m.content || '(embed/archivo)'}`
            ).join('\n');

            const fs = require('fs');
            const path = require('path');
            const ticketsDir = path.join(__dirname, '..', 'tickets');
            if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir, { recursive: true });

            const fileName = `ticket_${channel.name}_${Date.now()}.html`;
            const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${channel.name}</title>
<style>body{font-family:Arial;background:#1a1a2e;color:#eee;padding:20px;max-width:800px;margin:0 auto}
.msg{margin:8px 0;padding:8px 12px;background:#16213e;border-radius:6px;border-left:3px solid #5865F2}
.time{color:#888;font-size:0.8rem}.author{color:#5865F2;font-weight:bold}
h1{color:#5865F2;border-bottom:1px solid #333;padding-bottom:10px}</style></head><body>
<h1>📋 Transcript: ${channel.name}</h1>
<p style="color:#888">Cerrado desde el panel de administración - ${new Date().toLocaleString('es-ES')}</p>
${messages.reverse().map(m => `<div class="msg"><span class="author">${m.author.tag}</span> <span class="time">${m.createdAt.toLocaleString('es-ES')}</span><br>${m.content || '<em>(embed/archivo)</em>'}</div>`).join('')}
</body></html>`;
            fs.writeFileSync(path.join(ticketsDir, fileName), htmlContent, 'utf8');

            // Enviar log al canal de logs si está configurado
            const guildConfig = configManager.loadGuildConfig(guild.id, 'tickets', {});
            if (guildConfig.ticketLogChannelId) {
                const logChannel = guild.channels.cache.get(guildConfig.ticketLogChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🔒 Ticket Cerrado (Admin Panel)')
                        .setDescription(`Canal: **${channel.name}**\nCerrado desde el panel de administración web.`)
                        .setColor(0xED4245)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] }).catch(() => { });
                }
            }
        } catch (logErr) {
            console.error('Error generando log del ticket:', logErr);
        }

        await channel.delete('Ticket cerrado desde el panel de administración');
        res.json({ success: true });
    } catch (e) {
        console.error('Error cerrando ticket:', e);
        res.status(500).json({ error: 'Error cerrando el ticket' });
    }
});

app.get('/api/tickets/:filename', (req, res) => {
    const filePath = path.join(__dirname, '..', 'tickets', req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.sendFile(filePath);
});

app.get('/api/commands', (req, res) => {
    if (!botClient) {
        return res.json({ error: 'Bot no conectado' });
    }

    const commands = [];
    botClient.application.commands.cache.forEach(cmd => {
        commands.push({
            name: cmd.name,
            id: cmd.id,
            description: cmd.description
        });
    });

    res.json(commands);
});

app.get('/api/guilds', (req, res) => {
    if (!botClient) {
        console.log('[DEBUG] Intento de acceso a /api/guilds pero botClient es NULL');
        return res.json({ error: 'Bot no conectado' });
    }

    let botGuilds = Array.from(botClient.guilds.cache.values());

    // Filtrar si no es un login bypass
    if (req.session.user && !req.session.user.bypass) {
        const allowed = req.session.userGuilds || [];
        botGuilds = botGuilds.filter(g => allowed.includes(g.id));
    }

    const guilds = botGuilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        members: guild.memberCount,
        channels: guild.channels.cache.size,
        icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png'
    }));


    res.json(guilds);
});

// Info básica de un servidor (nombre + icono)
app.get('/api/guilds/:guildId/info', (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });
    res.json({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 128, extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
        members: guild.memberCount
    });
});



// Endpoint para obtener miembros de un servidor específico
app.get('/api/guilds/:guildId/members', async (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        let limit = parseInt(req.query.limit, 10) || 100;
        if (limit > 1000) limit = 1000;
        const after = req.query.after || null; // snowflake ID cursor

        // Fetch all members via HTTP (not cache) so we always have fresh data
        const allMembers = await guild.members.fetch({ limit: 1000 });

        // Sort members by ID (snowflake = chronological order)
        let sorted = [...allMembers.values()].sort((a, b) => {
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });

        // Apply cursor: only members whose ID is greater than 'after'
        if (after) {
            const idx = sorted.findIndex(m => m.id === after);
            if (idx !== -1) {
                sorted = sorted.slice(idx + 1);
            } else {
                // If not found, filter by ID > after string comparison
                sorted = sorted.filter(m => m.id > after);
            }
        }

        // Take the page
        const page = sorted.slice(0, limit);
        const hasMore = sorted.length > limit;
        const nextAfter = hasMore ? page[page.length - 1].id : null;

        const memberList = page.map(m => ({
            id: m.id,
            tag: m.user.tag,
            nickname: m.nickname,
            roles: m.roles.cache.size - 1,
            roleList: m.roles.cache
                .filter(r => r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
            avatar: m.user.displayAvatarURL(),
            joinedAt: m.joinedAt
        }));

        res.json({ members: memberList, hasMore, nextAfter });
    } catch (e) {
        console.error('Error obteniendo miembros:', e);
        res.status(500).json({ error: 'Error obteniendo miembros' });
    }
});

// Endpoints para configuración de logs (según la imagen de CodeCord)

app.get('/api/guilds/:guildId/logs-config', (req, res) => {
    const config = configManager.loadGuildConfig(req.params.guildId, 'logs', {});
    res.json(config || {});
});

app.post('/api/guilds/:guildId/logs-config', (req, res) => {
    configManager.saveGuildConfig(req.params.guildId, 'logs', req.body);
    logPanelActivity(req.params.guildId, 'LOGS', 'Configuración de logs granulares actualizada');
    res.json({ success: true });
});

// Endpoints para configuración de moderación y AutoMod
app.get('/api/guilds/:guildId/moderation-config', (req, res) => {
    const defaultConfig = {
        censorship: {
            capsEnabled: false,
            capsPercentage: 70,
            capsMinLength: 3,
            wordsEnabled: false,
            blockedWords: [],
            imagesEnabled: false,
            channels: [],
            alertChannel: true,
            alertDM: false
        },
        actions: {
            deleteOnBan: false,
            deleteOnKick: false
        }
    };
    const config = configManager.loadGuildConfig(req.params.guildId, 'moderation', defaultConfig);
    res.json(config);
});

app.post('/api/guilds/:guildId/moderation-config', (req, res) => {
    configManager.saveGuildConfig(req.params.guildId, 'moderation', req.body);
    logPanelActivity(req.params.guildId, 'MODERATION', 'Configuración de moderación y AutoMod actualizada');
    res.json({ success: true });
});

// Endpoints para configuración Antiraid (12 módulos)
app.get('/api/guilds/:guildId/antiraid-config', (req, res) => {
    const defaultConfig = {
        whitelist: [],
        modulos: {
            crearCanales: { activado: false, limite: 1, accion: 'ban' },
            borrarCanales: { activado: false, limite: 1, accion: 'ban' },
            editarCanales: { activado: false, limite: 1, accion: 'ban' },
            crearRoles: { activado: false, limite: 1, accion: 'ban' },
            borrarRoles: { activado: false, limite: 1, accion: 'ban' },
            editarRoles: { activado: false, limite: 1, accion: 'ban' },
            crearEmojis: { activado: false, limite: 1, accion: 'ban' },
            borrarEmojis: { activado: false, limite: 1, accion: 'ban' },
            expulsarUsuarios: { activado: false, limite: 1, accion: 'ban' },
            banearUsuarios: { activado: false, limite: 1, accion: 'ban' },
            desbanearUsuarios: { activado: false, limite: 1, accion: 'ban' },
            editarWebhooks: { activado: false, limite: 1, accion: 'ban' }
        }
    };
    const config = configManager.loadGuildConfig(req.params.guildId, 'antiraid', defaultConfig);
    res.json(config);
});

app.post('/api/guilds/:guildId/antiraid-config', (req, res) => {
    configManager.saveGuildConfig(req.params.guildId, 'antiraid', req.body);
    logPanelActivity(req.params.guildId, 'ANTIRAID', 'Configuración Antiraid actualizada');
    // Si el bot está conectado, refrescar la config en memoria
    if (botClient && botClient.antiRaidV2) {
        const config = configManager.loadGuildConfig(req.params.guildId, 'antiraid', {});
        botClient.antiRaidV2.configs.set(req.params.guildId, config);
    }
    res.json({ success: true });
});

// Endpoints para configuración de bienvenidas

app.get('/api/guilds/:guildId/welcome-config', (req, res) => {
    const config = configManager.loadGuildConfig(req.params.guildId, 'welcome', { enabled: false, channel: '', message: '¡Bienvenido {user} a {server}!', color: '#5865f2' });
    res.json(config);
});

app.post('/api/guilds/:guildId/welcome-config', (req, res) => {
    configManager.saveGuildConfig(req.params.guildId, 'welcome', req.body);
    logPanelActivity(req.params.guildId, 'WELCOME', 'Configuración de bienvenidas actualizada');
    res.json({ success: true });
});

app.post('/api/guilds/:guildId/welcome-test', (req, res) => {
    const guildId = req.params.guildId;
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    // Buscar un miembro real para la prueba, o usar el bot si no hay nadie
    const member = guild.members.cache.filter(m => !m.user.bot).first() || guild.members.cache.get(botClient.user.id);

    // Emitir el evento para que index.js lo procese
    botClient.emit('guildMemberAdd', member);

    logPanelActivity(guildId, 'WELCOME', 'Prueba de bienvenida ejecutada desde el panel');
    res.json({ success: true });
});

// Endpoint para obtener todos los canales de texto de un servidor
app.get('/api/guilds/:guildId/channels', (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channels = guild.channels.cache
        .filter(c => c.type === 0 || c.type === 5) // Text and Announcement channels
        .map(c => ({ id: c.id, name: c.name }));

    res.json(channels);
});



function getGuildGiveawayData(guildId) {
    const data = configManager.loadGuildConfig(guildId, 'giveaways', {});
    if (!data.giveaways) {
        data.giveaways = [];
        data.permissions = { canReroll: [], canFinish: [], canEdit: [] };
    }
    return data;
}

let isProcessingGiveaways = false;

function saveGuildGiveawayData(guildId, guildData) {
    configManager.saveGuildConfig(guildId, 'giveaways', guildData);
}

function normalizeGiveawayDateString(value) {
    if (!value) return null;
    const normalized = String(value).trim().replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseGiveawayDateMs(value) {
    if (!value) return NaN;
    const normalized = String(value).trim().replace(' ', 'T');
    const date = new Date(normalized);
    return date.getTime();
}

function formatGiveawayEmbed(guild, giveaway) {
    const embed = new (require('discord.js').EmbedBuilder)()
        .setTitle(`🎉 Sorteo: ${giveaway.prize}`)
        .setDescription(giveaway.details || 'Participa y gana el premio del sorteo.')
        .setColor(giveaway.status === 'active' ? '#f9d342' : '#5865f2')
        .setTimestamp();

    if (giveaway.image) {
        embed.setImage(giveaway.image);
    }

    const channel = guild.channels.cache.get(giveaway.channelId);
    const channelName = channel ? `#${channel.name}` : 'Canal no encontrado';

    embed.addFields(
        { name: 'Canal del Sorteo', value: channelName, inline: true },
        { name: 'Estado', value: giveaway.status === 'scheduled' ? 'Programado' : giveaway.status === 'active' ? 'Activo' : giveaway.status === 'ended' ? 'Finalizado' : 'Cancelado', inline: true },
        { name: 'Participantes', value: `${(giveaway.participants || []).length}`, inline: true }
    );

    if (giveaway.startTime) {
        embed.addFields({ name: 'Inicia', value: new Date(giveaway.startTime).toLocaleString('es-ES'), inline: true });
    }
    if (giveaway.endTime) {
        embed.addFields({ name: 'Finaliza', value: new Date(giveaway.endTime).toLocaleString('es-ES'), inline: true });
    }

    if (giveaway.status !== 'active' && giveaway.winnerId) {
        embed.addFields({ name: 'Ganador', value: giveaway.winnerTag || 'Desconocido', inline: true });
        embed.addFields({ name: 'Estado del ganador', value: giveaway.winnerStatus || 'Pendiente', inline: true });
    }

    if (giveaway.status === 'active') {
        embed.setFooter({ text: 'Presiona el botón para participar en el sorteo.' });
    } else if (giveaway.status === 'scheduled') {
        embed.setFooter({ text: 'Sorteo programado' });
    } else if (giveaway.status === 'ended') {
        embed.setFooter({ text: 'Sorteo finalizado' });
    } else {
        embed.setFooter({ text: 'Sorteo cancelado' });
    }

    return embed;
}

async function processGuildScheduledGiveaways(guild, guildData) {
    if (!guild || !guildData?.giveaways) return false;
    let changed = false;
    const now = Date.now();

    for (const giveaway of guildData.giveaways) {
        if (giveaway.status === 'cancelled' || giveaway.status === 'ended') {
            continue;
        }

        const startMs = giveaway.startTime ? parseGiveawayDateMs(giveaway.startTime) : NaN;
        const endMs = giveaway.endTime ? parseGiveawayDateMs(giveaway.endTime) : NaN;

        if (giveaway.startTime && Number.isNaN(startMs)) {
            console.warn(`⚠️ Fecha de inicio inválida para sorteo ${giveaway.id}: ${giveaway.startTime}`);
            continue;
        }
        if (giveaway.endTime && Number.isNaN(endMs)) {
            console.warn(`⚠️ Fecha de fin inválida para sorteo ${giveaway.id}: ${giveaway.endTime}`);
        }

        // Sin log por cada sorteo para no spamear la consola cada 30 segundos

        if (giveaway.status === 'scheduled' && now >= startMs) {
            giveaway.status = 'active';
            changed = true;
            try {
                const updated = await updateGiveawayMessage(guild, giveaway);
                if (!updated) {
                    console.warn(`⚠️ No se pudo actualizar el mensaje al activar sorteo ${giveaway.id}`);
                }
            } catch (err) {
                console.error(`⚠️ No se pudo actualizar el mensaje al activar sorteo ${giveaway.id}:`, err);
            }
            saveGuildGiveawayData(guild.id, guildData);
            console.log(`✅ Sorteo activado: ${giveaway.prize} en servidor ${guild.name}`);
            if (!Number.isNaN(endMs) && now >= endMs) {
                try {
                    await finalizeGiveaway(guild, giveaway);
                } catch (err) {
                    console.error(`❌ Error finalizando sorteo ${giveaway.id}:`, err);
                }
                console.log(`🏆 Sorteo finalizado inmediatamente: ${giveaway.prize} en servidor ${guild.name}`);
            }
            continue;
        }

        if (giveaway.status === 'active' && !Number.isNaN(endMs) && now >= endMs) {
            try {
                await finalizeGiveaway(guild, giveaway);
            } catch (err) {
                console.error(`❌ Error finalizando sorteo ${giveaway.id}:`, err);
            }
            changed = true;
            console.log(`🏆 Sorteo finalizado: ${giveaway.prize} en servidor ${guild.name}`);
        }
    }

    return changed;
}

async function findExistingGiveawayMessage(channel, giveaway) {
    if (!channel || !channel.isTextBased()) return null;
    const targetCustomId = `giveaway_join_${giveaway.id}`;
    let beforeId = null;
    let attempts = 0;

    try {
        while (attempts < 5) {
            const messages = await channel.messages.fetch({ limit: 100, before: beforeId || undefined });
            if (!messages.size) break;

            for (const message of messages.values()) {
                if (message.components?.length) {
                    for (const row of message.components) {
                        const componentArray = row.components || [];
                        for (const component of componentArray) {
                            if (component.customId === targetCustomId) {
                                return message;
                            }
                        }
                    }
                }

                const title = message.embeds?.[0]?.title;
                if (title && title.includes(`Sorteo: ${giveaway.prize}`)) {
                    return message;
                }
            }

            beforeId = messages.last().id;
            attempts += 1;
        }
    } catch (err) {
        console.warn(`⚠️ No se pudo buscar mensaje existente del sorteo ${giveaway.id}:`, err);
    }
    return null;
}

async function updateGiveawayMessage(guild, giveaway) {
    if (!giveaway.channelId) {
        console.warn(`⚠️ Sorteo ${giveaway.id} sin channelId`);
        return false;
    }
    try {
        const channel = guild.channels.cache.get(giveaway.channelId);
        if (!channel) {
            console.warn(`⚠️ Canal ${giveaway.channelId} no encontrado para sorteo ${giveaway.id}`);
            return false;
        }
        if (!channel.isTextBased()) {
            console.warn(`⚠️ Canal ${giveaway.channelId} no es de texto para sorteo ${giveaway.id}`);
            return false;
        }

        const embed = formatGiveawayEmbed(guild, giveaway);
        const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const joinButton = new ButtonBuilder()
            .setCustomId(`giveaway_join_${giveaway.id}`)
            .setLabel(giveaway.status === 'active' ? 'Participar' : giveaway.status === 'scheduled' ? 'Sorteo programado' : 'Sorteo cerrado')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎉')
            .setDisabled(giveaway.status !== 'active');

        const actionRow = new ActionRowBuilder().addComponents(joinButton);

        let message = null;
        if (giveaway.messageId) {
            message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components: [actionRow] });
                return true;
            }
            console.warn(`⚠️ Mensaje ${giveaway.messageId} del sorteo ${giveaway.id} no encontrado, buscando mensaje existente...`);
        }

        const existingMessage = await findExistingGiveawayMessage(channel, giveaway);
        if (existingMessage) {
            giveaway.messageId = existingMessage.id;
            await existingMessage.edit({ embeds: [embed], components: [actionRow] });
            return true;
        }

        const newMessage = await channel.send({ embeds: [embed], components: [actionRow] });
        giveaway.messageId = newMessage.id;
        console.log(`🆕 Nuevo mensaje de sorteo ${giveaway.id} enviado y almacenado como ${newMessage.id}`);
        return true;
    } catch (error) {
        console.error(`Error actualizando mensaje de sorteo ${giveaway.id}:`, error);
        return false;
    }
}

async function ensureGiveawayMessages(guild, guildData) {
    if (!guild || !guildData?.giveaways) return false;
    let changed = false;

    for (const giveaway of guildData.giveaways) {
        // No procesar sorteos finalizados o cancelados
        if (giveaway.status === 'ended' || giveaway.status === 'cancelled') continue;
        if (!giveaway.channelId) continue;

        const channel = guild.channels.cache.get(giveaway.channelId);
        if (!channel || !channel.isTextBased()) continue;

        // Si ya tiene messageId, verificar que existe; si no existe intentar buscar y editar, NO crear nuevo salvo que no haya ninguno
        if (giveaway.messageId) {
            const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
            if (!message) {
                // El mensaje fue borrado: buscar existente antes de crear nuevo
                const existing = await findExistingGiveawayMessage(channel, giveaway);
                if (existing) {
                    giveaway.messageId = existing.id;
                    const embed = formatGiveawayEmbed(guild, giveaway);
                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const joinButton = new ButtonBuilder()
                        .setCustomId(`giveaway_join_${giveaway.id}`)
                        .setLabel(giveaway.status === 'active' ? 'Participar' : 'Sorteo programado')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎉')
                        .setDisabled(giveaway.status !== 'active');
                    await existing.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(joinButton)] }).catch(() => null);
                    changed = true;
                } else {
                    // No hay ningún mensaje, crear uno
                    const created = await updateGiveawayMessage(guild, giveaway);
                    if (created) changed = true;
                }
            }
            // Si el mensaje existe, no hacer nada (evitar ediciones innecesarias cada 30s)
        } else {
            // Sin messageId: crear mensaje por primera vez
            const created = await updateGiveawayMessage(guild, giveaway);
            if (created) changed = true;
        }
    }

    return changed;
}

function pickRandomParticipant(giveaway, exclude = []) {
    const participants = (giveaway.participants || []).filter(id => !exclude.includes(id));
    if (participants.length === 0) return null;
    return participants[Math.floor(Math.random() * participants.length)];
}

async function finalizeGiveaway(guild, giveaway, actor = null, forceNew = false) {
    if (giveaway.status === 'cancelled') return giveaway;
    const oldWinnerId = giveaway.winnerId;
    const oldWinnerTag = giveaway.winnerTag;
    const exclude = forceNew && oldWinnerId ? [oldWinnerId] : [];
    const newWinnerId = pickRandomParticipant(giveaway, exclude);

    giveaway.status = 'ended';
    giveaway.endedAt = new Date().toISOString();

    if (!newWinnerId) {
        giveaway.winnerId = null;
        giveaway.winnerTag = 'Sin participantes';
        giveaway.winnerStatus = 'Pendiente';
    } else {
        const member = await guild.members.fetch(newWinnerId).catch(() => null);
        giveaway.winnerId = newWinnerId;
        giveaway.winnerTag = member ? `${member.user.tag}` : `${newWinnerId}`;
        giveaway.winnerStatus = 'Pendiente';
    }

    const entry = {
        type: forceNew ? 'reroll' : 'winner',
        date: new Date().toISOString(),
        actorId: actor?.id || null,
        actorTag: actor?.tag || null,
        winnerId: giveaway.winnerId,
        winnerTag: giveaway.winnerTag,
        previousWinnerId: forceNew ? oldWinnerId : null,
        previousWinnerTag: forceNew ? oldWinnerTag : null
    };
    if (!giveaway.history) giveaway.history = [];
    giveaway.history.push(entry);
    if (forceNew) giveaway.rerollCount = (giveaway.rerollCount || 0) + 1;

    const guildData = getGuildGiveawayData(guild.id);
    const giveawayIndex = guildData.giveaways.findIndex(g => g.id === giveaway.id);
    if (giveawayIndex >= 0) {
        guildData.giveaways[giveawayIndex] = giveaway;
        saveGuildGiveawayData(guild.id, guildData);
    }

    await updateGiveawayMessage(guild, giveaway);

    // Enviar anuncio del ganador (sólo si no se envió antes)
    if (!giveaway.announcementSent) {
        try {
            const channel = guild.channels.cache.get(giveaway.channelId);
            if (channel && channel.isTextBased()) {
                const mention = giveaway.winnerId ? `<@${giveaway.winnerId}>` : 'Nadie';
                const everyone = giveaway.mentionEveryone ? ' @everyone' : '';
                const content = giveaway.winnerId
                    ? `🎉 ¡Sorteo terminado! ${mention} ha ganado **${giveaway.prize}**.${everyone}`
                    : `⚠️ El sorteo **${giveaway.prize}** ha terminado sin participantes.${everyone}`;
                await channel.send({
                    content,
                    allowedMentions: { parse: ['users', 'everyone'] }
                }).catch(() => null);
            }
        } catch (announcementError) {
            console.error('Error enviando anuncio de sorteo finalizado:', announcementError);
        }
        giveaway.announcementSent = true;
        // Guardar el flag para no reenviar en próximas ejecuciones
        if (giveawayIndex >= 0) {
            guildData.giveaways[giveawayIndex] = giveaway;
            saveGuildGiveawayData(guild.id, guildData);
        }
    }

    return giveaway;
}

async function processScheduledGiveaways(isStartup = false) {
    if (!botClient) return;
    if (isProcessingGiveaways) return;
    isProcessingGiveaways = true;
    try {
        // Procesar sorteos programados para cada servidor
        for (const guild of botClient.guilds.cache.values()) {
            try {
                const guildData = getGuildGiveawayData(guild.id);
                if (!guildData.giveaways || guildData.giveaways.length === 0) continue;

                const changedSchedule = await processGuildScheduledGiveaways(guild, guildData);
                // En el arranque omitir ensureGiveawayMessages para no re-enviar mensajes masivamente al reiniciar el bot
                const changedMessages = isStartup ? false : await ensureGiveawayMessages(guild, guildData);
                if (changedSchedule || changedMessages) saveGuildGiveawayData(guild.id, guildData);
            } catch (guildError) {
                console.error(`Error procesando sorteos en servidor ${guild.name} (${guild.id}):`, guildError);
            }
        }
    } catch (error) {
        console.error('Error procesando sorteos programados:', error);
    } finally {
        isProcessingGiveaways = false;
    }
}

setInterval(() => {
    processScheduledGiveaways().catch(err => console.error('Error en intervalo de sorteos:', err));
}, 30000);

async function handleGiveawayInteraction(interaction) {
    try {
        if (!interaction.customId.startsWith('giveaway_join_')) return false;

        const giveawayId = interaction.customId.replace('giveaway_join_', '');
        const guildId = interaction.guildId;
        const guild = botClient.guilds.cache.get(guildId);
        if (!guild) return false;

        const guildData = getGuildGiveawayData(guildId);
        const giveaway = guildData.giveaways.find(g => g.id === giveawayId);
        if (!giveaway) {
            await interaction.reply({ content: '❌ Sorteo no encontrado o ya no está disponible.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (giveaway.status !== 'active') {
            await interaction.reply({ content: '⚠️ Este sorteo no está activo en este momento.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const userId = interaction.user.id;
        if (giveaway.participants.includes(userId)) {
            await interaction.reply({ content: '✅ Ya estás participando en este sorteo.', flags: MessageFlags.Ephemeral });
            return true;
        }

        giveaway.participants.push(userId);
        saveGuildGiveawayData(guildId, guildData);
        await updateGiveawayMessage(guild, giveaway);

        await interaction.reply({ content: '🎉 ¡Te has unido al sorteo! Mucha suerte.', flags: MessageFlags.Ephemeral });
        return true;
    } catch (error) {
        console.error('Error manejando interacción de sorteo:', error);
        try { await interaction.reply({ content: '❌ Error procesando tu participación.', flags: MessageFlags.Ephemeral }); } catch (e) { }
        return true;
    }
}

app.get('/api/guilds/:guildId/giveaways', async (req, res) => {
    if (botClient && !isProcessingGiveaways) {
        const guild = botClient.guilds.cache.get(req.params.guildId);
        if (guild) {
            const guildData = getGuildGiveawayData(req.params.guildId);
            const changed = await processGuildScheduledGiveaways(guild, guildData);
            if (changed) saveGuildGiveawayData(req.params.guildId, guildData);
        }
    }
    const guildData = getGuildGiveawayData(req.params.guildId);
    res.json(guildData);
});

app.post('/api/guilds/:guildId/giveaways/recheck', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const guildData = getGuildGiveawayData(req.params.guildId);
    if (!guildData) return res.status(404).json({ error: 'No se encontró información del sorteo' });

    if (!isProcessingGiveaways) {
        const changed = await processGuildScheduledGiveaways(guild, guildData);
        if (changed) saveGuildGiveawayData(req.params.guildId, guildData);
    }

    res.json({ success: true, changed: false, giveaways: guildData.giveaways || [] });
});

app.post('/api/guilds/:guildId/giveaways', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const { prize, details, channelId, image, startTime, endTime, permissions } = req.body;
    if (!prize || !channelId) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: prize, channelId' });
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    const normalizedStart = normalizeGiveawayDateString(startTime) || new Date().toISOString();
    const normalizedEnd = normalizeGiveawayDateString(endTime);
    const isScheduled = Boolean(startTime) && normalizeGiveawayDateString(startTime) && new Date(normalizeGiveawayDateString(startTime)).getTime() > Date.now();

    const giveaway = {
        id: `gw_${Date.now()}`,
        prize,
        details: details || '',
        channelId,
        image: image || null,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        createdAt: new Date().toISOString(),
        status: isScheduled ? 'scheduled' : 'active',
        winnerId: null,
        winnerTag: null,
        winnerStatus: 'Pendiente',
        participants: [],
        history: [],
        rerollCount: 0,
        mentionEveryone: req.body.mentionEveryone || false,
        permissions: {
            canReroll: permissions?.canReroll || [],
            canFinish: permissions?.canFinish || [],
            canEdit: permissions?.canEdit || []
        }
    };

    try {
        const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const embed = formatGiveawayEmbed(guild, giveaway);
        const joinButton = new ButtonBuilder()
            .setCustomId(`giveaway_join_${giveaway.id}`)
            .setLabel(giveaway.status === 'active' ? 'Participar' : 'Sorteo programado')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎉')
            .setDisabled(giveaway.status !== 'active');

        const row = new ActionRowBuilder().addComponents(joinButton);
        const msg = await channel.send({ embeds: [embed], components: [row] });
        giveaway.messageId = msg.id;
    } catch (error) {
        console.error('Error enviando el mensaje del sorteo:', error);
        return res.status(500).json({ error: 'Error enviando mensaje del sorteo' });
    }

    const guildData = getGuildGiveawayData(req.params.guildId);
    guildData.giveaways.unshift(giveaway);
    saveGuildGiveawayData(req.params.guildId, guildData);

    res.json({ success: true, giveaway });
});

app.put('/api/guilds/:guildId/giveaways/:giveawayId', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const guildData = getGuildGiveawayData(req.params.guildId);
    const giveaway = guildData.giveaways.find(g => g.id === req.params.giveawayId);
    if (!giveaway) return res.status(404).json({ error: 'Sorteo no encontrado' });

    const { prize, details, channelId, image, startTime, endTime, status, winnerStatus, permissions } = req.body;
    if (prize !== undefined) giveaway.prize = prize;
    if (details !== undefined) giveaway.details = details;
    if (channelId !== undefined) giveaway.channelId = channelId;
    if (image !== undefined) giveaway.image = image;
    if (startTime !== undefined) {
        const normalized = normalizeGiveawayDateString(startTime);
        if (normalized) giveaway.startTime = normalized;
    }
    if (endTime !== undefined) {
        giveaway.endTime = normalizeGiveawayDateString(endTime);
    }
    if (status !== undefined) giveaway.status = status;
    if (winnerStatus !== undefined) giveaway.winnerStatus = winnerStatus;
    if (permissions !== undefined) {
        giveaway.permissions.canReroll = permissions.canReroll || giveaway.permissions.canReroll;
        giveaway.permissions.canFinish = permissions.canFinish || giveaway.permissions.canFinish;
        giveaway.permissions.canEdit = permissions.canEdit || giveaway.permissions.canEdit;
    }
    if (req.body.mentionEveryone !== undefined) {
        giveaway.mentionEveryone = !!req.body.mentionEveryone;
    }

    saveGuildGiveawayData(req.params.guildId, guildData);
    await updateGiveawayMessage(guild, giveaway);
    res.json({ success: true, giveaway });
});

app.post('/api/guilds/:guildId/giveaways/:giveawayId/reroll', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const guildData = getGuildGiveawayData(req.params.guildId);
    const giveaway = guildData.giveaways.find(g => g.id === req.params.giveawayId);
    if (!giveaway) return res.status(404).json({ error: 'Sorteo no encontrado' });
    if (!giveaway.participants || giveaway.participants.length === 0) {
        return res.status(400).json({ error: 'No hay participantes para rerollear' });
    }

    const actor = req.body.actor || null;
    try {
        await finalizeGiveaway(guild, giveaway, actor, true);
        res.json({ success: true, giveaway });
    } catch (e) {
        console.error('Error rerolleanado sorteo:', e);
        res.status(500).json({ error: 'Error rerolleanado sorteo' });
    }
});

app.post('/api/guilds/:guildId/giveaways/:giveawayId/end', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const guildData = getGuildGiveawayData(req.params.guildId);
    const giveaway = guildData.giveaways.find(g => g.id === req.params.giveawayId);
    if (!giveaway) return res.status(404).json({ error: 'Sorteo no encontrado' });

    try {
        await finalizeGiveaway(guild, giveaway, req.body.actor || null, false);
        res.json({ success: true, giveaway });
    } catch (e) {
        console.error('Error finalizando sorteo:', e);
        res.status(500).json({ error: 'Error finalizando sorteo' });
    }
});

app.post('/api/guilds/:guildId/giveaways/:giveawayId/cancel', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const guildData = getGuildGiveawayData(req.params.guildId);
    const giveaway = guildData.giveaways.find(g => g.id === req.params.giveawayId);
    if (!giveaway) return res.status(404).json({ error: 'Sorteo no encontrado' });

    giveaway.status = 'cancelled';
    giveaway.winnerStatus = 'Cancelado';
    giveaway.endedAt = new Date().toISOString();
    saveGuildGiveawayData(req.params.guildId, guildData);
    await updateGiveawayMessage(guild, giveaway);
    res.json({ success: true, giveaway });
});

// Endpoint para manejar unirse a sorteos
app.post('/api/guilds/:guildId/giveaways/:giveawayId/join', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const guildData = getGuildGiveawayData(req.params.guildId);
    const giveaway = guildData.giveaways.find(g => g.id === req.params.giveawayId);
    if (!giveaway) return res.status(404).json({ error: 'Sorteo no encontrado' });
    if (giveaway.status !== 'active') return res.status(400).json({ error: 'El sorteo no está activo' });

    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    if (!giveaway.participants.includes(userId)) {
        giveaway.participants.push(userId);
        saveGuildGiveawayData(req.params.guildId, guildData);
        await updateGiveawayMessage(guild, giveaway);
    }

    res.json({ success: true, giveaway });
});

// Endpoint para actualizaciones de permisos de sorteos
app.post('/api/guilds/:guildId/giveaways-permissions', (req, res) => {
    const guildData = getGuildGiveawayData(req.params.guildId);
    const { canReroll, canFinish, canEdit } = req.body;
    if (canReroll !== undefined) guildData.permissions.canReroll = canReroll;
    if (canFinish !== undefined) guildData.permissions.canFinish = canFinish;
    if (canEdit !== undefined) guildData.permissions.canEdit = canEdit;
    saveGuildGiveawayData(req.params.guildId, guildData);
    res.json({ success: true, permissions: guildData.permissions });
});

// Helper para construir el payload enriquecido de Discord con múltiples imágenes posicionadas
function ensureAbsoluteUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('/uploads/')) {
        let baseUrl = panelConfig.url.trim();
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'http://' + baseUrl;
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        return `${baseUrl}${url}`;
    }
    return url;
}

function stripImageTags(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\{\d+\}/g, '').replace(/  +/g, ' ').trim();
}

function buildRichPayload({ message, embedData, additionalImages }) {
    const { MessageFlags, EmbedBuilder } = require('discord.js');
    const embeds = [];
    const images = (additionalImages || []).filter(img => img && img.url && typeof img.url === 'string' && img.url.trim().length > 0);

    let content = stripImageTags(message || '');

    let mainEmbed = null;
    const titleText = embedData && embedData.title ? stripImageTags(embedData.title) : '';
    const descText = embedData && embedData.description ? stripImageTags(embedData.description) : '';
    const footerText = embedData && embedData.footer ? stripImageTags(embedData.footer) : '';
    const authorText = embedData && embedData.author ? stripImageTags(embedData.author) : '';
    const imageText = embedData && embedData.image ? ensureAbsoluteUrl(stripImageTags(embedData.image)) : '';
    const thumbText = embedData && embedData.thumbnail ? ensureAbsoluteUrl(stripImageTags(embedData.thumbnail)) : '';

    const hasEmbedData = titleText || descText || imageText || thumbText || footerText || authorText || (embedData && embedData.color);

    if (hasEmbedData || images.length > 0) {
        mainEmbed = new EmbedBuilder();
        if (titleText) mainEmbed.setTitle(titleText);
        if (descText) mainEmbed.setDescription(descText);
        if (embedData && embedData.color) mainEmbed.setColor(embedData.color);
        if (footerText) mainEmbed.setFooter({ text: footerText });
        if (authorText) mainEmbed.setAuthor({ name: authorText });
        if (imageText) mainEmbed.setImage(imageText);
        if (thumbText) mainEmbed.setThumbnail(thumbText);

        // Attach first additional image directly to mainEmbed if mainEmbed has no image/thumbnail set yet
        let firstImgUsed = false;
        if (images.length > 0) {
            const firstImg = images[0];
            const firstUrl = ensureAbsoluteUrl(firstImg.url);
            if (firstUrl && firstUrl.trim().length > 0) {
                if (firstImg.size === 'small') {
                    if (!mainEmbed.data.thumbnail) {
                        mainEmbed.setThumbnail(firstUrl);
                        firstImgUsed = true;
                    }
                } else {
                    if (!mainEmbed.data.image) {
                        mainEmbed.setImage(firstUrl);
                        firstImgUsed = true;
                    }
                }
            }
        }

        // Only push mainEmbed if it contains at least one valid Discord embed property
        if (mainEmbed.data.title || mainEmbed.data.description || mainEmbed.data.image || mainEmbed.data.thumbnail || mainEmbed.data.footer || mainEmbed.data.author) {
            embeds.push(mainEmbed);
        } else {
            mainEmbed = null;
        }

        // Any remaining additional images attached as secondary embeds
        // small/medium → setThumbnail (appears compact in Discord)
        // large/banner → setImage (appears full-width in Discord)
        const startIndex = firstImgUsed ? 1 : 0;
        for (let i = startIndex; i < images.length; i++) {
            const img = images[i];
            const imageUrl = ensureAbsoluteUrl(img.url);
            if (!imageUrl || imageUrl.trim().length === 0) continue;
            const emb = new EmbedBuilder();
            if (embedData && embedData.color) emb.setColor(embedData.color);
            if (img.size === 'small' || img.size === 'medium') {
                emb.setThumbnail(imageUrl);
            } else {
                emb.setImage(imageUrl);
            }
            embeds.push(emb);
        }
    }

    const payload = {};
    if (content && content.length > 0) payload.content = content;
    if (embeds.length > 0) payload.embeds = embeds;
    return payload;
}

app.post('/api/guilds/:guildId/send', async (req, res) => {
    const { channelId, message, embedData, additionalImages } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const payload = buildRichPayload({ message, embedData, additionalImages });
        if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }
        await channel.send(payload);
        res.json({ success: true });
    } catch (e) {
        console.error('[send]', e);
        res.status(500).json({ error: 'Error enviando mensaje: ' + e.message });
    }
});

// Enviar mensaje como el servidor (con nombre e icono del servidor) usando webhook
app.post('/api/guilds/:guildId/send-as-server', async (req, res) => {
    const { channelId, message, embedData, additionalImages } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        // Obtener o crear webhook en el canal
        const webhooks = await channel.fetchWebhooks();
        let wh = webhooks.find(w => w.name === '__PanelBot__' && w.token);
        if (!wh) {
            wh = await channel.createWebhook({
                name: '__PanelBot__',
                reason: 'Panel de administración - enviar como servidor'
            });
        }

        const serverIcon = guild.iconURL({ size: 128, extension: 'png' }) || undefined;
        const serverName = guild.name;

        const basePayload = buildRichPayload({ message, embedData, additionalImages });
        if (!basePayload.content && (!basePayload.embeds || basePayload.embeds.length === 0)) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

        const payload = {
            username: serverName,
            avatarURL: serverIcon,
            ...basePayload
        };

        await wh.send(payload);
        res.json({ success: true });
    } catch (e) {
        console.error('[send-as-server]', e);
        res.status(500).json({ error: 'Error enviando como servidor: ' + e.message });
    }
});

// Endpoint para cargar cualquier mensaje existente (normal, embed, webhook o bot)
app.get(['/api/guilds/:guildId/send-as-server/:channelId/:messageId', '/api/guilds/:guildId/message/:channelId/:messageId'], async (req, res) => {
    if (!botClient) return res.status(503).json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const msg = await channel.messages.fetch(req.params.messageId);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });

        const isWebhook = !!msg.webhookId;
        const isBot = msg.author.id === botClient.user.id;

        let messageType = 'text';
        let content = msg.content || '';
        let embedData = null;
        let additionalImages = [];

        if (msg.embeds && msg.embeds.length > 0) {
            messageType = 'embed';
            const mainEmb = msg.embeds[0];

            let colorHex = '#57f287';
            if (mainEmb.color !== null && mainEmb.color !== undefined) {
                colorHex = '#' + mainEmb.color.toString(16).padStart(6, '0');
            }

            embedData = {
                title: mainEmb.title || '',
                description: mainEmb.description || '',
                color: colorHex,
                image: mainEmb.image?.url || '',
                thumbnail: mainEmb.thumbnail?.url || '',
                footer: mainEmb.footer?.text || '',
                author: mainEmb.author?.name || '',
                extra: content
            };

            // Embeds secundarios como imágenes adicionales
            for (let i = 1; i < msg.embeds.length; i++) {
                const emb = msg.embeds[i];
                const url = emb.image?.url || emb.thumbnail?.url;
                const size = emb.thumbnail?.url ? 'small' : 'large';
                if (url) {
                    additionalImages.push({ num: additionalImages.length + 1, url, size });
                }
            }
        }

        // Adjuntos de imágenes
        if (msg.attachments && msg.attachments.size > 0) {
            msg.attachments.forEach(att => {
                if (att.contentType && att.contentType.startsWith('image/')) {
                    const alreadyInEmbed = (embedData?.image === att.url) || (embedData?.thumbnail === att.url) || additionalImages.some(img => img.url === att.url);
                    if (!alreadyInEmbed) {
                        additionalImages.push({ num: additionalImages.length + 1, url: att.url, size: 'large' });
                    }
                }
            });
        }

        res.json({
            success: true,
            type: messageType,
            content: content,
            embedData: embedData,
            additionalImages: additionalImages,
            author: {
                name: msg.author.username,
                avatar: msg.author.displayAvatarURL ? msg.author.displayAvatarURL() : null,
                isBot: msg.author.bot,
                isWebhook: isWebhook
            },
            channelId: req.params.channelId,
            messageId: req.params.messageId
        });
    } catch (e) {
        console.error('[get-message]', e);
        res.status(500).json({ error: 'No se pudo cargar el mensaje. Verifica el ID y el canal: ' + e.message });
    }
});

// Endpoint para editar un mensaje existente (enviado como servidor con webhook o como bot)
app.put(['/api/guilds/:guildId/send-as-server/:channelId/:messageId', '/api/guilds/:guildId/message/:channelId/:messageId'], async (req, res) => {
    const { message, embedData, additionalImages } = req.body;
    if (!botClient) return res.status(503).json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const msg = await channel.messages.fetch(req.params.messageId);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });

        const basePayload = buildRichPayload({ message, embedData, additionalImages });
        if (!basePayload.content && (!basePayload.embeds || basePayload.embeds.length === 0)) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

        const editPayload = {
            content: basePayload.content || '',
            embeds: basePayload.embeds || []
        };

        // Si fue enviado por un webhook
        if (msg.webhookId) {
            const webhooks = await channel.fetchWebhooks();
            let wh = webhooks.find(w => w.id === msg.webhookId && w.token);
            if (!wh) {
                // Fallback a __PanelBot__ o cualquier webhook con token en el canal
                wh = webhooks.find(w => w.name === '__PanelBot__' && w.token) || webhooks.find(w => w.token);
            }

            if (wh) {
                await wh.editMessage(req.params.messageId, editPayload);
                return res.json({ success: true });
            } else {
                return res.status(403).json({ error: 'No se encontró un webhook con permisos para editar este mensaje' });
            }
        } else if (msg.author.id === botClient.user.id) {
            // Enviado directamente por el bot
            await msg.edit(editPayload);
            return res.json({ success: true });
        } else {
            return res.status(403).json({ error: 'Solo se pueden editar mensajes enviados por el Servidor o por el Bot' });
        }
    } catch (e) {
        console.error('[edit-as-server]', e);
        res.status(500).json({ error: 'Error al editar el mensaje: ' + e.message });
    }
});

// Endpoint para "Embed" (crear embed)
app.post('/api/guilds/:guildId/embed', async (req, res) => {
    const { channelId, title, description, color, image, footer, author, thumbnail, additionalImages } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const embedData = { title, description, color, image, footer, author, thumbnail };
        const payload = buildRichPayload({ embedData, additionalImages });
        await channel.send(payload);
        res.json({ success: true });
    } catch (e) {
        console.error('[embed]', e);
        res.status(500).json({ error: 'Error enviando embed: ' + e.message });
    }
});

// Endpoint para cargar un embed existente por ID de mensaje
app.get('/api/guilds/:guildId/embed/:channelId/:messageId', async (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const msg = await channel.messages.fetch(req.params.messageId);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });

        const embed = msg.embeds[0];
        if (!embed) return res.status(400).json({ error: 'El mensaje no contiene un embed' });

        // Extraer color como hex
        let colorHex = '#5865f2';
        if (embed.color !== null && embed.color !== undefined) {
            colorHex = '#' + embed.color.toString(16).padStart(6, '0');
        }

        res.json({
            success: true,
            embed: {
                title: embed.title || '',
                description: embed.description || '',
                color: colorHex,
                image: embed.image?.url || '',
                thumbnail: embed.thumbnail?.url || '',
                footer: embed.footer?.text || '',
                author: embed.author?.name || '',
            },
            channelId: req.params.channelId,
            messageId: req.params.messageId
        });
    } catch (e) {
        console.error('Error cargando embed:', e);
        res.status(500).json({ error: 'No se pudo cargar el mensaje. Verifica el ID y el canal.' });
    }
});

// Endpoint para editar un embed existente por ID de mensaje
app.put('/api/guilds/:guildId/embed/:channelId/:messageId', async (req, res) => {
    const { title, description, color, image, footer, author, thumbnail } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const msg = await channel.messages.fetch(req.params.messageId);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle(title || null)
            .setDescription(description || null)
            .setColor(color || '#5865f2');

        if (author) embed.setAuthor({ name: author });
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (footer) embed.setFooter({ text: footer });

        // Si fue enviado por webhook
        if (msg.webhookId) {
            const webhooks = await channel.fetchWebhooks();
            let wh = webhooks.find(w => w.id === msg.webhookId && w.token);
            if (!wh) {
                wh = webhooks.find(w => w.name === '__PanelBot__' && w.token) || webhooks.find(w => w.token);
            }
            if (wh) {
                await wh.editMessage(req.params.messageId, { embeds: [embed] });
                return res.json({ success: true });
            } else {
                return res.status(403).json({ error: 'No se encontró el webhook para editar este mensaje' });
            }
        } else if (msg.author.id === botClient.user.id) {
            await msg.edit({ embeds: [embed] });
            return res.json({ success: true });
        } else {
            return res.status(403).json({ error: 'Solo se pueden editar mensajes del bot o del servidor' });
        }
    } catch (e) {
        console.error('Error editando embed:', e);
        res.status(500).json({ error: 'Error al editar el embed: ' + e.message });
    }
});



// Endpoint para "Ticket Panel"
app.post('/api/guilds/:guildId/send-ticket-panel', async (req, res) => {
    const { channelId, logChannelId, message, buttons, maxTicketsPerUser } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return res.status(404).json({ error: 'Canal de logs no encontrado' });

    try {
        const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        const discordButtons = [];
        const buttonConfigs = [];

        // Limitar a un máximo de 5 botones de ticket
        if (buttons && buttons.length > 5) {
            return res.status(400).json({ error: 'Máximo 5 botones permitidos in el panel de tickets.' });
        }

        // Agregar botón por defecto si no hay
        if (!buttons || buttons.length === 0) {
            buttons.push({ name: 'Crear Ticket', question: '' });
        }

        buttons.forEach((btn, index) => {
            const i = index + 1; // Para que coincida con el index 1-5
            const customId = btn.question && btn.question.trim() !== '' ? `create_ticket_q${i}` : `create_ticket_${i}`;
            discordButtons.push(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(btn.name || `Botón ${i}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );
            buttonConfigs.push({
                name: btn.name || `Botón ${i}`,
                question: btn.question && btn.question.trim() !== '' ? btn.question.trim() : null,
                index: i
            });
        });

        const embed = new EmbedBuilder()
            .setTitle('🎫 Centro de Soporte')
            .setDescription(message || 'Pulsa un botón para abrir un ticket con el staff.\n\n**Para usuarios aislados:** Si estás en timeout, puedes crear un ticket para comunicarte con los administradores.')
            .setColor(0x5865F2);

        const rows = [];
        for (let i = 0; i < discordButtons.length; i += 5) {
            const row = new ActionRowBuilder().addComponents(discordButtons.slice(i, i + 5));
            rows.push(row);
        }

        let config = configManager.loadGuildConfig(guild.id, 'tickets', {});
        let edited = false;
        let sentMessage = null;

        if (config.panelChannelId && config.panelMessageId && config.panelChannelId === channelId) {
            try {
                const targetChannel = guild.channels.cache.get(config.panelChannelId) || await guild.channels.fetch(config.panelChannelId).catch(() => null);
                if (targetChannel) {
                    const oldMessage = await targetChannel.messages.fetch(config.panelMessageId).catch(() => null);
                    if (oldMessage) {
                        await oldMessage.edit({ embeds: [embed], components: rows });
                        edited = true;
                        sentMessage = oldMessage;
                        console.log(`[TICKETS] Panel existente editado en el canal ${channel.name} del servidor ${guild.name}`);
                    }
                }
            } catch (editError) {
                console.error('[TICKETS] Error al editar el panel de tickets existente:', editError);
            }
        }

        if (!edited) {
            sentMessage = await channel.send({ embeds: [embed], components: rows });
            console.log(`[TICKETS] Nuevo panel de tickets enviado al canal ${channel.name} del servidor ${guild.name}`);
        }

        // Guardar configuración del panel
        config = {
            ...config,
            panelConfigs: buttonConfigs,
            panelMessage: message || null,
            ticketLogChannelId: logChannelId,
            panelChannelId: channelId,
            panelMessageId: sentMessage.id
        };
        if (maxTicketsPerUser !== undefined) {
            config.maxTicketsPerUser = maxTicketsPerUser;
        }
        configManager.saveGuildConfig(guild.id, 'tickets', config);

        logPanelActivity(guild.id, 'TICKETS', `Panel de tickets configurado con canal de logs: ${logChannel.name}`);
        res.json({ success: true });
    } catch (e) {
        console.error('Error enviando panel de tickets:', e);
        res.status(500).json({ error: 'Error enviando panel de tickets' });
    }
});

// Endpoint: Detalle completo de un miembro
app.get('/api/guilds/:guildId/members/:memberId', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const member = await guild.members.fetch(req.params.memberId);
        if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

        const roles = member.roles.cache
            .filter(r => r.id !== guild.id) // quitar @everyone
            .sort((a, b) => b.position - a.position)
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.hexColor,
                position: r.position,
                permissions: r.permissions.toArray()
            }));

        res.json({
            id: member.user.id,
            tag: member.user.tag,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.displayAvatarURL({ size: 256 }),
            nickname: member.nickname,
            joinedAt: member.joinedAt,
            createdAt: member.user.createdAt,
            bot: member.user.bot,
            roles: roles,
            permissions: member.permissions.toArray()
        });
    } catch (e) {
        res.status(500).json({ error: 'Error obteniendo miembro: ' + e.message });
    }
});

// Endpoint: Detalle de un rol
app.get('/api/guilds/:guildId/roles/:roleId', (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rol no encontrado' });

    res.json({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed,
        memberCount: guild.members.cache.filter(m => m.roles.cache.has(role.id)).size,
        permissions: role.permissions.toArray()
    });
});

// Endpoint: Obtener sugerencias
app.get('/api/guilds/:guildId/suggestions', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        // Usar configManager para cargar sugerencias desde la carpeta del servidor
        const suggestionsConfig = configManager.loadGuildConfig(guild.id, 'suggestions', {
            suggestionsChannelId: '',
            suggestions: []
        });

        res.json({
            success: true,
            suggestions: suggestionsConfig.suggestions || [],
            suggestionsChannelId: suggestionsConfig.suggestionsChannelId || ''
        });
    } catch (e) {
        console.error('Error obteniendo sugerencias:', e);
        res.status(500).json({ error: 'Error obteniendo sugerencias' });
    }
});

// Endpoint: Actualizar estado de sugerencia
app.put('/api/guilds/:guildId/suggestions/:suggestionId', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const suggestionId = parseInt(req.params.suggestionId);
        const { status, approvedBy, comments } = req.body;
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado de sugerencia no válido' });
        }

        // Usar configManager para cargar y guardar sugerencias
        const suggestionsConfig = configManager.loadGuildConfig(guild.id, 'suggestions', {
            suggestionsChannelId: '',
            suggestions: []
        });

        const suggestion = suggestionsConfig.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        // Actualizar estado
        if (status) suggestion.status = status;
        if (status === 'approved') {
            suggestion.approvedAt = new Date().toISOString();
            suggestion.approvedBy = approvedBy || 'Staff';
        }
        if (comments) {
            if (!Array.isArray(suggestion.comments)) suggestion.comments = [];
            suggestion.comments.push(comments);
        }

        // Guardar cambios
        configManager.saveGuildConfig(guild.id, 'suggestions', suggestionsConfig);

        // 📨 ENVIAR EMBED AL USUARIO SI SE RECHAZA O APRUEBA
        try {
            const user = await botClient.users.fetch(suggestion.userId);
            const { MessageFlags, EmbedBuilder } = require('discord.js');

            if (status === 'rejected') {
                // Embed de RECHAZO
                const rejectedEmbed = new EmbedBuilder()
                    .setTitle('❌ Sugerencia Rechazada')
                    .setDescription(`Tu sugerencia ha sido rechazada por el staff.`)
                    .addFields(
                        { name: '📝 Tu sugerencia:', value: suggestion.text || 'Sin contenido', inline: false },
                        { name: '⏰ Enviada:', value: new Date(suggestion.createdAt).toLocaleString('es-ES'), inline: false }
                    )
                    .setColor(0xFF0000)
                    .setFooter({ text: `Servidor: ${guild.name}` })
                    .setTimestamp();

                // Agregar comentarios si existen
                if (suggestion.comments && suggestion.comments.length > 0) {
                    const commentText = suggestion.comments
                        .map(c => `• ${c.text || c}`)
                        .join('\n');
                    rejectedEmbed.addFields({
                        name: '💬 Comentarios del Staff:',
                        value: commentText,
                        inline: false
                    });
                }

                await user.send({ embeds: [rejectedEmbed] });
                console.log(`✅ Embed de rechazo enviado a ${suggestion.userTag}`);
            } else if (status === 'approved') {
                // Embed de APROBACIÓN
                const approvedEmbed = new EmbedBuilder()
                    .setTitle('✅ Sugerencia Aprobada')
                    .setDescription(`¡Tu sugerencia ha sido aprobada! Será considerada para futuras actualizaciones del servidor.`)
                    .addFields(
                        { name: '📝 Tu sugerencia:', value: suggestion.text || 'Sin contenido', inline: false },
                        { name: '⏰ Enviada:', value: new Date(suggestion.createdAt).toLocaleString('es-ES'), inline: false }
                    )
                    .setColor(0x00FF00)
                    .setFooter({ text: `Servidor: ${guild.name}` })
                    .setTimestamp();

                // Agregar comentarios si existen
                if (suggestion.comments && suggestion.comments.length > 0) {
                    const commentText = suggestion.comments
                        .map(c => `• ${c.text || c}`)
                        .join('\n');
                    approvedEmbed.addFields({
                        name: '💬 Comentarios del Staff:',
                        value: commentText,
                        inline: false
                    });
                }

                await user.send({ embeds: [approvedEmbed] });
                console.log(`✅ Embed de aprobación enviado a ${suggestion.userTag}`);
            }
        } catch (e) {
            console.log(`⚠️ No se pudo enviar embed a ${suggestion.userTag}: ${e.message}`);
        }

        // 📨 ACTUALIZAR MENSAJE EN DISCORD
        try {
            const channelId = suggestionsConfig.suggestionsChannelId;
            if (channelId && suggestion.messageId) {
                const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
                if (channel) {
                    const message = await channel.messages.fetch(suggestion.messageId).catch(() => null);
                    if (message && message.embeds && message.embeds.length > 0) {
                        const { MessageFlags, EmbedBuilder } = require('discord.js');

                        let embedTitle = '🆕 Nueva Sugerencia';
                        let embedColor = 0x5865F2;

                        if (status === 'approved') {
                            embedTitle = '✅ Sugerencia Aprobada';
                            embedColor = 0x00FF00;
                        } else if (status === 'rejected') {
                            embedTitle = '❌ Sugerencia Rechazada';
                            embedColor = 0xFF0000;
                        }

                        const originalEmbed = message.embeds[0];
                        const updatedEmbed = EmbedBuilder.from(originalEmbed)
                            .setTitle(embedTitle)
                            .setColor(embedColor);

                        // Limpiar campos anteriores para evitar duplicados
                        updatedEmbed.setFields([]);

                        // Añadir estado actual
                        if (status === 'approved') {
                            updatedEmbed.addFields({ name: '📌 Estado', value: `Aprobada por ${approvedBy || 'Staff'}`, inline: true });
                        } else if (status === 'rejected') {
                            updatedEmbed.addFields({ name: '📌 Estado', value: 'Rechazada por el Staff', inline: true });
                        }

                        // Añadir comentarios del staff
                        if (suggestion.comments && suggestion.comments.length > 0) {
                            const commentText = suggestion.comments
                                .map(c => typeof c === 'string' ? c : (c.text || ''))
                                .filter(Boolean)
                                .map(text => `• ${text}`)
                                .join('\n');
                            if (commentText) {
                                updatedEmbed.addFields({
                                    name: '💬 Comentarios del Staff:',
                                    value: commentText,
                                    inline: false
                                });
                            }
                        }

                        await message.edit({ embeds: [updatedEmbed] });
                        console.log(`✅ Mensaje de sugerencia ${suggestion.id} editado en Discord.`);
                    }
                }
            }
        } catch (discordError) {
            console.error('Error al editar mensaje de sugerencia en Discord:', discordError);
        }

        res.json({
            success: true,
            message: 'Sugerencia actualizada',
            suggestion
        });
    } catch (e) {
        console.error('Error actualizando sugerencia:', e);
        res.status(500).json({ error: 'Error actualizando sugerencia' });
    }
});

// Endpoint: Guardar canal de sugerencias
app.post('/api/guilds/:guildId/suggestions-channel', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const { channelId } = req.body;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

        // Usar configManager para guardar el canal de sugerencias
        const suggestionsConfig = configManager.loadGuildConfig(guild.id, 'suggestions', {
            suggestionsChannelId: '',
            suggestions: []
        });

        suggestionsConfig.suggestionsChannelId = channelId;
        configManager.saveGuildConfig(guild.id, 'suggestions', suggestionsConfig);

        logPanelActivity(guild.id, 'SUGGESTIONS', `Canal de sugerencias configurado: ${channel.name}`);
        res.json({ success: true });
    } catch (e) {
        console.error('Error guardando canal de sugerencias:', e);
        res.status(500).json({ error: 'Error guardando canal de sugerencias' });
    }
});

// Endpoint: Eliminar sugerencia
app.delete('/api/guilds/:guildId/suggestions/:suggestionId', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const suggestionId = parseInt(req.params.suggestionId);
        const suggestionsConfig = configManager.loadGuildConfig(guild.id, 'suggestions', {
            suggestionsChannelId: '',
            suggestions: []
        });

        const index = suggestionsConfig.suggestions.findIndex(s => s.id === suggestionId);
        if (index === -1) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        const removedSuggestion = suggestionsConfig.suggestions.splice(index, 1)[0];
        configManager.saveGuildConfig(guild.id, 'suggestions', suggestionsConfig);

        if (removedSuggestion.messageId && suggestionsConfig.suggestionsChannelId) {
            try {
                const channel = guild.channels.cache.get(suggestionsConfig.suggestionsChannelId) || await guild.channels.fetch(suggestionsConfig.suggestionsChannelId).catch(() => null);
                if (channel && channel.isTextBased() && channel.messages) {
                    const message = await channel.messages.fetch(removedSuggestion.messageId).catch(() => null);
                    if (message) await message.delete();
                }
            } catch (e) {
                console.error('Error eliminando mensaje de sugerencia en Discord:', e);
            }
        }

        logPanelActivity(guild.id, 'SUGGESTIONS', `Sugerencia eliminada ID: ${suggestionId}`);
        res.json({ success: true });
    } catch (e) {
        console.error('Error eliminando sugerencia:', e);
        res.status(500).json({ error: 'Error eliminando sugerencia' });
    }
});

// Endpoint: Enviar comentario en sugerencia
app.post('/api/guilds/:guildId/suggestions/:suggestionId/comment', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const { comment, postInChannel } = req.body;
    const suggestionId = parseInt(req.params.suggestionId);

    if (!comment || comment.trim() === '') {
        return res.status(400).json({ error: 'Comentario vacío' });
    }

    try {
        const suggestionsConfig = configManager.loadGuildConfig(guild.id, 'suggestions', {
            suggestionsChannelId: '',
            suggestions: []
        });
        const suggestion = suggestionsConfig.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        if (!suggestion.comments) suggestion.comments = [];
        suggestion.comments.push({
            text: comment,
            timestamp: new Date().toISOString(),
            postedInChannel: postInChannel === true
        });

        configManager.saveGuildConfig(guild.id, 'suggestions', suggestionsConfig);

        let mdSent = false;
        try {
            const user = await botClient.users.fetch(suggestion.userId);
            const { MessageFlags, EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('💬 Comentario en tu Sugerencia')
                .setDescription(`**Tu sugerencia:**\n${suggestion.text}\n\n**Comentario del staff:**\n${comment}`)
                .setColor(0x5865F2)
                .setTimestamp();

            await user.send({ embeds: [embed] });
            console.log(`✅ Comentario enviado a ${suggestion.userTag} por MD`);
            mdSent = true;
        } catch (e) {
            console.log(`⚠️ No se pudo enviar MD a ${suggestion.userTag}: ${e.message}`);
        }

        if (postInChannel === true) {
            try {
                const channelId = suggestionsConfig.suggestionsChannelId;
                if (!channelId) {
                    return res.status(400).json({ error: 'Canal de sugerencias no configurado' });
                }

                const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
                if (!channel) {
                    return res.status(400).json({ error: 'Canal de sugerencias no encontrado' });
                }

                const botMember = guild.members.me || await guild.members.fetch(botClient.user.id).catch(() => null);
                if (!botMember || !botMember.permissionsIn(channel).has('SendMessages')) {
                    return res.status(403).json({ error: 'Bot sin permisos para enviar en el canal de sugerencias' });
                }

                const { MessageFlags, EmbedBuilder } = require('discord.js');
                const channelEmbed = new EmbedBuilder()
                    .setTitle('💬 Comentario del Staff')
                    .setDescription(`**En respuesta a sugerencia ID: ${suggestionId}**\n\n${comment}`)
                    .setAuthor({ name: 'Staff Bot', iconURL: botClient.user.displayAvatarURL() })
                    .setColor(0x5865F2)
                    .setFooter({ text: `Usuario: ${suggestion.userTag}` })
                    .setTimestamp();

                await channel.send({ embeds: [channelEmbed] });
                console.log(`✅ Comentario enviado al canal de sugerencias`);
            } catch (e) {
                console.error(`⚠️ Error enviando al canal de sugerencias:`, e.message);
                return res.status(500).json({ error: 'Error enviando al canal de sugerencias: ' + e.message });
            }
        }

        logPanelActivity(guild.id, 'SUGGESTIONS', `Comentario enviado en sugerencia ID: ${suggestionId}${postInChannel ? ' (+ canal)' : ' (MD)'}`);
        res.json({ success: true, mdSent: mdSent, postedInChannel: postInChannel === true });
    } catch (e) {
        console.error('Error enviando comentario:', e);
        res.status(500).json({ error: 'Error enviando comentario: ' + e.message });
    }
});

// ===== AUTO-RESPUESTAS =====

function loadAutoResponses(guildId) {
    if (guildId) {
        return { guilds: { [guildId]: configManager.loadGuildConfig(guildId, 'autoresponses', []) } };
    }
    return { guilds: {} };
}

function saveAutoResponses(guildIdOrConfig, config) {
    // Compatible con llamadas antiguas que pasaban únicamente el objeto `config`
    if (typeof guildIdOrConfig === 'object' && guildIdOrConfig !== null) {
        const cfg = guildIdOrConfig;
        const guilds = cfg.guilds || {};
        for (const gid of Object.keys(guilds)) {
            configManager.saveGuildConfig(gid, 'autoresponses', guilds[gid] || []);
        }
        return;
    }

    // Uso normal: (guildId, config)
    const guildId = guildIdOrConfig;
    if (!config || !config.guilds) {
        // nada que guardar
        return;
    }
    configManager.saveGuildConfig(guildId, 'autoresponses', config.guilds[guildId] || []);
}

// GET: Obtener todas las auto-respuestas de un servidor
app.get('/api/guilds/:guildId/auto-responses', (req, res) => {
    const config = loadAutoResponses(req.params.guildId);
    res.json(config.guilds[req.params.guildId] || []);
});

// POST: Crear nueva auto-respuesta
app.post('/api/guilds/:guildId/auto-responses', (req, res) => {
    const config = loadAutoResponses(req.params.guildId);
    if (!config.guilds[req.params.guildId]) config.guilds[req.params.guildId] = [];

    const newResponse = {
        id: Date.now().toString(),
        trigger: req.body.trigger || '',
        response: req.body.response || '',
        type: req.body.type || 'text',
        embedTitle: req.body.embedTitle || '',
        embedDesc: req.body.embedDesc || '',
        embedColor: req.body.embedColor || '#5865F2',
        embedThumbnail: req.body.embedThumbnail || '',
        embedImage: req.body.embedImage || '',
        embedFooter: req.body.embedFooter || '',
        randomResponses: req.body.randomResponses || [],
        wildcard: req.body.wildcard || false,
        reply: req.body.reply || false,
        replyPing: req.body.replyPing !== false,
        enabledRoles: req.body.enabledRoles || [],
        disabledRoles: req.body.disabledRoles || [],
        enabledChannels: req.body.enabledChannels || [],
        disabledChannels: req.body.disabledChannels || [],
        enabled: true,
        createdAt: new Date().toISOString()
    };

    config.guilds[req.params.guildId].push(newResponse);
    saveAutoResponses(req.params.guildId, config);
    logPanelActivity(req.params.guildId, 'AUTO_RESPONSE', `Auto-respuesta creada: "${newResponse.trigger}"`);
    res.json({ success: true, response: newResponse });
});

// PUT: Actualizar auto-respuesta existente
app.put('/api/guilds/:guildId/auto-responses/:responseId', (req, res) => {
    const config = loadAutoResponses(req.params.guildId);
    if (!config.guilds[req.params.guildId]) return res.status(404).json({ error: 'No hay auto-respuestas' });

    const index = config.guilds[req.params.guildId].findIndex(r => r.id === req.params.responseId);
    if (index === -1) return res.status(404).json({ error: 'Auto-respuesta no encontrada' });

    const existing = config.guilds[req.params.guildId][index];
    config.guilds[req.params.guildId][index] = { ...existing, ...req.body, id: existing.id };
    saveAutoResponses(req.params.guildId, config);
    logPanelActivity(req.params.guildId, 'AUTO_RESPONSE', `Auto-respuesta actualizada: "${existing.trigger}"`);
    res.json({ success: true });
});

// DELETE: Eliminar auto-respuesta
app.delete('/api/guilds/:guildId/auto-responses/:responseId', (req, res) => {
    const config = loadAutoResponses(req.params.guildId);
    if (!config.guilds[req.params.guildId]) return res.status(404).json({ error: 'No hay auto-respuestas' });

    const index = config.guilds[req.params.guildId].findIndex(r => r.id === req.params.responseId);
    if (index === -1) return res.status(404).json({ error: 'Auto-respuesta no encontrada' });

    const removed = config.guilds[req.params.guildId].splice(index, 1);
    saveAutoResponses(req.params.guildId, config);
    logPanelActivity(req.params.guildId, 'AUTO_RESPONSE', `Auto-respuesta eliminada: "${removed[0].trigger}"`);
    res.json({ success: true });
});

// GET: Obtener paneles de tickets existentes
app.get('/api/guilds/:guildId/ticket-panels', (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const config = configManager.loadGuildConfig(guild.id, 'tickets', {});
        const panelChannelId = config.panelChannelId;
        const panelMessageId = config.panelMessageId;

        if (!panelChannelId || !panelMessageId) {
            return res.json({ panels: [] });
        }

        const channel = guild.channels.cache.get(panelChannelId);
        const channelName = channel ? channel.name : 'Desconocido';

        res.json({
            panels: [{
                id: panelMessageId,
                channelId: panelChannelId,
                channelName: channelName,
                message: config.panelMessage || '',
                buttons: config.panelConfigs || [],
                logChannelId: config.ticketLogChannelId || '',
                maxTicketsPerUser: config.maxTicketsPerUser !== undefined ? config.maxTicketsPerUser : 1
            }]
        });
    } catch (e) {
        console.error('Error obteniendo paneles de tickets:', e);
        res.status(500).json({ error: 'Error obteniendo paneles de tickets' });
    }
});

// POST: Actualizar panel existente
app.post('/api/guilds/:guildId/update-ticket-panel/:messageId', async (req, res) => {
    const { channelId, logChannelId, message, buttons, maxTicketsPerUser } = req.body;
    const messageId = req.params.messageId;

    if (!botClient) return res.json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        const discordButtons = [];
        const buttonConfigs = [];

        if (buttons && buttons.length > 5) {
            return res.status(400).json({ error: 'Máximo 5 botones permitidos en el panel de tickets.' });
        }

        if (!buttons || buttons.length === 0) {
            buttons.push({ name: 'Crear Ticket', question: '' });
        }

        buttons.forEach((btn, index) => {
            const i = index + 1;
            const customId = btn.question && btn.question.trim() !== '' ? `create_ticket_q${i}` : `create_ticket_${i}`;
            discordButtons.push(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(btn.name || `Botón ${i}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );
            buttonConfigs.push({
                name: btn.name || `Botón ${i}`,
                question: btn.question && btn.question.trim() !== '' ? btn.question.trim() : null,
                index: i
            });
        });

        const embed = new EmbedBuilder()
            .setTitle('🎫 Centro de Soporte')
            .setDescription(message || 'Pulsa un botón para abrir un ticket con el staff.')
            .setColor(0x5865F2);

        const rows = [];
        for (let i = 0; i < discordButtons.length; i += 5) {
            const row = new ActionRowBuilder().addComponents(discordButtons.slice(i, i + 5));
            rows.push(row);
        }

        // Actualizar el mensaje existente
        const targetMessage = await channel.messages.fetch(messageId).catch(() => null);
        if (!targetMessage) return res.status(404).json({ error: 'Mensaje del panel no encontrado' });

        await targetMessage.edit({ embeds: [embed], components: rows });

        // Actualizar configuración
        let config = configManager.loadGuildConfig(guild.id, 'tickets', {});
        config = {
            ...config,
            panelConfigs: buttonConfigs,
            panelMessage: message || null,
            ticketLogChannelId: logChannelId,
            panelChannelId: channelId,
            panelMessageId: messageId
        };
        if (maxTicketsPerUser !== undefined) {
            config.maxTicketsPerUser = maxTicketsPerUser;
        }
        configManager.saveGuildConfig(guild.id, 'tickets', config);

        logPanelActivity(guild.id, 'TICKETS', 'Panel de tickets actualizado');
        res.json({ success: true });
    } catch (e) {
        console.error('Error actualizando panel de tickets:', e);
        res.status(500).json({ error: 'Error actualizando panel de tickets' });
    }
});

// GET: Obtener configuración del panel de tickets (para cargarla en el formulario)
app.get('/api/guilds/:guildId/ticket-config', (req, res) => {
    const guildConfig = configManager.loadGuildConfig(req.params.guildId, 'tickets', {});

    // También cargar el staffRoleId desde staffroles.json usando configManager
    const guildStaff = configManager.loadGuildConfig(req.params.guildId, 'staffroles', {});

    const ticketStaffRoles = guildConfig.ticketStaffRoles || [];
    const staffRoleId = guildStaff.ticketStaffRole || (ticketStaffRoles.length > 0 ? ticketStaffRoles[0] : '');

    res.json({
        panelMessage: guildConfig.panelMessage || '',
        panelConfigs: guildConfig.panelConfigs || [],
        ticketLogChannelId: guildConfig.ticketLogChannelId || '',
        ticketStaffRoles: ticketStaffRoles,
        staffRoleId: staffRoleId,
        panelChannelId: guildConfig.panelChannelId || '',
        maxTicketsPerUser: guildConfig.maxTicketsPerUser !== undefined ? guildConfig.maxTicketsPerUser : 1
    });
});

// PUT: Actualizar configuración del panel de tickets (sin enviar, solo guardar)
app.put('/api/guilds/:guildId/ticket-config', (req, res) => {
    const guildConfig = configManager.loadGuildConfig(req.params.guildId, 'tickets', {});

    // Actualizar solo los campos enviados
    if (req.body.panelMessage !== undefined) guildConfig.panelMessage = req.body.panelMessage;
    if (req.body.panelConfigs !== undefined) guildConfig.panelConfigs = req.body.panelConfigs;
    if (req.body.ticketLogChannelId !== undefined) guildConfig.ticketLogChannelId = req.body.ticketLogChannelId;
    if (req.body.ticketStaffRoles !== undefined) guildConfig.ticketStaffRoles = req.body.ticketStaffRoles;
    if (req.body.panelChannelId !== undefined) guildConfig.panelChannelId = req.body.panelChannelId;
    if (req.body.maxTicketsPerUser !== undefined) guildConfig.maxTicketsPerUser = req.body.maxTicketsPerUser;

    configManager.saveGuildConfig(req.params.guildId, 'tickets', guildConfig);

    // Si se envían roles de staff, también actualizar en staffroles.json y en el bot
    if (req.body.ticketStaffRoles !== undefined) {
        const guildStaff = configManager.loadGuildConfig(req.params.guildId, 'staffroles', {});

        if (req.body.ticketStaffRoles.length > 0) {
            guildStaff.ticketStaffRole = req.body.ticketStaffRoles[0];
            if (botClient && botClient.ticketStaffRole) {
                botClient.ticketStaffRole.set(req.params.guildId, req.body.ticketStaffRoles[0]);
            }
        } else {
            delete guildStaff.ticketStaffRole;
            if (botClient && botClient.ticketStaffRole) {
                botClient.ticketStaffRole.delete(req.params.guildId);
            }
        }

        configManager.saveGuildConfig(req.params.guildId, 'staffroles', guildStaff);
    }

    logPanelActivity(req.params.guildId, 'TICKETS', 'Configuración de tickets actualizada desde el panel');
    res.json({ success: true });
});

// GET: Obtener roles del servidor
app.get('/api/guilds/:guildId/roles', (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const botMember = guild.members.me;
    const botHighestRole = botMember ? botMember.roles.highest.position : 0;

    const roles = guild.roles.cache
        .filter(r => r.id !== guild.id) // quitar @everyone
        .filter(r => r.position < botHighestRole) // Solo roles que el bot puede dar
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    res.json(roles);
});

app.get(['/', '/embed', '/enbet', '/say-server', '/say'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

let panelStarted = false;

function startAdminPanel(client) {
    if (panelStarted) {
        console.warn('⚠️ [CodeCord] El panel ya estaba iniciado; se ignora la doble inicialización para evitar mensajes duplicados.');
        return;
    }
    panelStarted = true;

    setBotClient(client);
    updateBotStats();

    // Ejecutar procesamiento de sorteos inmediatamente al iniciar
    console.log('🎯 Iniciando verificación de sorteos programados...');
    processScheduledGiveaways(true).catch(err => console.error('Error en verificación inicial de sorteos:', err));


    const http = require('http');
    const server = http.createServer(app);

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ [CodeCord] El puerto ${PORT} ya está en uso (¿otra instancia del bot en ejecución?). El bot seguirá funcionando en Discord.`);
        } else {
            console.error('❌ [CodeCord] Error del servidor web:', err);
        }
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n---------------------------------------------------`);
        console.log(`✅ Panel de CodeCord-Style iniciado con éxito`);
        console.log(`🌐 URL Local: http://localhost:${PORT}`);
        console.log(`🌐 URL Hosting: ${panelConfig.url}`);
        console.log(`---------------------------------------------------\n`);
    });
}


app.get('/api/guilds/:guildId/emojis', async (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const fetchedEmojis = await guild.emojis.fetch().catch(() => guild.emojis.cache);
        const emojis = fetchedEmojis.map(e => ({
            id: e.id,
            name: e.name,
            animated: Boolean(e.animated),
            url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`
        }));
        res.json(emojis);
    } catch (err) {
        console.error("Error fetching emojis:", err);
        const emojis = guild.emojis.cache.map(e => ({
            id: e.id,
            name: e.name,
            animated: Boolean(e.animated),
            url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`
        }));
        res.json(emojis);
    }
});

// GET: Obtener paneles de Auto-Rol configurados
app.get('/api/guilds/:guildId/autorol', (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const autoroles = configManager.loadGuildConfig(req.params.guildId, 'autoroles', []);
    res.json(autoroles);
});

// POST: Crear nuevo panel de Auto-Rol por reacciones
app.post('/api/guilds/:guildId/autorol', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const { channelId, embed, reactions } = req.body;
    if (!channelId || !reactions || reactions.length === 0) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (canal o reacciones)' });
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Canal no válido o no encontrado' });
    }

    try {
        const { EmbedBuilder } = require('discord.js');
        const embedMsg = new EmbedBuilder()
            .setColor(embed.color || '#5865f2');

        if (embed.title) embedMsg.setTitle(embed.title);
        if (embed.description) embedMsg.setDescription(embed.description);

        const sentMessage = await channel.send({ embeds: [embedMsg] });

        // Agregar reacciones
        for (const r of reactions) {
            try {
                // Si es un ID de emoji del servidor, usar el objeto emoji o el ID
                const customEmoji = guild.emojis.cache.get(r.emoji);
                const emojiToReact = customEmoji ? customEmoji : r.emoji;
                await sentMessage.react(emojiToReact);
            } catch (e) {
                console.error(`No se pudo reaccionar con el emoji ${r.emoji}:`, e.message);
            }
        }

        // Guardar configuración
        const autoroles = configManager.loadGuildConfig(guild.id, 'autoroles', []);
        autoroles.push({
            messageId: sentMessage.id,
            channelId: sentMessage.channel.id,
            channelName: channel.name,
            title: embed.title || 'Auto-Rol',
            description: embed.description || '',
            color: embed.color || '#5865f2',
            reactions: reactions, // [{emoji, roleId}]
            createdAt: new Date().toISOString()
        });
        configManager.saveGuildConfig(guild.id, 'autoroles', autoroles);

        res.json({ success: true, messageId: sentMessage.id });
    } catch (e) {
        console.error("Error al crear autorol:", e);
        res.status(500).json({ error: e.message || 'Error interno al enviar el mensaje o reaccionar' });
    }
});

// DELETE: Eliminar un panel de Auto-Rol
app.delete('/api/guilds/:guildId/autorol/:messageId', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const { guildId, messageId } = req.params;

    try {
        let autoroles = configManager.loadGuildConfig(guildId, 'autoroles', []);
        const target = autoroles.find(a => a.messageId === messageId);

        if (target) {
            // Intentar borrar el mensaje de Discord
            try {
                const guild = botClient.guilds.cache.get(guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(target.channelId);
                    if (channel && channel.isTextBased()) {
                        const msg = await channel.messages.fetch(messageId).catch(() => null);
                        if (msg) await msg.delete().catch(() => null);
                    }
                }
            } catch (err) {
                console.warn('No se pudo borrar el mensaje de Discord del autorol:', err.message);
            }
        }

        autoroles = autoroles.filter(a => a.messageId !== messageId);
        configManager.saveGuildConfig(guildId, 'autoroles', autoroles);

        res.json({ success: true });
    } catch (e) {
        console.error('Error eliminando autorol:', e);
        res.status(500).json({ error: 'Error al eliminar configuración de Auto-Rol' });
    }
});


// =====================================================================
// 🛡️ APIS Y RUTAS DEL SISTEMA DE VERIFICACIÓN
// =====================================================================

// GET: Obtener config de verificación
app.get('/api/guilds/:guildId/verification', (req, res) => {
    const config = configManager.loadGuildConfig(req.params.guildId, 'verification', {
        reaction: { enabled: false, channelId: '', emoji: '✅', roleId: '', title: 'Verificación por Reacción', description: 'Reacciona a este mensaje con ✅ para verificarte.', color: '#5865f2' },
        oauth: { enabled: false, channelId: '', roleId: '', title: 'Verificación por OAuth2', description: 'Haz clic en el botón de abajo para verificar tu cuenta y acceder al servidor.', buttonText: 'Verificarse', color: '#5865f2' },
        settings: { unverifiedRoleId: '' }
    });
    if (!config.settings) config.settings = { unverifiedRoleId: '' };
    res.json(config);
});

// POST: Guardar config de verificación
app.post('/api/guilds/:guildId/verification', (req, res) => {
    const guildId = req.params.guildId;
    const body = req.body;

    const reaction = body.reaction || {};
    const oauth = body.oauth || {};

    // Conservar messageId previos (no los manda el frontend)
    const oldConfig = configManager.loadGuildConfig(guildId, 'verification', {});
    if (oldConfig.reaction?.messageId && !reaction.messageId) reaction.messageId = oldConfig.reaction.messageId;
    if (oldConfig.oauth?.messageId && !oauth.messageId) oauth.messageId = oldConfig.oauth.messageId;

    // Conservar settings existentes (no los manda este endpoint)
    const existingSettings = oldConfig.settings || { unverifiedRoleId: '' };

    const config = { reaction, oauth, settings: existingSettings };

    console.log(`🛡️  [Verificación] Config guardada · ${guildId} · reacción: ${reaction.channelId ? '✅' : '—'} · OAuth: ${oauth.channelId ? '✅' : '—'}`);

    configManager.saveGuildConfig(guildId, 'verification', config);
    logPanelActivity(guildId, 'VERIFICATION_CONFIG', 'Configuración de verificación guardada');
    res.json({ success: true });
});

// POST: Guardar ajustes de verificación (rol sin verificar)
app.post('/api/guilds/:guildId/verification/settings', (req, res) => {
    const guildId = req.params.guildId;
    const { unverifiedRoleId, removeRoleId } = req.body;

    const oldConfig = configManager.loadGuildConfig(guildId, 'verification', {});
    oldConfig.settings = {
        unverifiedRoleId: unverifiedRoleId || '',
        removeRoleId: removeRoleId || ''
    };

    configManager.saveGuildConfig(guildId, 'verification', oldConfig);
    logPanelActivity(guildId, 'VERIFICATION_SETTINGS', `Roles ajustados: sin verificar (${unverifiedRoleId || 'ninguno'}), retirar al verificar (${removeRoleId || 'ninguno'})`);
    console.log(`⚙️  [Verificación Ajustes] Sin verificar: ${unverifiedRoleId || 'desactivado'} | Retirar al verificar: ${removeRoleId || 'desactivado'} · Guild: ${guildId}`);
    res.json({ success: true });
});

// POST: Enviar mensaje de verificación por reacción
app.post('/api/guilds/:guildId/verification/send-reaction', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const config = configManager.loadGuildConfig(guild.id, 'verification', {});
    const rConfig = config.reaction;

    if (!rConfig || !rConfig.channelId || !rConfig.roleId) {
        const missing = [];
        if (!rConfig) missing.push('config completa');
        else {
            if (!rConfig.channelId) missing.push('canal');
            if (!rConfig.roleId) missing.push('rol');
        }
        return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}. Guarda la configuración primero.` });
    }

    const channel = guild.channels.cache.get(rConfig.channelId);
    if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Canal no encontrado o no es de texto.' });
    }

    try {
        const { MessageFlags, EmbedBuilder } = require('discord.js');
        const images = (rConfig.additionalImages || []).filter(img => img && img.url && typeof img.url === 'string' && img.url.trim().length > 0);
        const title = stripImageTags(rConfig.title || 'Verificación por Reacción');
        const desc = stripImageTags(rConfig.description || 'Reacciona al emoji para verificar.');

        const embed = new EmbedBuilder()
            .setColor(rConfig.color || '#5865f2');
        if (title) embed.setTitle(title);
        if (desc) embed.setDescription(desc);

        let firstImgUsed = false;
        if (images.length > 0) {
            const firstImg = images[0];
            const firstUrl = ensureAbsoluteUrl(firstImg.url);
            if (firstUrl && firstUrl.trim().length > 0) {
                if (firstImg.size === 'small') {
                    embed.setThumbnail(firstUrl);
                } else {
                    embed.setImage(firstUrl);
                }
                firstImgUsed = true;
            }
        }

        const embeds = [embed];
        const startIndex = firstImgUsed ? 1 : 0;
        for (let i = startIndex; i < images.length; i++) {
            const img = images[i];
            const imageUrl = ensureAbsoluteUrl(img.url);
            const emb = new EmbedBuilder();
            if (rConfig.color) emb.setColor(rConfig.color);
            if (img.size === 'small') {
                emb.setThumbnail(imageUrl);
            } else {
                emb.setImage(imageUrl);
            }
            embeds.push(emb);
        }

        const sentMsg = await channel.send({ embeds });

        try {
            await sentMsg.react(rConfig.emoji || '✅');
        } catch (e) {
            console.error('Error al reaccionar en el canal de Discord:', e);
        }

        rConfig.messageId = sentMsg.id;
        rConfig.enabled = true;
        configManager.saveGuildConfig(guild.id, 'verification', config);

        logPanelActivity(guild.id, 'VERIFICATION_SEND', 'Mensaje de verificación por reacción enviado');
        console.log(`✅ [Verificación] Mensaje de reacción enviado · #${channel.name} (${guild.name}) · emoji: ${rConfig.emoji || '✅'}`);
        res.json({ success: true, messageId: sentMsg.id });
    } catch (err) {
        console.error('Error al enviar reacción de verificación:', err);
        res.status(500).json({ error: 'Error al enviar el mensaje a Discord: ' + err.message });
    }
});

// POST: Enviar panel de verificación OAuth2
app.post('/api/guilds/:guildId/verification/send-oauth', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const config = configManager.loadGuildConfig(guild.id, 'verification', {});
    const oConfig = config.oauth;

    if (!oConfig || !oConfig.channelId || !oConfig.roleId) {
        const missing = [];
        if (!oConfig) missing.push('config completa');
        else {
            if (!oConfig.channelId) missing.push('canal');
            if (!oConfig.roleId) missing.push('rol');
        }
        return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}. Guarda la configuración primero.` });
    }

    const channel = guild.channels.cache.get(oConfig.channelId);
    if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Canal no encontrado o no es de texto.' });
    }

    try {
        const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const verifyCallbackUri = getRedirectUri('verify-callback');
        const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(verifyCallbackUri)}&response_type=code&scope=identify%20guilds.join&state=${guild.id}`;

        const images = (oConfig.additionalImages || []).filter(img => img && img.url && typeof img.url === 'string' && img.url.trim().length > 0);
        const title = stripImageTags(oConfig.title || 'Verificación Requerida');
        const desc = stripImageTags(oConfig.description || 'Haz clic abajo para verificar tu cuenta y acceder al servidor.');

        const embed = new EmbedBuilder()
            .setColor(oConfig.color || '#5865f2');
        if (title) embed.setTitle(title);
        if (desc) embed.setDescription(desc);

        let firstImgUsed = false;
        if (images.length > 0) {
            const firstImg = images[0];
            const firstUrl = ensureAbsoluteUrl(firstImg.url);
            if (firstUrl && firstUrl.trim().length > 0) {
                if (firstImg.size === 'small') {
                    embed.setThumbnail(firstUrl);
                } else {
                    embed.setImage(firstUrl);
                }
                firstImgUsed = true;
            }
        }

        const embeds = [embed];
        const startIndex = firstImgUsed ? 1 : 0;
        for (let i = startIndex; i < images.length; i++) {
            const img = images[i];
            const imageUrl = ensureAbsoluteUrl(img.url);
            const emb = new EmbedBuilder();
            if (oConfig.color) emb.setColor(oConfig.color);
            if (img.size === 'small') {
                emb.setThumbnail(imageUrl);
            } else {
                emb.setImage(imageUrl);
            }
            embeds.push(emb);
        }

        const button = new ButtonBuilder()
            .setLabel(oConfig.buttonText || 'Verificarse')
            .setStyle(ButtonStyle.Link)
            .setURL(oauthUrl)
            .setEmoji('🛡️');

        const row = new ActionRowBuilder().addComponents(button);

        const sentMsg = await channel.send({ embeds, components: [row] });

        oConfig.messageId = sentMsg.id;
        oConfig.enabled = true;
        configManager.saveGuildConfig(guild.id, 'verification', config);

        logPanelActivity(guild.id, 'VERIFICATION_SEND', 'Panel de verificación OAuth2 enviado');
        console.log(`✅ [Verificación] Panel OAuth2 enviado · #${channel.name} (${guild.name}) · rol: ${oConfig.roleId}`);
        res.json({ success: true, messageId: sentMsg.id });
    } catch (err) {
        console.error('Error al enviar panel OAuth2:', err);
        res.status(500).json({ error: 'Error al enviar el mensaje a Discord: ' + err.message });
    }
});

// GET: Obtener lista de usuarios verificados
app.get('/api/guilds/:guildId/verification/users', (req, res) => {
    const verifiedUsers = configManager.loadGuildConfig(req.params.guildId, 'verified-users', []);
    res.json(verifiedUsers);
});

// POST: Re-unir / restaurar usuario al servidor
app.post('/api/guilds/:guildId/verification/users/:userId/rejoin', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const userId = req.params.userId;
    const verifiedUsers = configManager.loadGuildConfig(guild.id, 'verified-users', []);
    const user = verifiedUsers.find(u => u.userId === userId);

    if (!user || !user.accessToken) {
        return res.status(404).json({ error: 'Usuario no registrado o sin token guardado.' });
    }

    try {
        const config = configManager.loadGuildConfig(guild.id, 'verification', {});
        const roleId = config.oauth?.roleId;

        const options = {
            accessToken: user.accessToken
        };
        if (roleId) {
            options.roles = [roleId];
        }

        await guild.members.add(userId, options);
        logPanelActivity(guild.id, 'VERIFICATION_REJOIN', `Usuario ${user.username} restaurado/añadido al servidor`);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error al re-unir usuario ${userId}:`, err);
        res.status(500).json({ error: 'Error al unir usuario al servidor: ' + err.message });
    }
});

// DELETE: Eliminar usuario de la base de datos de verificados
app.delete('/api/guilds/:guildId/verification/users/:userId', (req, res) => {
    const guildId = req.params.guildId;
    const userId = req.params.userId;
    let verifiedUsers = configManager.loadGuildConfig(guildId, 'verified-users', []);
    const initialLength = verifiedUsers.length;
    verifiedUsers = verifiedUsers.filter(u => u.userId !== userId);

    if (verifiedUsers.length === initialLength) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    configManager.saveGuildConfig(guildId, 'verified-users', verifiedUsers);
    logPanelActivity(guildId, 'VERIFICATION_REMOVE', `Usuario con ID ${userId} eliminado de la base de datos de verificados`);
    res.json({ success: true });
});

// GET: Callback de verificación OAuth2
app.get('/verify-callback', async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const { code, state: guildId } = req.query;
    if (!code || !guildId) {
        return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><title>Error de Verificación</title></head>
            <body style="background:#0f0f13;color:#ff5555;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                <div style="text-align:center;">
                    <div style="font-size:3rem;margin-bottom:10px;">⚠️</div>
                    <h2>Faltan parámetros de verificación</h2>
                    <p style="color:#aaa;">La solicitud no incluye el código de autorización o el servidor.</p>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const verifyCallbackUri = getRedirectUri('verify-callback');
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: verifyCallbackUri,
            scope: 'identify guilds.join'
        });

        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            console.error('Error al intercambiar token:', tokenData);
            throw new Error(tokenData.error_description || tokenData.error);
        }

        // Obtener información del usuario verificado
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userRes.json();

        if (!userData.id) {
            throw new Error('No se pudo recuperar la información de usuario de Discord.');
        }

        if (!botClient) {
            throw new Error('El bot no está en ejecución actualmente.');
        }

        const guild = botClient.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error('No se encontró el servidor o el bot no está en él.');
        }

        const verificationConfig = configManager.loadGuildConfig(guildId, 'verification', {});
        const roleId = verificationConfig.oauth?.roleId || verificationConfig.roleId;

        // Roles a retirar tras verificar (tanto el unverifiedRoleId como el removeRoleId)
        const unverifiedRoleId = verificationConfig.settings?.unverifiedRoleId || verificationConfig.unverifiedRoleId;
        const removeRoleId = verificationConfig.settings?.removeRoleId || verificationConfig.removeRoleId;
        const rolesToRemove = [removeRoleId, unverifiedRoleId].filter(id => id && typeof id === 'string' && id.trim().length > 0);

        console.log(`[Verify OAuth] Procesando ${userData.username} (${userData.id}) en Guild: ${guild.name} (${guildId})`);
        console.log(`[Verify OAuth] Config -> Rol a dar: ${roleId || 'NINGUNO'} | Roles a quitar: ${rolesToRemove.join(', ') || 'NINGUNO'}`);

        let member = null;
        try {
            member = await guild.members.fetch(userData.id);
        } catch (err) {
            // El usuario no está en el servidor aún
        }

        let alreadyVerified = false;
        let roleNameAssigned = '';

        if (roleId) {
            const roleObj = guild.roles.cache.get(roleId);
            if (roleObj) roleNameAssigned = roleObj.name;
        }

        if (member) {
            if (roleId) {
                if (member.roles.cache.has(roleId)) {
                    alreadyVerified = true;
                } else {
                    try {
                        await member.roles.add(roleId);
                    } catch (err) {
                        console.error('[Verify OAuth] Error al añadir rol:', err);
                        if (err.code === 50013) {
                            throw new Error(`El bot no tiene permisos suficientes para asignar el rol verificado${roleNameAssigned ? ' (' + roleNameAssigned + ')' : ''}. Asegúrate de que el rol del bot esté MÁS ARRIBA en los ajustes del servidor y tenga el permiso 'Gestionar Roles'.`);
                        }
                        throw err;
                    }
                }
            }

            // Retirar roles (sin verificar / quitar)
            for (const rId of rolesToRemove) {
                if (member.roles.cache.has(rId)) {
                    try {
                        await member.roles.remove(rId);
                        console.log(`[Verificación OAuth2] Se retiró el rol ${rId} a ${member.user.tag}`);
                    } catch (err) {
                        console.error(`[Verify OAuth] Error al retirar rol ${rId}:`, err);
                    }
                }
            }
        } else {
            // Usuario no está en la guild: añadirlo vía OAuth scope guilds.join
            const options = { accessToken: tokenData.access_token };
            if (roleId) options.roles = [roleId];
            try {
                await guild.members.add(userData.id, options);
            } catch (err) {
                console.error('[Verify OAuth] Error uniendo usuario a la guild:', err);
                if (err.code === 50013) {
                    throw new Error("El bot no tiene permisos suficientes para añadir miembros a este servidor.");
                }
                throw err;
            }
        }

        // Guardar la información en verified-users.json
        const verifiedUsers = configManager.loadGuildConfig(guildId, 'verified-users', []);
        const existingIdx = verifiedUsers.findIndex(u => u.userId === userData.id);
        const userInfo = {
            userId: userData.id,
            username: userData.global_name || userData.username,
            avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png',
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            verifiedAt: new Date().toISOString()
        };

        if (existingIdx !== -1) {
            verifiedUsers[existingIdx] = userInfo;
        } else {
            verifiedUsers.push(userInfo);
        }
        configManager.saveGuildConfig(guildId, 'verified-users', verifiedUsers);
        logPanelActivity(guildId, 'VERIFICATION', `Usuario ${userData.username} verificado mediante OAuth2`);

        const botName = botClient.user.username;
        const userAvatar = userInfo.avatar;
        const guildIcon = guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verificación Completada - ${guild.name}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                    }
                    body {
                        background-color: #0a0d14;
                        background-image: 
                            radial-gradient(circle at 15% 20%, rgba(88, 101, 242, 0.12) 0%, transparent 45%),
                            radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 45%),
                            radial-gradient(circle at 50% 50%, rgba(0, 210, 255, 0.04) 0%, transparent 60%);
                        background-attachment: fixed;
                        color: #ffffff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        padding: 24px;
                    }
                    .verify-card {
                        background: rgba(18, 24, 38, 0.85);
                        backdrop-filter: blur(16px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 28px;
                        padding: 44px 36px;
                        text-align: center;
                        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(88, 101, 242, 0.15);
                        width: 100%;
                        max-width: 480px;
                        position: relative;
                        overflow: hidden;
                        animation: cardEnter 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .verify-card::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background: linear-gradient(90deg, #5865F2, #10B981, #00D2FF);
                    }
                    .avatar-group {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 16px;
                        margin-bottom: 28px;
                        position: relative;
                    }
                    .avatar-wrap {
                        position: relative;
                    }
                    .avatar {
                        width: 76px;
                        height: 76px;
                        border-radius: 50%;
                        border: 3px solid #5865F2;
                        box-shadow: 0 0 25px rgba(88, 101, 242, 0.45);
                        object-fit: cover;
                        background: #111726;
                    }
                    .guild-avatar {
                        width: 76px;
                        height: 76px;
                        border-radius: 50%;
                        border: 3px solid #10B981;
                        box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
                        object-fit: cover;
                        background: #111726;
                    }
                    .verify-check-badge {
                        width: 44px;
                        height: 44px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        color: #0a0d14;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.4rem;
                        font-weight: 900;
                        box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
                        z-index: 2;
                        animation: pulseBadge 2.5s infinite;
                    }
                    @keyframes pulseBadge {
                        0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
                        50% { transform: scale(1.08); box-shadow: 0 0 30px rgba(16, 185, 129, 0.8); }
                    }
                    .status-chip {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(16, 185, 129, 0.12);
                        color: #10B981;
                        padding: 6px 18px;
                        border-radius: 9999px;
                        font-size: 0.82rem;
                        font-weight: 700;
                        letter-spacing: 0.3px;
                        margin-bottom: 18px;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
                    }
                    .status-chip .dot {
                        width: 7px;
                        height: 7px;
                        border-radius: 50%;
                        background: #10B981;
                        box-shadow: 0 0 8px #10B981;
                    }
                    h2 {
                        font-size: 1.7rem;
                        font-weight: 800;
                        letter-spacing: -0.5px;
                        margin-bottom: 10px;
                        background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .user-msg {
                        color: #9ca3af;
                        font-size: 0.95rem;
                        line-height: 1.6;
                        margin-bottom: 26px;
                    }
                    .user-msg strong {
                        color: #ffffff;
                    }
                    .role-card {
                        background: rgba(88, 101, 242, 0.08);
                        border: 1px solid rgba(88, 101, 242, 0.25);
                        border-radius: 14px;
                        padding: 12px 18px;
                        margin-bottom: 26px;
                        font-size: 0.9rem;
                        color: #d1d5db;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    }
                    .role-badge {
                        background: rgba(88, 101, 242, 0.25);
                        color: #7983f5;
                        font-weight: 700;
                        padding: 3px 10px;
                        border-radius: 6px;
                        border: 1px solid rgba(88, 101, 242, 0.4);
                        font-size: 0.85rem;
                    }
                    .return-btn {
                        background: linear-gradient(135deg, #5865F2 0%, #7950F2 100%);
                        color: #ffffff;
                        padding: 14px 28px;
                        border: none;
                        border-radius: 14px;
                        font-weight: 700;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                        width: 100%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        box-shadow: 0 10px 25px rgba(88, 101, 242, 0.35);
                    }
                    .return-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 14px 32px rgba(88, 101, 242, 0.5), 0 0 20px rgba(88, 101, 242, 0.4);
                    }
                    .return-btn:active {
                        transform: translateY(1px);
                    }
                    @keyframes cardEnter {
                        from { opacity: 0; transform: translateY(24px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                </style>
            </head>
            <body>
                <div class="verify-card">
                    <div class="avatar-group">
                        <div class="avatar-wrap">
                            <img src="${userAvatar}" class="avatar" alt="${userData.username}" title="${userData.username}">
                        </div>
                        <div class="verify-check-badge">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="avatar-wrap">
                            <img src="${guildIcon}" class="guild-avatar" alt="${guild.name}" title="${guild.name}">
                        </div>
                    </div>
                    
                    <div class="status-chip">
                        <span class="dot"></span>
                        <span>${alreadyVerified ? 'Cuenta Ya Verificada' : 'Verificación Exitosa'}</span>
                    </div>

                    <h2>${alreadyVerified ? '¡Ya tenías acceso!' : '¡Acceso Concedido!'}</h2>
                    
                    <p class="user-msg">Hola, <strong>${userData.global_name || userData.username}</strong>.<br>
                    ${alreadyVerified ? 'Tu cuenta ya estaba verificada en' : 'Has completado la verificación de seguridad en'} <strong>${guild.name}</strong>.</p>
                    
                    ${roleNameAssigned ? `
                    <div class="role-card">
                        <i class="fas fa-shield-alt" style="color: #5865f2;"></i>
                        <span>Rol asignado:</span>
                        <span class="role-badge">@${roleNameAssigned}</span>
                    </div>` : ''}
                    
                    <button class="return-btn" onclick="window.close()">
                        <i class="fab fa-discord"></i> Volver a Discord
                    </button>
                </div>
            </body>
            </html>
        `);
    } catch (e) {
        console.error('Error en /verify-callback:', e);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error de Verificación - CodeCord</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
                    body {
                        background-color: #0a0d14;
                        background-image: 
                            radial-gradient(circle at 20% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(88, 101, 242, 0.06) 0%, transparent 50%);
                        color: #ffffff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        padding: 24px;
                    }
                    .card {
                        background: rgba(18, 24, 38, 0.85);
                        backdrop-filter: blur(16px);
                        border: 1px solid rgba(239, 68, 68, 0.25);
                        border-radius: 28px;
                        padding: 44px 34px;
                        text-align: center;
                        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(239, 68, 68, 0.18);
                        width: 100%;
                        max-width: 460px;
                        animation: fadeInUp 0.4s ease-out;
                    }
                    .icon-wrap {
                        width: 76px;
                        height: 76px;
                        border-radius: 50%;
                        background: rgba(239, 68, 68, 0.12);
                        border: 2px solid rgba(239, 68, 68, 0.35);
                        color: #ef4444;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 2.2rem;
                        margin: 0 auto 24px;
                        box-shadow: 0 0 25px rgba(239, 68, 68, 0.3);
                    }
                    h2 { font-size: 1.5rem; font-weight: 800; color: #ffffff; margin-bottom: 10px; }
                    p { color: #9ca3af; font-size: 0.92rem; line-height: 1.6; margin-bottom: 26px; }
                    .error-box {
                        background: rgba(239, 68, 68, 0.08);
                        border: 1px solid rgba(239, 68, 68, 0.2);
                        border-radius: 12px;
                        padding: 12px 16px;
                        color: #fca5a5;
                        font-size: 0.85rem;
                        margin-bottom: 26px;
                        text-align: left;
                    }
                    .btn {
                        background: rgba(255, 255, 255, 0.08);
                        color: #ffffff;
                        border: 1px solid rgba(255, 255, 255, 0.14);
                        padding: 13px 24px;
                        border-radius: 14px;
                        font-weight: 700;
                        font-size: 0.95rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        width: 100%;
                    }
                    .btn:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-2px); }
                    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon-wrap"><i class="fas fa-shield-virus"></i></div>
                    <h2>No se pudo completar la verificación</h2>
                    <p>Ocurrió un inconveniente durante el proceso de verificación con Discord:</p>
                    <div class="error-box">${e.message}</div>
                    <button class="btn" onclick="window.close()">Cerrar Ventana</button>
                </div>
            </body>
            </html>
        `);
    }
});


module.exports = { startAdminPanel, handleGiveawayInteraction };