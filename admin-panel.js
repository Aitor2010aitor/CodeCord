// admin-panel.js
// Panel de administración web para el bot de Discord

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

// =====================================================================
// ⚙️ CARGAR CONFIGURACIÓN DESDE PANEL-CONFIG.JSON
// =====================================================================
let panelConfig = {
    url: '',
    port: 22300,
    requireDiscordAuth: false
};

try {
    const configPath = path.join(__dirname, 'panel-config.json');
    if (fs.existsSync(configPath)) {
        const pConf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (pConf.url) panelConfig.url = pConf.url;
        if (pConf.port) panelConfig.port = pConf.port;
        if (pConf.requireDiscordAuth !== undefined) {
            panelConfig.requireDiscordAuth = pConf.requireDiscordAuth;
        }

        // Auto-extraer puerto de la URL si se especifica
        let tempUrl = panelConfig.url.trim();
        if (tempUrl) {
            if (tempUrl.endsWith('/')) tempUrl = tempUrl.slice(0, -1);
            try {
                const parsedUrl = new URL(tempUrl.startsWith('http') ? tempUrl : 'http://' + tempUrl);
                if (parsedUrl.port) {
                    panelConfig.port = parseInt(parsedUrl.port);
                }
            } catch (err) {
                // Ignorar error de URL inválida
            }
        }
    }
} catch (e) { }
// =====================================================================

const session = require('express-session');
const multer = require('multer');
const app = express();

// Crear carpeta de uploads si no existe
const uploadsPath = path.join(__dirname, 'uploads');
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
        this.path = path.join(__dirname, 'sessions.json');
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
        cb(null);
    }
}

app.use(session({
    store: new SimpleFileStore(),
    secret: 'bot-admin-panel-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 dias
}));

// Configurar Multer para guardar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsPath),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// NUEVO: Función para registrar actividad desde el panel
function logPanelActivity(guildId, type, message) {
    const activityPath = path.join(__dirname, 'bot-activity.json');
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
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `${panelConfig.url}/callback`;

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (panelConfig.requireDiscordAuth === false) {
        if (!req.session.user) {
            req.session.user = {
                id: '123456789',
                username: 'Admin Local',
                avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
                tag: 'Admin#0000',
                bypass: true
            };
        }
        return next();
    }
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Ruta de Login
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    const botAvatar = botClient?.user?.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const botName = botClient?.user?.username || 'Bot Admin';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login - ${botName}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                body { background: #0f0f13; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .login-card { background: #181825; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 350px; }
                .login-btn { background: #5865F2; color: white; padding: 15px 30px; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 600; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s; margin-bottom: 12px; }
                .login-btn:hover { background: #4752c4; transform: translateY(-3px); }
                img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 20px; border: 3px solid #5865f2; }
            </style>
        </head>
        <body>
            <div class="login-card">
                <img src="${botAvatar}" id="bot-logo">
                <h2>${botName}</h2>
                <p style="color: #a0a0a0; margin-bottom: 30px;">Inicia sesión con Discord para gestionar el bot.</p>
                <a href="${url}" class="login-btn"><i class="fab fa-discord"></i> Iniciar Sesión</a>
                <a href="/login/bypass" style="color: var(--accent); font-size: 0.85rem; text-decoration: none; opacity: 0.7; transition: 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">🔑 Acceso de Administrador (Sin Discord)</a>
            </div>
        </body>
        </html>
    `);
});

// Ruta de Bypass de Login (Desarrollo / Pruebas)
app.get('/login/bypass', (req, res) => {
    // Generar un usuario de sesión simulado para no requerir Discord OAuth2
    req.session.user = {
        id: '123456789',
        username: 'Admin Local',
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
        tag: 'Admin#0000',
        bypass: true
    };
    logPanelActivity('SYSTEM', 'BYPASS_LOGIN', 'Inicio de sesión simulado realizado sin OAuth2');
    res.redirect('/');
});

// Ruta de Callback
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/login');

    try {
        // Intercambiar código por token (usando fetch si está disponible, sino https)
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

        if (tokenData.error) throw new Error(tokenData.error_description);

        // Obtener info del usuario
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userRes.json();

        // Guardar en sesión
        req.session.user = userData;
        res.redirect('/');
    } catch (e) {
        console.error('Error en OAuth2:', e);
        res.send('Error en la autenticación. Asegúrate de configurar CLIENT_ID y CLIENT_SECRET.');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Proteger rutas estáticas y API
app.use((req, res, next) => {
    if (req.path === '/login' || req.path === '/callback' || req.path.startsWith('/public') || req.path.startsWith('/uploads')) return next();
    if (panelConfig.requireDiscordAuth === false) {
        if (!req.session.user) {
            req.session.user = {
                id: '123456789',
                username: 'Admin Local',
                avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
                tag: 'Admin#0000',
                bypass: true
            };
        }
        return next();
    }
    if (!req.session.user) return res.redirect('/login');
    next();
});

// Ruta para subir imágenes
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// Servir archivos estáticos si existen
const publicPath = path.join(__dirname, 'admin-public');
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
    const ticketsDir = path.join(__dirname, 'tickets');
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
    const activityPath = path.join(__dirname, 'bot-activity.json');
    try {
        if (fs.existsSync(activityPath)) {
            const activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
            return res.json(activity);
        }
    } catch (e) { }
    res.json([]);
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

app.get('/api/tickets/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'tickets', req.params.filename);

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

    const guilds = botClient.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        members: guild.memberCount,
        channels: guild.channels.cache.size,
        icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png'
    }));

    console.log(`[DEBUG] /api/guilds devolviendo ${guilds.length} servidores`);
    res.json(guilds);
});

// Endpoint para obtener miembros de un servidor específico
app.get('/api/guilds/:guildId/members', async (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    try {
        const members = await guild.members.fetch({ limit: 100 });
        const memberList = members.map(m => ({
            id: m.id,
            tag: m.user.tag,
            nickname: m.nickname,
            roles: m.roles.cache.size - 1, // total sin @everyone
            roleList: m.roles.cache
                .filter(r => r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
            avatar: m.user.displayAvatarURL(),
            joinedAt: m.joinedAt
        }));
        res.json(memberList);
    } catch (e) {
        res.status(500).json({ error: 'Error obteniendo miembros' });
    }
});

// Endpoints para configuración de logs (según la imagen de ProBot)
const logsConfigPath = path.join(__dirname, 'logs-config.json');

function loadLogsConfig() {
    try {
        if (fs.existsSync(logsConfigPath)) {
            return JSON.parse(fs.readFileSync(logsConfigPath, 'utf8'));
        }
    } catch (e) { console.error('Error cargando logs-config.json:', e); }
    return {};
}

function saveLogsConfig(config) {
    try {
        fs.writeFileSync(logsConfigPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) { console.error('Error guardando logs-config.json:', e); }
}

app.get('/api/guilds/:guildId/logs-config', (req, res) => {
    const config = loadLogsConfig();
    res.json(config[req.params.guildId] || {});
});

app.post('/api/guilds/:guildId/logs-config', (req, res) => {
    const config = loadLogsConfig();
    config[req.params.guildId] = req.body;
    saveLogsConfig(config);
    logPanelActivity(req.params.guildId, 'LOGS', 'Configuración de logs granulares actualizada');
    res.json({ success: true });
});

// Endpoints para configuración de bienvenidas
const welcomeConfigPath = path.join(__dirname, 'welcome-config.json');

function loadWelcomeConfig() {
    try {
        if (fs.existsSync(welcomeConfigPath)) {
            return JSON.parse(fs.readFileSync(welcomeConfigPath, 'utf8'));
        }
    } catch (e) { console.error('Error cargando welcome-config.json:', e); }
    return {};
}

function saveWelcomeConfig(config) {
    try {
        fs.writeFileSync(welcomeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) { console.error('Error guardando welcome-config.json:', e); }
}

app.get('/api/guilds/:guildId/welcome-config', (req, res) => {
    const config = loadWelcomeConfig();
    res.json(config[req.params.guildId] || { enabled: false, channel: '', message: '¡Bienvenido {user} a {server}!', color: '#5865f2' });
});

app.post('/api/guilds/:guildId/welcome-config', (req, res) => {
    const config = loadWelcomeConfig();
    config[req.params.guildId] = req.body;
    saveWelcomeConfig(config);
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

// Endpoint para "Say" (enviar mensaje normal)
app.post('/api/guilds/:guildId/send', async (req, res) => {
    const { channelId, message } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        await channel.send(message);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error enviando mensaje' });
    }
});

// Endpoint para "Embed" (crear embed)
app.post('/api/guilds/:guildId/embed', async (req, res) => {
    const { channelId, title, description, color, image, footer } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    try {
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle(title || null)
            .setDescription(description || null)
            .setColor(color || '#5865f2');

        if (image) embed.setImage(image);
        if (footer) embed.setFooter({ text: footer });

        await channel.send({ embeds: [embed] });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error enviando embed' });
    }
});

// Endpoint para "Ticket Panel"
app.post('/api/guilds/:guildId/send-ticket-panel', async (req, res) => {
    const { channelId, logChannelId, message, buttons } = req.body;
    if (!botClient) return res.json({ error: 'Bot no conectado' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return res.status(404).json({ error: 'Canal de logs no encontrado' });

    try {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        const discordButtons = [];
        const buttonConfigs = [];

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

        await channel.send({ embeds: [embed], components: rows });

        // Guardar configuración del panel
        const ticketsConfigPath = path.join(__dirname, 'tickets-config.json');
        let config = { guilds: {} };
        if (fs.existsSync(ticketsConfigPath)) {
            try { config = JSON.parse(fs.readFileSync(ticketsConfigPath, 'utf8')); } catch (e) { }
        }
        if (!config.guilds[guild.id]) config.guilds[guild.id] = {};
        config.guilds[guild.id].panelConfigs = buttonConfigs;
        config.guilds[guild.id].panelMessage = message || null;
        config.guilds[guild.id].ticketLogChannelId = logChannelId;

        fs.writeFileSync(ticketsConfigPath, JSON.stringify(config, null, 2));

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
        const suggestionsConfigPath = path.join(__dirname, 'suggestions-config.json');
        let config = { guilds: {} };
        if (fs.existsSync(suggestionsConfigPath)) {
            try { config = JSON.parse(fs.readFileSync(suggestionsConfigPath, 'utf8')); } catch (e) { }
        }
        if (!config.guilds[guild.id]) config.guilds[guild.id] = { suggestionsChannelId: '', suggestions: [] };

        res.json({
            success: true,
            suggestions: config.guilds[guild.id].suggestions || [],
            suggestionsChannelId: config.guilds[guild.id].suggestionsChannelId || ''
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
        const { status } = req.body;
        const suggestionId = parseInt(req.params.suggestionId);

        const suggestionsConfigPath = path.join(__dirname, 'suggestions-config.json');
        let config = { guilds: {} };
        if (fs.existsSync(suggestionsConfigPath)) {
            try { config = JSON.parse(fs.readFileSync(suggestionsConfigPath, 'utf8')); } catch (e) { }
        }
        if (!config.guilds[guild.id]) config.guilds[guild.id] = { suggestionsChannelId: '', suggestions: [] };

        const suggestion = config.guilds[guild.id].suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return res.status(404).json({ error: 'Sugerencia no encontrada' });

        suggestion.status = status;
        suggestion.approvedAt = new Date().toISOString();
        suggestion.approvedBy = 'Admin Panel';

        // Si se aprueba, enviar al canal configurado
        if (status === 'approved' && config.guilds[guild.id].suggestionsChannelId) {
            try {
                const channel = guild.channels.cache.get(config.guilds[guild.id].suggestionsChannelId);
                if (channel) {
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Sugerencia Aprobada')
                        .setDescription(suggestion.text)
                        .setAuthor({ name: suggestion.userTag, iconURL: suggestion.userAvatar })
                        .setColor(0x00FF00)
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            } catch (e) {
                console.error('Error enviando sugerencia aprobada:', e);
            }
        }

        fs.writeFileSync(suggestionsConfigPath, JSON.stringify(config, null, 2));

        logPanelActivity(guild.id, 'SUGGESTIONS', `Sugerencia ${suggestion.id} cambió a estado: ${status}`);
        res.json({ success: true });
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

        const suggestionsConfigPath = path.join(__dirname, 'suggestions-config.json');
        let config = { guilds: {} };
        if (fs.existsSync(suggestionsConfigPath)) {
            try { config = JSON.parse(fs.readFileSync(suggestionsConfigPath, 'utf8')); } catch (e) { }
        }
        if (!config.guilds[guild.id]) config.guilds[guild.id] = { suggestionsChannelId: '', suggestions: [] };

        config.guilds[guild.id].suggestionsChannelId = channelId;
        fs.writeFileSync(suggestionsConfigPath, JSON.stringify(config, null, 2));

        logPanelActivity(guild.id, 'SUGGESTIONS', `Canal de sugerencias configurado: ${channel.name}`);
        res.json({ success: true });
    } catch (e) {
        console.error('Error guardando canal de sugerencias:', e);
        res.status(500).json({ error: 'Error guardando canal de sugerencias' });
    }
});

// Endpoint: Enviar comentario en sugerencia
app.post('/api/guilds/:guildId/suggestions/:suggestionId/comment', async (req, res) => {
    if (!botClient) return res.status(500).json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const { comment } = req.body;
    const suggestionId = parseInt(req.params.suggestionId);

    if (!comment || comment.trim() === '') {
        return res.status(400).json({ error: 'Comentario vacío' });
    }

    try {
        const suggestionsConfigPath = path.join(__dirname, 'suggestions-config.json');
        let config = { guilds: {} };
        if (fs.existsSync(suggestionsConfigPath)) {
            try { config = JSON.parse(fs.readFileSync(suggestionsConfigPath, 'utf8')); } catch (e) { }
        }
        if (!config.guilds[guild.id]) config.guilds[guild.id] = { suggestionsChannelId: '', suggestions: [] };

        const suggestion = config.guilds[guild.id].suggestions.find(s => s.id === suggestionId);
        if (!suggestion) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        // Guardar comentario
        if (!suggestion.comments) suggestion.comments = [];
        suggestion.comments.push({
            text: comment,
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(suggestionsConfigPath, JSON.stringify(config, null, 2));

        // Enviar comentario al usuario por MD
        try {
            const user = await botClient.users.fetch(suggestion.userId);
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('💬 Comentario en tu Sugerencia')
                .setDescription(`**Tu sugerencia:**\n${suggestion.text}\n\n**Comentario del staff:**\n${comment}`)
                .setColor(0x5865F2)
                .setTimestamp();

            await user.send({ embeds: [embed] });
            console.log(`✅ Comentario enviado a ${suggestion.userTag}`);
        } catch (e) {
            console.log(`⚠️ No se pudo enviar MD a ${suggestion.userTag}: ${e.message}`);
        }

        logPanelActivity(guild.id, 'SUGGESTIONS', `Comentario enviado en sugerencia ID: ${suggestionId}`);
        res.json({ success: true });
    } catch (e) {
        console.error('Error enviando comentario:', e);
        res.status(500).json({ error: 'Error enviando comentario' });
    }
});

// ===== AUTO-RESPUESTAS =====
const autoResponsesPath = path.join(__dirname, 'auto-responses.json');

function loadAutoResponses() {
    try {
        if (fs.existsSync(autoResponsesPath)) {
            return JSON.parse(fs.readFileSync(autoResponsesPath, 'utf8'));
        }
    } catch (e) { console.error('Error cargando auto-responses.json:', e); }
    return { guilds: {} };
}

function saveAutoResponses(config) {
    try {
        fs.writeFileSync(autoResponsesPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) { console.error('Error guardando auto-responses.json:', e); }
}

// GET: Obtener todas las auto-respuestas de un servidor
app.get('/api/guilds/:guildId/auto-responses', (req, res) => {
    const config = loadAutoResponses();
    res.json(config.guilds[req.params.guildId] || []);
});

// POST: Crear nueva auto-respuesta
app.post('/api/guilds/:guildId/auto-responses', (req, res) => {
    const config = loadAutoResponses();
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
        enabledRoles: req.body.enabledRoles || [],
        disabledRoles: req.body.disabledRoles || [],
        enabledChannels: req.body.enabledChannels || [],
        disabledChannels: req.body.disabledChannels || [],
        enabled: true,
        createdAt: new Date().toISOString()
    };

    config.guilds[req.params.guildId].push(newResponse);
    saveAutoResponses(config);
    logPanelActivity(req.params.guildId, 'AUTO_RESPONSE', `Auto-respuesta creada: "${newResponse.trigger}"`);
    res.json({ success: true, response: newResponse });
});

// PUT: Actualizar auto-respuesta existente
app.put('/api/guilds/:guildId/auto-responses/:responseId', (req, res) => {
    const config = loadAutoResponses();
    if (!config.guilds[req.params.guildId]) return res.status(404).json({ error: 'No hay auto-respuestas' });

    const index = config.guilds[req.params.guildId].findIndex(r => r.id === req.params.responseId);
    if (index === -1) return res.status(404).json({ error: 'Auto-respuesta no encontrada' });

    const existing = config.guilds[req.params.guildId][index];
    config.guilds[req.params.guildId][index] = { ...existing, ...req.body, id: existing.id };
    saveAutoResponses(config);
    logPanelActivity(req.params.guildId, 'AUTO_RESPONSE', `Auto-respuesta actualizada: "${existing.trigger}"`);
    res.json({ success: true });
});

// DELETE: Eliminar auto-respuesta
app.delete('/api/guilds/:guildId/auto-responses/:responseId', (req, res) => {
    const config = loadAutoResponses();
    if (!config.guilds[req.params.guildId]) return res.status(404).json({ error: 'No hay auto-respuestas' });

    const index = config.guilds[req.params.guildId].findIndex(r => r.id === req.params.responseId);
    if (index === -1) return res.status(404).json({ error: 'Auto-respuesta no encontrada' });

    const removed = config.guilds[req.params.guildId].splice(index, 1);
    saveAutoResponses(config);
    logPanelActivity(req.params.guildId, 'AUTO_RESPONSE', `Auto-respuesta eliminada: "${removed[0].trigger}"`);
    res.json({ success: true });
});

// ===== TICKET CONFIG MEJORADO =====
// GET: Obtener configuración del panel de tickets (para cargarla en el formulario)
app.get('/api/guilds/:guildId/ticket-config', (req, res) => {
    const ticketsConfigPath = path.join(__dirname, 'tickets-config.json');
    let config = { guilds: {} };
    if (fs.existsSync(ticketsConfigPath)) {
        try { config = JSON.parse(fs.readFileSync(ticketsConfigPath, 'utf8')); } catch (e) { }
    }
    const guildConfig = config.guilds[req.params.guildId] || {};

    // También cargar el staffRoleId desde staff-roles.json
    const staffRolesPath = path.join(__dirname, 'staff-roles.json');
    let staffRoles = {};
    if (fs.existsSync(staffRolesPath)) {
        try { staffRoles = JSON.parse(fs.readFileSync(staffRolesPath, 'utf8')); } catch (e) { }
    }
    const guildStaff = staffRoles[req.params.guildId] || {};

    res.json({
        panelMessage: guildConfig.panelMessage || '',
        panelConfigs: guildConfig.panelConfigs || [],
        ticketLogChannelId: guildConfig.ticketLogChannelId || '',
        ticketStaffRoles: guildConfig.ticketStaffRoles || [],
        staffRoleId: guildStaff.ticketStaffRole || ''
    });
});

// PUT: Actualizar configuración del panel de tickets (sin enviar, solo guardar)
app.put('/api/guilds/:guildId/ticket-config', (req, res) => {
    const ticketsConfigPath = path.join(__dirname, 'tickets-config.json');
    let config = { guilds: {} };
    if (fs.existsSync(ticketsConfigPath)) {
        try { config = JSON.parse(fs.readFileSync(ticketsConfigPath, 'utf8')); } catch (e) { }
    }
    if (!config.guilds[req.params.guildId]) config.guilds[req.params.guildId] = {};

    // Actualizar solo los campos enviados
    if (req.body.panelMessage !== undefined) config.guilds[req.params.guildId].panelMessage = req.body.panelMessage;
    if (req.body.panelConfigs !== undefined) config.guilds[req.params.guildId].panelConfigs = req.body.panelConfigs;
    if (req.body.ticketLogChannelId !== undefined) config.guilds[req.params.guildId].ticketLogChannelId = req.body.ticketLogChannelId;
    if (req.body.ticketStaffRoles !== undefined) config.guilds[req.params.guildId].ticketStaffRoles = req.body.ticketStaffRoles;

    fs.writeFileSync(ticketsConfigPath, JSON.stringify(config, null, 2));

    // Si se envían roles de staff, también actualizar en staff-roles.json y en el bot
    if (req.body.ticketStaffRoles && req.body.ticketStaffRoles.length > 0) {
        const staffRolesPath = path.join(__dirname, 'staff-roles.json');
        let staffRoles = {};
        if (fs.existsSync(staffRolesPath)) {
            try { staffRoles = JSON.parse(fs.readFileSync(staffRolesPath, 'utf8')); } catch (e) { }
        }
        if (!staffRoles[req.params.guildId]) staffRoles[req.params.guildId] = {};
        staffRoles[req.params.guildId].ticketStaffRole = req.body.ticketStaffRoles[0];
        fs.writeFileSync(staffRolesPath, JSON.stringify(staffRoles, null, 2));

        // Actualizar el Map en memoria del bot
        if (botClient && botClient.ticketStaffRole) {
            botClient.ticketStaffRole.set(req.params.guildId, req.body.ticketStaffRoles[0]);
        }
    }

    logPanelActivity(req.params.guildId, 'TICKETS', 'Configuración de tickets actualizada desde el panel');
    res.json({ success: true });
});

// GET: Obtener roles del servidor
app.get('/api/guilds/:guildId/roles', (req, res) => {
    if (!botClient) return res.json({ error: 'Bot no conectado' });
    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });

    const roles = guild.roles.cache
        .filter(r => r.id !== guild.id) // quitar @everyone
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    res.json(roles);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

function startAdminPanel(client) {
    setBotClient(client);
    updateBotStats();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n---------------------------------------------------`);
        console.log(`✅ Panel de ProBot-Style iniciado con éxito`);
        console.log(`🌐 URL Local: http://localhost:${PORT}`);
        console.log(`🌐 URL Hosting: ${panelConfig.url}`);
        console.log(`---------------------------------------------------\n`);
    });
}

module.exports = { startAdminPanel };