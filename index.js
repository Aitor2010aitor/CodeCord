// index.js
require('dotenv').config();
const { startAdminPanel } = require('./WEB/admin-panel.js');
// Manejadores globales para capturar errores y mostrar trazas
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('❌ Unhandled Rejection at:', p, 'reason:', reason);
});
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  PermissionsBitField, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType,
  Collection,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserFlags,
  ChannelSelectMenuBuilder,
  AuditLogEvent,
  AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const os = require('os');
const https = require('https');

const sanctionsConfigPath = path.join(__dirname, 'config', 'sanctions.json');
const sanctionsFolderPath = path.join(__dirname, 'sancion');

function loadSanctionsConfig() {
  try {
    if (!fs.existsSync(sanctionsConfigPath)) return {};
    const content = fs.readFileSync(sanctionsConfigPath, 'utf8') || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error leyendo config de sanciones:', error);
    return {};
  }
}

function saveSanctionsConfig(data) {
  try {
    fs.writeFileSync(sanctionsConfigPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error guardando config de sanciones:', error);
  }
}

function addSanctionRecord(guildId, record) {
  try {
    const data = loadSanctionsConfig();
    if (!data[guildId]) data[guildId] = [];
    data[guildId].push(record);
    saveSanctionsConfig(data);

    if (!fs.existsSync(sanctionsFolderPath)) {
      fs.mkdirSync(sanctionsFolderPath, { recursive: true });
    }

    const filePath = path.join(sanctionsFolderPath, `sanciones_${guildId}.txt`);
    const line = `[${new Date(record.timestamp).toLocaleString('es-ES')}] ${record.type || 'VOICE_SUPPORT'}: ${record.userTag} (${record.userId}) sancionado por ${record.moderatorTag || 'Sistema'} - ${record.reason}\n`;
    fs.appendFileSync(filePath, line, 'utf8');
  } catch (error) {
    console.error('Error registrando sanción:', error);
  }
}

function getSanctionRecords(guildId, userId = null) {
  const data = loadSanctionsConfig();
  if (!data[guildId] || data[guildId].length === 0) return [];
  if (!userId) return data[guildId];
  return data[guildId].filter(record => record.userId === userId);
}

const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus,
  getVoiceConnection
} = require('@discordjs/voice');
// Sistema de música removido

// Función para generar archivo ICO del ticket
async function generateTicketICO(ticketChannel, ticketName) {
  try {
    // Crear directorio de tickets si no existe
    const ticketsDir = path.join(__dirname, 'tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    // Crear un archivo ICO simple (en realidad será un archivo de texto con extensión .ico)
    const timestamp = Date.now();
    const icoFileName = `ticket_${ticketName}_${timestamp}.ico`;
    const icoPath = path.join(ticketsDir, icoFileName);
    
    // Crear contenido del archivo ICO (formato simple)
    const icoContent = `Ticket creado: ${ticketName}
Canal: ${ticketChannel.name}
ID: ${ticketChannel.id}
Fecha: ${new Date().toLocaleString('es-ES')}
Estado: Activo`;

    fs.writeFileSync(icoPath, icoContent);
    console.log(`✅ ICO del ticket ${ticketName} generado: ${icoPath}`);
    
    return icoPath;
  } catch (error) {
    console.error('❌ Error generando ICO del ticket:', error);
    return null;
  }
}

// Función para generar PDF del ticket
async function generateTicketPDF(ticketChannel, ticketName, closedBy) {
  try {
    console.log(`🔍 Debug - Iniciando generación de PDF para ticket: ${ticketName}`);
    
    // Crear directorio de tickets si no existe
    const ticketsDir = path.join(__dirname, 'tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    // Obtener todos los mensajes del canal
    const messages = [];
    let lastMessageId = null;
    
    while (true) {
      const options = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }
      
      const batch = await ticketChannel.messages.fetch(options);
      if (batch.size === 0) break;
      
      messages.push(...batch.values());
      lastMessageId = batch.last().id;
    }
    
    // Ordenar mensajes por fecha (más antiguos primero)
    messages.reverse();

    // Crear PDF real
    const timestamp = Date.now();
    const pdfFileName = `ticket_${ticketName}_${timestamp}.pdf`;
    const pdfPath = path.join(ticketsDir, pdfFileName);
    
    // Crear documento PDF en orientación vertical (portrait)
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'portrait' // Orientación vertical como pantalla de ordenador
    });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    // Fondo negro de toda la página (estilo código)
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1e1e1e');
    
    // Header con gradiente Discord
    const headerHeight = 100;
    doc.rect(0, 0, doc.page.width, headerHeight).fill('#5865F2');
    
    // Título principal en el header
    doc.fillColor('#ffffff')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text(`🎫 TICKET: ${ticketName}`, 50, 25, { align: 'center' });
    
    doc.fillColor('#ffffff')
       .fontSize(14)
       .font('Helvetica')
       .text('Generado automáticamente al cerrar el ticket', 50, 60, { align: 'center' });
    
    // Espacio después del header
    doc.y = headerHeight + 30;
    
    // Información del ticket en caja estilo HTML
    const infoBoxY = doc.y;
    const infoBoxHeight = 160;
    
    // Fondo de la caja de información estilo terminal
    doc.rect(50, infoBoxY, doc.page.width - 100, infoBoxHeight)
       .fill('#2d2d30')
       .stroke('#3e3e42');
    
    // Título de la información
    doc.fillColor('#4ec9b0')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('📋 Información del Ticket', 60, infoBoxY + 25);
    
    // Información del ticket con estilo de código
    doc.fillColor('#d4d4d4')
       .fontSize(14)
       .font('Helvetica')
       .text(`Nombre del Canal: ${ticketChannel.name}`, 60, infoBoxY + 60)
       .text(`ID del Canal: ${ticketChannel.id}`, 60, infoBoxY + 90)
       .text(`Cerrado por: ${closedBy}`, 60, infoBoxY + 120)
       .text(`Fecha de Cierre: ${new Date().toLocaleString('es-ES')}`, 60, infoBoxY + 150);
    
    doc.y = infoBoxY + infoBoxHeight + 20;
    
    // Título de la conversación estilo código
    doc.fillColor('#4ec9b0')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('💬 Historial de Mensajes', 50, doc.y);
    
    doc.moveDown();
    
    // Agregar mensajes
    messages.forEach((msg, index) => {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString('es-ES');
      const isBot = msg.author.bot;
      
      // Determinar colores según el tipo de mensaje (estilo código)
      const bgColor = isBot ? '#1a3a1a' : '#1a1a2e'; // Verde oscuro para bot, azul oscuro para usuario
      const borderColor = isBot ? '#00d166' : '#0078d4'; // Verde para bot, azul para usuario
      const textColor = isBot ? '#4ec9b0' : '#d4d4d4'; // Verde cian para bot, gris claro para usuario
      
      // Caja del mensaje estilo HTML limpio
      const messageY = doc.y;
      const messageHeight = 90;
      
      // Fondo del mensaje estilo HTML
      doc.rect(50, messageY, doc.page.width - 100, messageHeight)
         .fill(bgColor)
         .stroke(borderColor);
      
      // Header del mensaje estilo HTML
      doc.fillColor(textColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(`${isBot ? '🤖' : '👤'} ${msg.author.tag}`, 70, messageY + 20);
      
      // Timestamp
      doc.fillColor('#666666')
         .fontSize(12)
         .font('Helvetica')
         .text(timestamp, doc.page.width - 200, messageY + 20);
      
      // Contenido del mensaje estilo HTML
      const content = msg.content || '[Sin contenido de texto]';
      doc.fillColor('#333333')
         .fontSize(14)
         .font('Helvetica')
         .text(content, 70, messageY + 45, { width: doc.page.width - 140 });
      
      // Archivos adjuntos
      if (msg.attachments.size > 0) {
        msg.attachments.forEach(attachment => {
          doc.fillColor('#5865F2')
             .fontSize(12)
             .text(`📎 ${attachment.name}`, 70, messageY + 70);
        });
      }
      
      doc.y = messageY + messageHeight + 25;
      
      // Verificar si necesitamos nueva página
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        doc.y = 50;
      }
    });
    
    // Pie de página
    doc.moveDown(2);
    
    // Línea separadora
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown();
    
    // Footer con fondo estilo código
    const footerY = doc.y;
    const footerHeight = 50;
    
    doc.rect(50, footerY, doc.page.width - 100, footerHeight)
       .fill('#2d2d30')
       .stroke('#3e3e42');
    
    doc.fillColor('#4ec9b0')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('🤖 Bot de Discord', 60, footerY + 15, { align: 'center' });
    
    doc.fillColor('#808080')
       .fontSize(10)
       .font('Helvetica')
       .text('Este archivo PDF fue generado automáticamente', 60, footerY + 30, { align: 'center' });
    
    doc.fillColor('#808080')
       .fontSize(9)
       .text(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, 60, footerY + 40, { align: 'center' });
    
    // Finalizar PDF
    doc.end();
    
    // Esperar a que se complete la escritura
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`✅ PDF del ticket ${ticketName} generado: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error('❌ Error generando PDF del ticket:', error);
    return null;
  }
}

// Función para generar HTML del ticket
async function generateTicketHTML(ticketChannel, ticketName, closedBy) {
  try {
    // Crear directorio de tickets si no existe
    const ticketsDir = path.join(__dirname, 'tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    // Obtener todos los mensajes del canal
    const messages = [];
    let lastMessageId = null;
    
    while (true) {
      const options = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }
      
      const batch = await ticketChannel.messages.fetch(options);
      if (batch.size === 0) break;
      
      messages.push(...batch.values());
      lastMessageId = batch.last().id;
    }
    
    // Ordenar mensajes por fecha (más antiguos primero)
    messages.reverse();

    // Crear HTML para el archivo con estilo de código de programación
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Ticket: ${ticketName}</title>
        <style>
            body {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                margin: 0;
                padding: 20px;
                background-color: #1e1e1e;
                color: #d4d4d4;
                line-height: 1.4;
            }
            .header {
                background: linear-gradient(135deg, #0078d4, #106ebe);
                color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
                border: 1px solid #0078d4;
                box-shadow: 0 0 20px rgba(0, 120, 212, 0.3);
            }
            .ticket-info {
                background: #2d2d30;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #3e3e42;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .message {
                background: #252526;
                margin: 10px 0;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #0078d4;
                border: 1px solid #3e3e42;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .message-header {
                font-weight: bold;
                color: #4ec9b0;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .message-content {
                line-height: 1.6;
                word-wrap: break-word;
                color: #d4d4d4;
            }
            .timestamp {
                color: #808080;
                font-size: 0.9em;
            }
            .bot-message {
                border-left-color: #00d166;
                background: #1a3a1a;
            }
            .user-message {
                border-left-color: #0078d4;
                background: #1a1a2e;
            }
            .embed {
                background: #2d2d30;
                border: 1px solid #3e3e42;
                border-radius: 6px;
                padding: 12px;
                margin: 8px 0;
            }
            .embed-title {
                font-weight: bold;
                color: #4ec9b0;
                margin-bottom: 8px;
                font-size: 1.1em;
            }
            .embed-description {
                color: #d4d4d4;
                line-height: 1.5;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                color: #808080;
                border-top: 1px solid #3e3e42;
                background: #2d2d30;
                border-radius: 8px;
                border: 1px solid #3e3e42;
            }
            .code-style {
                background: #1e1e1e;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                padding: 2px 6px;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                color: #4ec9b0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎫 Ticket: ${ticketName}</h1>
            <p>Generado automáticamente al cerrar el ticket</p>
        </div>
        
        <div class="ticket-info">
            <h3>📋 Información del Ticket</h3>
            <p><span class="code-style">Nombre del Canal:</span> ${ticketName}</p>
            <p><span class="code-style">ID del Canal:</span> ${ticketChannel.id}</p>
            <p><span class="code-style">Cerrado por:</span> ${closedBy}</p>
            <p><span class="code-style">Fecha de Cierre:</span> ${new Date().toLocaleString('es-ES')}</p>
            <p><span class="code-style">Total de Mensajes:</span> ${messages.length}</p>
        </div>
        
        <h2>💬 Historial de Mensajes</h2>
        
        ${messages.map(msg => {
          const isBot = msg.author.bot;
          const timestamp = new Date(msg.createdTimestamp).toLocaleString('es-ES');
          
          let content = msg.content || '';
          
          // Procesar embeds
          let embedsHtml = '';
          if (msg.embeds && msg.embeds.length > 0) {
            embedsHtml = msg.embeds.map(embed => `
              <div class="embed">
                ${embed.title ? `<div class="embed-title">${embed.title}</div>` : ''}
                ${embed.description ? `<div class="embed-description">${embed.description}</div>` : ''}
              </div>
            `).join('');
          }
          
          // Procesar attachments
          let attachmentsHtml = '';
          if (msg.attachments && msg.attachments.size > 0) {
            attachmentsHtml = msg.attachments.map(att => 
              `<p><em>📎 Archivo adjunto: ${att.name} (${(att.size / 1024).toFixed(1)} KB)</em></p>`
            ).join('');
          }
          
          return `
            <div class="message ${isBot ? 'bot-message' : 'user-message'}">
              <div class="message-header">
                <span>${isBot ? '🤖' : '👤'} ${msg.author.tag}</span>
                <span class="timestamp">${timestamp}</span>
              </div>
              <div class="message-content">
                ${content ? content.replace(/\n/g, '<br>') : '<em>Sin contenido de texto</em>'}
                ${embedsHtml}
                ${attachmentsHtml}
              </div>
            </div>
          `;
        }).join('')}
        
        <div class="footer">
            <p>Este archivo HTML fue generado automáticamente por el bot de Discord</p>
            <p>Fecha de generación: ${new Date().toLocaleString('es-ES')}</p>
        </div>
    </body>
    </html>
    `;

    // Generar archivo HTML
    const fileName = `ticket_${ticketName}_${Date.now()}.html`;
    const filePath = path.join(ticketsDir, fileName);
    
    // Escribir el HTML al archivo
    fs.writeFileSync(filePath, html, 'utf8');
    
    console.log(`✅ HTML generado: ${filePath}`);
    return filePath;
    
  } catch (error) {
    console.error('❌ Error generando HTML del ticket:', error);
    return null;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember]
});

// Colecciones para almacenar datos
client.voiceConnections = new Collection();
client.audioPlayers = new Collection();
client.colorRoles = new Map();
client.colorIntervals = new Map();
client.tickets = new Map();
client.commandRoles = new Map(); // NUEVO: Para roles permitidos por servidor
client.ticketStaffRole = new Map(); // Rol de staff por servidor para tickets
client.voiceSupportQueue = new Map(); // Cola de usuarios en espera por servidor
client.voiceSupportStaffRole = new Map(); // Rol de staff de soporte de voz por servidor
client.voiceSupportSanctionedRole = new Map(); // Rol de sancionado que no puede entrar a sala de espera
client.voiceSupportWaitingTime = new Map(); // Tiempo de entrada a sala de espera por usuario {guildId: {userId: timestamp}}
client.voiceSupportWarningSent = new Map(); // Usuarios que ya recibieron advertencia {guildId: Set(userId)}
client.voiceSupportNextRole = new Map(); // Rol que puede usar el comando !nex por servidor
client.voiceSupportQueueMessages = new Map(); // Mensajes de notificación para actualizar {guildId: {userId: messageId}}
client.tempVoiceChannels = new Set(); // IDs de canales de voz temporales (se eliminan cuando están vacíos)
client.tempVoiceChannelOwners = new Map(); // Dueño actual de cada canal de voz temporal
client.tempVoiceChannelBannedUsers = new Map(); // Usuarios baneados de cada sala {channelId: Set(userIds)}
client.userWarnings = new Map(); // Sistema de advertencias por servidor {guildId: {userId: [{reason, moderator, timestamp}]}}

// ===== FUNCIONES DE CONFIGURACIÓN DE TICKETS =====
const ticketsConfigPath = path.join(__dirname, 'config', 'tickets-config.json');

// Cargar configuración de tickets desde archivo
function loadTicketsConfig() {
  try {
    if (fs.existsSync(ticketsConfigPath)) {
      const data = fs.readFileSync(ticketsConfigPath, 'utf8').trim();
      if (!data) {
        saveTicketsConfig({ guilds: {} });
        return { guilds: {} };
      }
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('⚠️ tickets-config.json corrupto, reiniciando configuración');
    saveTicketsConfig({ guilds: {} });
  }
  return { guilds: {} };
}

// Guardar configuración de tickets a archivo
function saveTicketsConfig(config) {
  try {
    fs.writeFileSync(ticketsConfigPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ Configuración de tickets guardada');
  } catch (err) {
    console.error('❌ Error guardando tickets-config.json:', err);
  }
}

// Obtener configuración de un servidor
function getTicketConfig(guildId) {
  const ticketsConfig = loadTicketsConfig();
  return ticketsConfig.guilds[guildId] || null;
}

// Guardar/actualizar configuración de un servidor
function setTicketConfig(guildId, config) {
  const ticketsConfig = loadTicketsConfig();
  if (!ticketsConfig.guilds) ticketsConfig.guilds = {};
  ticketsConfig.guilds[guildId] = config;
  saveTicketsConfig(ticketsConfig);
}

// Cargar todas las configuraciones de tickets al iniciar el bot
client.ticketConfigData = loadTicketsConfig();

// Función para verificar si el usuario tiene permisos de staff
function hasStaffPermission(member, guild) {
  if (!member) return false;
  
  // Si es administrador, tiene acceso total
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  
  // Si no hay roles de staff configurados, permitir a administradores
  const ticketStaffRoleId = client.ticketStaffRole.get(guild.id);
  const commandRoles = client.commandRoles.get(guild.id);
  const voiceStaffRoleId = client.voiceSupportStaffRole.get(guild.id);
  
  if (!ticketStaffRoleId && (!commandRoles || commandRoles.length === 0) && !voiceStaffRoleId) {
    // No hay roles configurados, permitir solo a admins
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
  }
  
  // Verificar rol de staff de tickets
  if (ticketStaffRoleId && member.roles.cache.has(ticketStaffRoleId)) return true;
  
  // Verificar roles permitidos configurados con /setroles
  if (commandRoles && commandRoles.length > 0) {
    for (const roleId of commandRoles) {
      if (member.roles.cache.has(roleId)) return true;
    }
  }
  
  // Verificar rol de staff de soporte de voz
  if (voiceStaffRoleId && member.roles.cache.has(voiceStaffRoleId)) return true;

  return false;
}

function isTicketChannel(channel) {
  return channel && typeof channel.name === 'string' && channel.name.toLowerCase().startsWith('ticket-');
}

function findTicketUserByChannel(ticketChannel) {
  if (!ticketChannel || !ticketChannel.permissionOverwrites) return null;

  for (const [id, overwrite] of ticketChannel.permissionOverwrites.cache) {
    if (overwrite.allow && overwrite.allow.has(PermissionsBitField.Flags.ViewChannel) && !overwrite.deny?.has(PermissionsBitField.Flags.ViewChannel)) {
      const member = ticketChannel.guild.members.cache.get(id);
      if (member && !member.user.bot) return member;
    }
  }

  const match = ticketChannel.name.match(/ticket-(\d+)/);
  if (match) {
    return ticketChannel.guild.members.cache.get(match[1]) || null;
  }

  return null;
}

async function closeTicketChannel(ticketChannel, closedBy, replyCallback = null) {
  if (!ticketChannel || !isTicketChannel(ticketChannel)) return;

  const ticketName = ticketChannel.name;
  const closingEmbed = new EmbedBuilder()
    .setTitle('🔒 Cerrando ticket...')
    .setDescription('Este ticket se cerrará en 5 segundos.')
    .setColor(0xFFA500);

  if (replyCallback) {
    try {
      await replyCallback({ content: '⚠️ Cerrando el ticket...', embeds: [closingEmbed], ephemeral: true });
    } catch (error) {
      console.error('Error enviando respuesta de cierre:', error);
    }
  }

  try {
    await ticketChannel.send({ embeds: [closingEmbed] });
  } catch (error) {
    console.error('Error enviando mensaje de cierre en el canal:', error);
  }

  let htmlPath = null;
  let pdfPath = null;
  try {
    htmlPath = await generateTicketHTML(ticketChannel, ticketName, closedBy.user?.tag || closedBy.tag || String(closedBy));
  } catch (error) {
    console.error(`Error generando HTML al cerrar ticket ${ticketName}:`, error);
  }

  const logEmbed = new EmbedBuilder()
    .setTitle('🔒 Ticket Cerrado')
    .setDescription(`**Ticket:** ${ticketName}\n**Cerrado por:** ${closedBy.user?.tag || closedBy.tag || String(closedBy)}\n**ID del canal:** ${ticketChannel.id}\n**HTML generado:** ${htmlPath ? '✅ Sí' : '❌ No'}`)
    .setColor(0xFF0000)
    .setTimestamp();

  let ticketLogChannelId = null;
  try {
    const ticketsConfig = loadTicketsConfig();
    if (ticketsConfig.guilds && ticketsConfig.guilds[ticketChannel.guild.id]) {
      ticketLogChannelId = ticketsConfig.guilds[ticketChannel.guild.id].ticketLogChannelId || null;
    }
  } catch (error) {
    console.error('Error leyendo tickets-config.json para cierre de ticket:', error);
  }

  await sendSecurityLog(ticketChannel.guild, logEmbed, htmlPath, pdfPath, ticketLogChannelId);

  let ticketUser = findTicketUserByChannel(ticketChannel);
  if (!ticketUser) {
    const match = ticketChannel.name.match(/ticket-(\d+)/);
    if (match) {
      ticketUser = await ticketChannel.guild.members.fetch(match[1]).catch(() => null);
    }
  }
  if (!ticketUser) {
    ticketUser = ticketChannel.guild.members.cache.get(ticketChannel.guild.ownerId) || null;
  }

  if (ticketUser) {
    try {
      const userEmbed = new EmbedBuilder()
        .setTitle('🔒 Tu ticket ha sido cerrado')
        .setDescription(`Tu ticket **${ticketName}** ha sido cerrado por **${closedBy.user?.tag || closedBy.tag || String(closedBy)}**.`)
        .addFields({ name: '📄 Archivo', value: htmlPath ? 'HTML generado y adjunto' : 'No disponible', inline: true })
        .setColor(0x00FF00)
        .setTimestamp();

      const userFiles = [];
      if (htmlPath && fs.existsSync(htmlPath)) {
        userFiles.push({ attachment: htmlPath, name: path.basename(htmlPath) });
      }
      if (pdfPath && fs.existsSync(pdfPath)) {
        userFiles.push({ attachment: pdfPath, name: path.basename(pdfPath) });
      }

      if (userFiles.length > 0) {
        await ticketUser.send({ embeds: [userEmbed], files: userFiles });
      } else {
        await ticketUser.send({ embeds: [userEmbed] });
      }
    } catch (dmError) {
      console.warn('No se pudo enviar DM al creador del ticket:', dmError.message);
    }
  }

  setTimeout(async () => {
    try {
      await ticketChannel.delete('Ticket cerrado');
    } catch (deleteError) {
      console.error('Error eliminando canal del ticket:', deleteError);
    }
  }, 5000);
}

// Sistema Anti-Raid
client.antiRaid = {
  messageTracker: new Map(), // Rastrear mensajes por usuario
  channelActions: new Map(), // Rastrear creación/eliminación de canales
  whitelist: new Map(), // Whitelist por servidor
  logChannel: new Map(), // Canal de logs por servidor
  settings: new Map(), // Configuración por servidor
  adminRole: new Map(), // Rol autorizado para configurar automoderación
  infractions: new Map() // Rastrear infracciones progresivas por usuario
};

function loadStaffConfig() {
  try {
    if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
      const staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
      for (const [guildId, data] of Object.entries(staffData)) {
        if (data.ticketStaffRole) {
          client.ticketStaffRole.set(guildId, data.ticketStaffRole);
        }
        if (data.commandRoles) {
          client.commandRoles.set(guildId, data.commandRoles);
        }
        if (data.voiceSupportStaffRole) {
          client.voiceSupportStaffRole.set(guildId, data.voiceSupportStaffRole);
        }
        if (data.voiceSupportSanctionedRole) {
          client.voiceSupportSanctionedRole.set(guildId, data.voiceSupportSanctionedRole);
        }
        if (data.autoModAdminRole) {
          client.antiRaid.adminRole.set(guildId, data.autoModAdminRole);
        }
        if (data.autoModSettings) {
          client.antiRaid.settings.set(guildId, data.autoModSettings);
        }
      }
    }
  } catch (error) {
    console.error('Error cargando staff-roles.json:', error);
  }
}

function saveStaffConfig() {
  let staffData = {};
  try {
    if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
      staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
    }
  } catch (error) {
    console.error('Error leyendo staff-roles.json:', error);
  }

  const guildIds = new Set([
    ...Object.keys(staffData),
    ...client.commandRoles.keys(),
    ...client.ticketStaffRole.keys(),
    ...client.voiceSupportStaffRole.keys(),
    ...client.voiceSupportSanctionedRole.keys(),
    ...client.antiRaid.adminRole.keys(),
    ...client.antiRaid.settings.keys()
  ]);

  for (const guildId of guildIds) {
    if (!staffData[guildId]) {
      staffData[guildId] = {};
    }

    if (client.commandRoles.has(guildId)) {
      staffData[guildId].commandRoles = client.commandRoles.get(guildId);
    }

    if (client.ticketStaffRole.has(guildId)) {
      staffData[guildId].ticketStaffRole = client.ticketStaffRole.get(guildId);
    }

    if (client.voiceSupportStaffRole.has(guildId)) {
      staffData[guildId].voiceSupportStaffRole = client.voiceSupportStaffRole.get(guildId);
    }

    if (client.voiceSupportSanctionedRole.has(guildId)) {
      staffData[guildId].voiceSupportSanctionedRole = client.voiceSupportSanctionedRole.get(guildId);
    }

    if (client.antiRaid.adminRole.has(guildId)) {
      staffData[guildId].autoModAdminRole = client.antiRaid.adminRole.get(guildId);
    }

    if (client.antiRaid.settings.has(guildId)) {
      staffData[guildId].autoModSettings = client.antiRaid.settings.get(guildId);
    }
  }

  try {
    fs.writeFileSync(path.join(__dirname, 'config', 'staff-roles.json'), JSON.stringify(staffData, null, 2));
  } catch (error) {
    console.error('Error guardando staff-roles.json:', error);
  }
}

// Función para sancionar un usuario de soporte de voz
async function sanctionSupportUser(guild, userId, reason, sanctionedBy = null) {
  try {
    console.log(`[DEBUG] sanctionSupportUser llamado para usuario ${userId} en servidor ${guild.id}`);
    
    const member = await guild.members.fetch(userId).catch((err) => {
      console.error(`[DEBUG] Error obteniendo miembro ${userId}:`, err);
      return null;
    });
    if (!member) {
      console.log(`[DEBUG] No se pudo obtener el miembro ${userId}`);
      return false;
    }
    
    const sanctionedRoleId = client.voiceSupportSanctionedRole.get(guild.id);
    if (!sanctionedRoleId) {
      console.log(`[DEBUG] No hay rol de sancionado configurado para el servidor ${guild.id}`);
      return false;
    }
    
    const sanctionedRole = guild.roles.cache.get(sanctionedRoleId);
    if (!sanctionedRole) {
      console.log(`[DEBUG] No se encontró el rol de sancionado ${sanctionedRoleId}`);
      return false;
    }
    
    console.log(`[DEBUG] Asignando rol de sancionado a ${member.user.tag}...`);
    // Dar el rol de sancionado
    await member.roles.add(sanctionedRole);
    console.log(`[DEBUG] Rol asignado correctamente`);
    
    // Enviar MD al usuario - PRIORITARIO
    let mdSent = false;
    try {
      console.log(`[DEBUG] ===== INICIANDO ENVÍO DE MD =====`);
      console.log(`[DEBUG] Usuario: ${member.user.tag} (${member.user.id})`);
      console.log(`[DEBUG] Servidor: ${guild.name} (${guild.id})`);
      
      const motivoDetallado = `El canal de soporte de voz es exclusivamente para comunicación seria y asistencia a los miembros.\n\n⏱️ Entrar y salir antes de que pasen 3 minutos puede interrumpir al staff o a las personas que están ayudando, ya que a veces están coordinando el soporte para quienes esperan.\n\n💬 Esto no significa sanción automática, pero si la conducta se repite, se emitirá una advertencia.\n\n✅ Después de 3 minutos, los miembros pueden salir del canal sin problema.`;
      
      const dmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Has sido sancionado en Soporte de Voz')
        .setDescription(`Has sido sancionado en el sistema de soporte de voz del servidor **${guild.name}**\n\n**⚠️ IMPORTANTE:** Te has salido de la sala de espera antes de los 3 minutos permitidos.\n\n**Razón:** por unirse al soporte de voz y salirse antes de los 3 minutos. Esta regla está en reglas.`)
        .addFields(
          { name: '📋 Motivo detallado', value: motivoDetallado, inline: false },
          { name: '⏱️ Tiempo mínimo requerido', value: '3 minutos', inline: true },
          { name: '🔨 Acción tomada', value: 'Rol de sancionado asignado', inline: true }
        )
        .setColor(0xFF0000)
        .setFooter({ text: 'Si crees que esto es un error, contacta con un administrador' })
        .setTimestamp();
      
      if (sanctionedBy) {
        dmEmbed.addFields({ name: '👤 Sancionado por', value: `${sanctionedBy.user.tag}`, inline: false });
      }
      
      console.log(`[DEBUG] Intentando enviar MD a ${member.user.tag}...`);
      const dmMessage = await member.send({ embeds: [dmEmbed] });
      console.log(`[DEBUG] ✅ MD ENVIADO CORRECTAMENTE`);
      console.log(`[DEBUG] ID del mensaje: ${dmMessage.id}`);
      mdSent = true;
    } catch (error) {
      console.error('[DEBUG] ❌❌❌ ERROR ENVIANDO MD ❌❌❌');
      console.error('[DEBUG] Tipo de error:', error.constructor.name);
      console.error('[DEBUG] Mensaje de error:', error.message);
      console.error('[DEBUG] Código de error:', error.code);
      console.error('[DEBUG] Stack completo:', error.stack);
      
      // Si el error es porque el usuario tiene DMs bloqueados
      if (error.code === 50007) {
        console.log(`[DEBUG] El usuario tiene los mensajes directos bloqueados`);
      } else if (error.code === 50001) {
        console.log(`[DEBUG] No se puede acceder al usuario (posiblemente no está en el servidor)`);
      } else {
        console.log(`[DEBUG] Error desconocido al enviar MD`);
      }
      mdSent = false;
    }
    
    if (!mdSent) {
      console.log(`[DEBUG] ⚠️ ADVERTENCIA: No se pudo enviar el MD al usuario`);
    }
    
    // Registrar en el log de soporte de voz
    const supportLogChannel = findLogChannel(guild);
    if (supportLogChannel) {
      console.log(`[DEBUG] Enviando notificación al log de soporte...`);
      const supportLogEmbed = new EmbedBuilder()
        .setTitle('🔨 Usuario Sancionado en Soporte de Voz')
        .setDescription(`**Usuario:** ${member.user.tag} (${member})\n**Rol asignado:** ${sanctionedRole}`)
        .addFields(
          { name: '📋 Motivo', value: reason || 'No se especificó un motivo', inline: false }
        )
        .setColor(0xFF0000)
        .setTimestamp();
      
      if (sanctionedBy) {
        supportLogEmbed.addFields({ name: '👤 Sancionado por', value: `${sanctionedBy.user.tag}`, inline: false });
      }
      
      await supportLogChannel.send({ embeds: [supportLogEmbed] });
      console.log(`[DEBUG] Notificación enviada al log de soporte correctamente`);
    } else {
      console.log(`[DEBUG] No se encontró el canal de log de soporte`);
    }
    
    // Registrar en el log normal del servidor
    const normalLogChannelId = client.antiRaid.logChannel.get(guild.id);
    if (normalLogChannelId) {
      try {
        const normalLogChannel = guild.channels.cache.get(normalLogChannelId);
        if (normalLogChannel) {
          console.log(`[DEBUG] Enviando notificación al log normal...`);
          const normalLogEmbed = new EmbedBuilder()
            .setTitle('🔨 Usuario Sancionado en Soporte de Voz')
            .setDescription(`**Usuario:** ${member.user.tag} (${member})\n**Rol asignado:** ${sanctionedRole}`)
            .addFields(
              { name: '📋 Motivo', value: reason || 'No se especificó un motivo', inline: false },
              { name: '📍 Ubicación', value: 'Sistema de Soporte de Voz', inline: false }
            )
            .setColor(0xFF0000)
            .setTimestamp();
          
          if (sanctionedBy) {
            normalLogEmbed.addFields({ name: '👤 Sancionado por', value: `${sanctionedBy.user.tag}`, inline: false });
          }
          
          await normalLogChannel.send({ embeds: [normalLogEmbed] });
          console.log(`[DEBUG] Notificación enviada al log normal correctamente`);
        } else {
          console.log(`[DEBUG] No se pudo encontrar el canal de log normal con ID ${normalLogChannelId}`);
        }
      } catch (error) {
        console.error('[DEBUG] Error enviando al log normal:', error);
      }
    } else {
      console.log(`[DEBUG] No hay canal de log normal configurado para el servidor`);
    }
    
    // Remover de la cola y del tiempo de espera
    const queue = client.voiceSupportQueue.get(guild.id);
    if (queue) {
      const index = queue.indexOf(userId);
      if (index > -1) {
        queue.splice(index, 1);
        client.voiceSupportQueue.set(guild.id, queue);
      }
    }
    
    const waitingTimes = client.voiceSupportWaitingTime.get(guild.id);
    if (waitingTimes) {
      waitingTimes.delete(userId);
      client.voiceSupportWaitingTime.set(guild.id, waitingTimes);
    }
    
    // Eliminar mensaje de notificación
    if (client.voiceSupportQueueMessages && client.voiceSupportQueueMessages.has(guild.id)) {
      const queueMessages = client.voiceSupportQueueMessages.get(guild.id);
      queueMessages.delete(userId);
      client.voiceSupportQueueMessages.set(guild.id, queueMessages);
    }
    
    // Remover de advertencias enviadas
    const warningSent = client.voiceSupportWarningSent.get(guild.id);
    if (warningSent) {
      warningSent.delete(userId);
      client.voiceSupportWarningSent.set(guild.id, warningSent);
    }

    addSanctionRecord(guild.id, {
      userId: member.user.id,
      userTag: member.user.tag,
      moderatorId: sanctionedBy?.id || null,
      moderatorTag: sanctionedBy?.user?.tag || 'Sistema',
      reason: reason || 'No se especificó un motivo',
      timestamp: Date.now(),
      type: 'VOICE_SUPPORT'
    });
    
    console.log(`[DEBUG] Sanción completada exitosamente para ${userId}`);
    return true;
  } catch (error) {
    console.error('[DEBUG] Error en sanctionSupportUser:', error);
    console.error('[DEBUG] Stack trace:', error.stack);
    return false;
  }
}

let hasInitialized = false;

function onClientReady() {
  if (hasInitialized) return;
  hasInitialized = true;

  fs.writeFileSync('debug-ready.txt', `Bot listo a las ${new Date().toLocaleString()} como ${client.user.tag}`);
  console.log(`✅ Conectado como ${client.user.tag}`);
  console.log(`📊 Servidores detectados (${client.guilds.cache.size}): ${client.guilds.cache.map(g => g.name).join(', ')}`);
  console.log('🛡️ Sistema Anti-Raid activado');
  
  // Iniciar panel de administración
  startAdminPanel(client);
  
  // Cargar roles de staff y configuración de automod al iniciar
  loadStaffConfig();
}
client.once('ready', onClientReady);
client.once('clientReady', onClientReady);
  
  // Cargar configuración de tickets desde archivo JSON
  const ticketsConfig = loadTicketsConfig();
  console.log(`✅ Configuración de tickets cargada: ${Object.keys(ticketsConfig.guilds).length} servidores`);
  
  // Restaurar cambios de color automáticos al reiniciar el bot
  try {
    if (fs.existsSync(path.join(__dirname, 'config', 'color-roles.json'))) {
      const colorData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'color-roles.json'), 'utf8'));
      for (const [guildId, data] of Object.entries(colorData)) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          client.colorRoles.set(guildId, data.roleId);
          startColorRotation(guild, data.speed);
          console.log(`🎨 Cambio de color restaurado para servidor ${guild.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error restaurando roles de color:', error);
  }
  
  // Verificar cada 30 segundos para actualizar mensajes y verificar advertencias
  setInterval(async () => {
    for (const [guildId, waitingTimes] of client.voiceSupportWaitingTime) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      
      const waitingRoom = findWaitingRoom(guild);
      if (!waitingRoom) continue;
      
      // Inicializar Set de advertencias si no existe
      if (!client.voiceSupportWarningSent.has(guildId)) {
        client.voiceSupportWarningSent.set(guildId, new Set());
      }
      const warningSent = client.voiceSupportWarningSent.get(guildId);
      
      for (const [userId, entryTime] of waitingTimes) {
        const timeWaiting = Date.now() - entryTime;
        const oneMinute = 1 * 60 * 1000; // 1 minuto en milisegundos
        const threeMinutes = 3 * 60 * 1000; // 3 minutos en milisegundos
        
        // Verificar que el usuario aún esté en la sala de espera
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member || !member.voice.channel || member.voice.channel.id !== waitingRoom.id) {
          // Si ya no está en la sala de espera, remover de advertencias
          warningSent.delete(userId);
          continue;
        }
        
        // A los 1 minuto: enviar advertencia (si no se ha enviado ya)
        if (timeWaiting >= oneMinute && !warningSent.has(userId)) {
          try {
            const warningEmbed = new EmbedBuilder()
              .setTitle('⚠️ Advertencia - Soporte de Voz')
              .setDescription(`Has estado más de 1 minuto en la sala de espera sin dar señal de hablar o de hablar por mensaje.\n\n**Si te vas antes de 3 minutos, serás sancionado automáticamente.**\n\nPor favor, comunícate con el staff o envía un mensaje indicando que necesitas ayuda.`)
              .setColor(0xFFA500)
              .setTimestamp();
            
            await member.send({ embeds: [warningEmbed] });
            warningSent.add(userId);
            client.voiceSupportWarningSent.set(guildId, warningSent);
          } catch (error) {
            console.error('Error enviando advertencia:', error);
          }
        }
        
        // A los 3 minutos: el usuario puede irse sin sanción (no se mueve automáticamente)
        // Solo se actualiza el mensaje para mostrar el tiempo
        
        // Actualizar el mensaje de notificación con el tiempo transcurrido cada segundo
        // Se actualiza cada segundo para mostrar tiempo en tiempo real
        if (client.voiceSupportQueueMessages && client.voiceSupportQueueMessages.has(guildId)) {
          const queueMessages = client.voiceSupportQueueMessages.get(guildId);
          const messageId = queueMessages.get(userId);
          if (messageId) {
            try {
              const logChannel = findLogChannel(guild);
              if (logChannel) {
                const message = await logChannel.messages.fetch(messageId).catch(() => null);
                if (message) {
                  const minutesWaiting = Math.floor(timeWaiting / 60000);
                  const secondsWaiting = Math.floor((timeWaiting % 60000) / 1000);
                  const currentQueue = client.voiceSupportQueue.get(guildId) || [];
                  
                  // Formatear el tiempo: siempre mostrar minutos y segundos
                  let timeText = '';
                  if (minutesWaiting === 0) {
                    timeText = `${secondsWaiting} segundo(s)`;
                  } else if (secondsWaiting === 0) {
                    timeText = `${minutesWaiting} minuto(s)`;
                  } else {
                    timeText = `${minutesWaiting} minuto(s) y ${secondsWaiting} segundo(s)`;
                  }
                  
                  // Actualizar el mensaje con el tiempo transcurrido (se actualiza cada segundo)
                  const embed = new EmbedBuilder()
                    .setTitle('🔔 Nueva Solicitud de Soporte de Voz')
                    .setDescription(`**Usuario:** ${member.user.tag} (${member})\n**En espera:** ${currentQueue.length} usuario(s)\n**⏱️ Tiempo en espera:** ${timeText}`)
                    .setColor(0xFFA500)
                    .setTimestamp();
                  
                  await message.edit({ embeds: [embed] });
                }
              }
            } catch (error) {
              // Si no se puede actualizar, ignorar
              console.error('Error actualizando mensaje de espera:', error);
            }
          }
        }
      }
    }
  }, 1000); // Verificar cada segundo para actualizar tiempo en tiempo real

// Manejador de interacciones (slash commands)
client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'userfolder') {
      try {
        // Verificar permisos: administrador o gestionar servidor
        const member = interaction.member;
        const hasPerm = member?.permissions?.has && (member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator));
        if (!hasPerm) {
          return interaction.reply({ content: '❌ Necesitas permisos de administrador o "Gestionar el servidor" para usar este comando.', ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Generando carpeta y archivo con usuarios, espera un momento...', ephemeral: true });

        // Asegurarse de tener todos los miembros
        await interaction.guild.members.fetch();

        const members = Array.from(interaction.guild.members.cache.values());
        members.sort((a, b) => a.user.username.localeCompare(b.user.username, 'es'));
        const lines = members.map((m, i) => `${i + 1}. ${m.user.username} (ID: ${m.user.id})`);

        const folderName = 'user folder';
        const folderPath = path.join(__dirname, folderName);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${pad(now.getDate())}${pad(now.getMonth()+1)}${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const fileName = `users_${interaction.guild.id}_${ts}.txt`;
        const filePath = path.join(folderPath, fileName);
        const header = `LISTA DE USUARIOS DEL SERVIDOR: ${interaction.guild.name}\nTotal de usuarios: ${members.length}\nGenerado el: ${now.toLocaleString('es-ES')}\n--------------------------------------------------\n\n`;
        const fileContent = header + lines.join('\n');
        fs.writeFileSync(filePath, fileContent, 'utf8');

        try {
          const indexPath = path.join(folderPath, 'index_log.txt');
          const logLine = `${fileName} | ${interaction.guild.id} | ${interaction.guild.name} | ${members.length} | ${now.toLocaleString('es-ES')}\n`;
          fs.appendFileSync(indexPath, logLine, 'utf8');
        } catch (e) {
          console.error('Error escribiendo index_log (slash):', e);
        }

        return interaction.editReply({ content: `✅ Archivo creado: ${filePath}` });
      } catch (err) {
        console.error('Error creando user folder (slash):', err);
        try { return interaction.editReply({ content: '❌ Error creando la carpeta o el archivo. Revisa permisos.' }); } catch (e) { return; }
      }
    }

    // Comando /sugerencia
    if (interaction.commandName === 'sugerencia') {
      try {
        const suggestionText = interaction.options.getString('texto');
        
        // Cargar configuración de sugerencias
        const suggestionsConfigPath = path.join(__dirname, 'config', 'suggestions-config.json');
        let suggestionsConfig = { guilds: {} };
        if (fs.existsSync(suggestionsConfigPath)) {
          try { suggestionsConfig = JSON.parse(fs.readFileSync(suggestionsConfigPath, 'utf8')); } catch(e){}
        }
        if (!suggestionsConfig.guilds[interaction.guild.id]) {
          suggestionsConfig.guilds[interaction.guild.id] = { suggestionsChannelId: '', suggestions: [] };
        }

        // Auto-crear canal de sugerencias si no existe
        let suggestionsChannel = null;
        const existingChannelId = suggestionsConfig.guilds[interaction.guild.id].suggestionsChannelId;
        
        if (existingChannelId) {
          suggestionsChannel = interaction.guild.channels.cache.get(existingChannelId);
        }
        
        if (!suggestionsChannel) {
          try {
            console.log('📝 Creando canal de sugerencias automáticamente...');
            suggestionsChannel = await interaction.guild.channels.create({
              name: '╰📝 ・sugerencias',
              type: ChannelType.GuildText,
              permissionOverwrites: [
                {
                  id: interaction.guild.id,
                  deny: [PermissionsBitField.Flags.SendMessages],
                  allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
                }
              ],
              reason: 'Canal automático para sugerencias'
            });
            
            suggestionsConfig.guilds[interaction.guild.id].suggestionsChannelId = suggestionsChannel.id;
            console.log(`✅ Canal de sugerencias creado: ${suggestionsChannel.name}`);
          } catch (e) {
            console.error('Error creando canal de sugerencias:', e);
          }
        }

        // Crear objeto de sugerencia
        const suggestion = {
          id: Date.now(),
          userId: interaction.user.id,
          username: interaction.user.username,
          userTag: interaction.user.tag,
          userAvatar: interaction.user.displayAvatarURL(),
          text: suggestionText,
          status: 'pending',
          createdAt: new Date().toISOString(),
          approvedAt: null,
          approvedBy: null,
          comments: [],
          reactions: { thumbsUp: 0, thumbsDown: 0 }
        };

        // Guardar sugerencia
        suggestionsConfig.guilds[interaction.guild.id].suggestions.push(suggestion);
        fs.writeFileSync(suggestionsConfigPath, JSON.stringify(suggestionsConfig, null, 2));

        // Publicar la sugerencia en el canal de sugerencias (si existe) y guardar messageId
        if (suggestionsChannel) {
          try {
            const postEmbed = new EmbedBuilder()
              .setTitle('🆕 Nueva Sugerencia')
              .setDescription(suggestion.text)
              .setAuthor({ name: suggestion.userTag, iconURL: suggestion.userAvatar })
              .setFooter({ text: `ID: ${suggestion.id}` })
              .setColor(0x5865F2)
              .setTimestamp(new Date(suggestion.createdAt));

            const sent = await suggestionsChannel.send({ embeds: [postEmbed] });
            try { await sent.react('👍'); await sent.react('👎'); } catch (e) { /* ignore reaction errors */ }

            // Guardar messageId para referencia
            suggestion.messageId = sent.id;
            fs.writeFileSync(suggestionsConfigPath, JSON.stringify(suggestionsConfig, null, 2));
          } catch (e) {
            console.error('Error publicando sugerencia en canal:', e);
          }
        }

        // Responder al usuario
        const embed = new EmbedBuilder()
          .setTitle('✅ Sugerencia Enviada')
          .setDescription(`Tu sugerencia ha sido registrada y será revisada por el staff.\n\n**Tu sugerencia:**\n${suggestionText}`)
          .setColor(0x00FF00)
          .setFooter({ text: `ID: ${suggestion.id}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        console.log(`📝 Nueva sugerencia de ${interaction.user.tag}: ${suggestionText}`);
      } catch (err) {
        console.error('Error con comando /sugerencia:', err);
        await interaction.reply({ content: '❌ Error al enviar la sugerencia.', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('Error manejando interactionCreate:', err);
  }
});

// ===== FUNCIONES ANTI-RAID =====

// Función para enviar logs de seguridad
async function sendSecurityLog(guild, embed, htmlPath = null, pdfPath = null, customLogChannelId = null) {
  const logChannelId = customLogChannelId || client.antiRaid.logChannel.get(guild.id);
  console.log(`🔍 Debug - Guild ID: ${guild.id}, Log Channel ID: ${logChannelId}`);

  if (!logChannelId) {
    console.log('❌ No hay canal de logs configurado para este servidor');
    return;
  }

  // Intentar obtener el canal (cache o fetch)
  let logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) {
    logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
  }

  console.log(`🔍 Debug - Canal de logs encontrado: ${logChannel ? 'Sí' : 'No'}`);

  if (!logChannel) {
    console.warn(`❌ Canal de logs ${logChannelId} no existe en ${guild.name} (${guild.id}).`);
    return;
  }

  // Verificar permisos antes de intentar enviar
  const me = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
  if (!me) {
    console.warn('❌ No pude obtener la identidad del bot en el servidor.');
    return;
  }

  const perms = me.permissionsIn(logChannel);
  if (!perms || !perms.has(PermissionsBitField.Flags.ViewChannel) || !perms.has(PermissionsBitField.Flags.SendMessages)) {
    console.warn(`❌ Sin permisos para enviar en el canal ${logChannel.id} de ${guild.name}. Permisos necesarios: VIEW_CHANNEL, SEND_MESSAGES`);
    return;
  }

  try {
    const messageOptions = { embeds: [embed] };
    const files = [];

    if (htmlPath && fs.existsSync(htmlPath)) {
      files.push({ attachment: htmlPath, name: path.basename(htmlPath) });
    }
    if (pdfPath && fs.existsSync(pdfPath)) {
      files.push({ attachment: pdfPath, name: path.basename(pdfPath) });
    }

    if (files.length > 0) messageOptions.files = files;

    const sentMessage = await logChannel.send(messageOptions);
    console.log(`✅ Debug - Mensaje enviado exitosamente al canal de logs: ${sentMessage.id}`);
  } catch (error) {
    console.error('❌ Error enviando log de seguridad:', error);
  }
}

// Verificar si un usuario está en la whitelist
function isWhitelisted(guildId, userId) {
  const whitelist = client.antiRaid.whitelist.get(guildId) || [];
  return whitelist.includes(userId);
}

// Obtener configuración anti-raid del servidor
function getAntiRaidSettings(guildId) {
  return client.antiRaid.settings.get(guildId) || {
    antiSpam: true,
    maxMessages: 5,
    timeWindow: 5000, // 5 segundos
    antiChannelSpam: true,
    maxChannelActions: 3,
    channelTimeWindow: 60000, // 1 minuto
    antiLinks: true,
    antiBots: true
  };
}

function canManageAutoMod(member, guild) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const adminRoleId = client.antiRaid.adminRole.get(guild.id);
  return adminRoleId ? member.roles.cache.has(adminRoleId) : false;
}

// ===== FUNCIONES AUXILIARES PARA SOPORTE DE VOZ =====
// Funciones auxiliares para buscar canales de soporte de voz
function isWaitingRoom(channel) {
  if (!channel || channel.type !== ChannelType.GuildVoice) return false;
  const name = channel.name.toLowerCase();
  return name.includes('espera') || name.includes('waiting') || name.includes('sala-de-espera');
}

function isSupportChannel(channel) {
  if (!channel || channel.type !== ChannelType.GuildVoice) return false;
  const name = channel.name.toLowerCase();
  return (name.includes('soporte') || name.includes('support')) && !isWaitingRoom(channel);
}

function findWaitingRoom(guild) {
  return guild.channels.cache.find(ch => isWaitingRoom(ch));
}

function findSupportChannels(guild) {
  return guild.channels.cache.filter(ch => isSupportChannel(ch));
}

function findLogChannel(guild) {
  return guild.channels.cache.find(ch => 
    ch.type === ChannelType.GuildText && 
    (ch.name.toLowerCase().includes('soporte-log') || 
     ch.name.toLowerCase().includes('support-log') ||
     ch.name.toLowerCase().includes('log-de-voz'))
  );
}

function getLogChannelByGuild(guild) {
  const logChannelId = client.antiRaid.logChannel.get(guild.id);
  if (!logChannelId) return null;
  return guild.channels.cache.get(logChannelId) || null;
}

// NUEVO: Registrar actividad persistente para el panel web
async function logBotActivity(guildId, type, message) {
  const activityPath = path.join(__dirname, 'config', 'bot-activity.json');
  let activity = [];
  try {
    if (fs.existsSync(activityPath)) {
      activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
    }
  } catch (e) {}

  activity.unshift({
    guildId,
    type,
    message,
    timestamp: new Date().toISOString()
  });

  // Mantener solo los últimos 50
  if (activity.length > 50) activity = activity.slice(0, 50);

  try {
    fs.writeFileSync(activityPath, JSON.stringify(activity, null, 2), 'utf8');
  } catch (e) {}
}

async function sendLogEmbed(guild, embed, eventType = null) {
  try {
    // Registrar en actividad reciente
    await logBotActivity(guild.id, eventType || 'INFO', embed.data.title || embed.data.description || 'Evento sin descripción');
    // Cargar config granular si existe
    const logsConfigPath = path.join(__dirname, 'config', 'logs-config.json');
    let granularConfig = null;
    
    if (eventType && fs.existsSync(logsConfigPath)) {
      try {
        const allConfig = JSON.parse(fs.readFileSync(logsConfigPath, 'utf8'));
        granularConfig = allConfig[guild.id]?.[eventType];
        console.log(`[DEBUG LOG] Guild: ${guild.name}, Event: ${eventType}, Enabled: ${granularConfig?.enabled}, Channel: ${granularConfig?.channel}`);
      } catch (e) {
        console.error('Error leyendo config de logs:', e);
      }
    }

    let targetChannel = null;
    
    // Si hay config granular y está activa, usar esa
    if (granularConfig && granularConfig.enabled && granularConfig.channel) {
      targetChannel = guild.channels.cache.get(granularConfig.channel);
      if (!targetChannel) {
        targetChannel = await guild.channels.fetch(granularConfig.channel).catch(() => null);
      }
      if (granularConfig.color) {
        try { 
          const colorHex = granularConfig.color.startsWith('#') ? granularConfig.color : `#${granularConfig.color}`;
          embed.setColor(colorHex); 
        } catch (e) {}
      }
    } 
    
    // Si no hay granular o falló el canal, probar el general
    if (!targetChannel) {
      targetChannel = getLogChannelByGuild(guild);
    }
    if (!targetChannel) {
      console.warn(`[LOGS] No se pudo encontrar canal de destino para evento ${eventType} en ${guild.name}`);
      return;
    }

    // Asegurarse que el canal existe y el bot tiene permisos
    if (!targetChannel.id) {
      console.warn(`[LOGS] Canal objetivo inválido para ${guild.name}`);
      return;
    }

    let resolvedChannel = guild.channels.cache.get(targetChannel.id) || targetChannel;
    if (!resolvedChannel) {
      resolvedChannel = await guild.channels.fetch(targetChannel.id).catch(() => null);
    }
    if (!resolvedChannel) {
      console.warn(`[LOGS] Canal ${targetChannel.id} no existe en ${guild.name}`);
      return;
    }

    const me = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
    if (!me) {
      console.warn('❌ No pude obtener la identidad del bot en el servidor.');
      return;
    }

    const perms = me.permissionsIn(resolvedChannel);
    if (!perms || !perms.has(PermissionsBitField.Flags.ViewChannel) || !perms.has(PermissionsBitField.Flags.SendMessages)) {
      console.warn(`❌ Sin permisos para enviar en el canal ${resolvedChannel.id} de ${guild.name}`);
      return;
    }

    await resolvedChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`❌ Error enviando log [${eventType || 'general'}]:`, error);
  }
}


// Función para obtener el canal de logs de un servidor
function getLogChannelByGuild(guild) {
  // 1. Intentar obtener el canal configurado explícitamente
  const channelId = client.antiRaid.logChannel.get(guild.id);
  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (channel) return channel;
  }

  // 2. Fallback: Buscar por nombre en el servidor
  const logNames = ['logs', 'bot-logs', 'registro', 'bitacora', 'audit-log'];
  const fallbackChannel = guild.channels.cache.find(ch => 
    ch.type === ChannelType.GuildText && 
    logNames.some(name => ch.name.toLowerCase().includes(name))
  );
  
  if (fallbackChannel) return fallbackChannel;

  // 3. Si no hay nada, retornar null
  return null;
}

// Función para verificar si un miembro tiene permisos de staff de soporte de voz
function hasSupportStaffRole(member, guild) {
  // Obtener el rol principal configurado
  const mainStaffRoleId = client.voiceSupportStaffRole.get(guild.id);
  if (mainStaffRoleId && member.roles.cache.has(mainStaffRoleId)) {
    return true;
  }
  
  // Verificar si tiene permisos en los canales de soporte (para roles adicionales)
  const supportChannels = findSupportChannels(guild);
  for (const [channelId, channel] of supportChannels) {
    const permissions = channel.permissionOverwrites.cache;
    for (const [overwriteId, overwrite] of permissions) {
      // Verificar si es un rol y el miembro lo tiene
      const role = guild.roles.cache.get(overwriteId);
      if (role && member.roles.cache.has(role.id)) {
        // Verificar si tiene permisos de Connect
        if (overwrite.allow.has(PermissionsBitField.Flags.Connect)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// ===== EVENTOS ANTI-RAID =====

// Sistema de cooldown para !juegos
if (!client.juegosCooldowns) {
  client.juegosCooldowns = new Map();
}

// Sistema de memes ya enviados (para no repetir)
if (!client.memesEnviados) {
  client.memesEnviados = new Map(); // {guildId: Set(memeUrls)}
}

// Anti-Spam de mensajes
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  // ===== SISTEMA DE AUTO-RESPUESTAS =====
  try {
    const arPath = path.join(__dirname, 'config', 'auto-responses.json');
    if (fs.existsSync(arPath)) {
      const arConfig = JSON.parse(fs.readFileSync(arPath, 'utf8'));
      const guildResponses = arConfig.guilds?.[message.guild.id];
      if (guildResponses && Array.isArray(guildResponses) && guildResponses.length > 0) {
        // Alerta si el contenido del mensaje viene vacío (típico cuando falta el Message Content Intent en el Dev Portal)
        if (!message.content || message.content.trim() === '') {
          console.warn(`[AUTO-RESPUESTAS] Advertencia: Se detectó un mensaje sin contenido en el servidor "${message.guild.name}" (ID: ${message.guild.id}). Si el bot tiene auto-respuestas configuradas, asegúrate de activar el "MESSAGE CONTENT INTENT" en la sección "Bot" de Discord Developer Portal (https://discord.com/developers/applications).`);
        }

        for (const ar of guildResponses) {
          if (!ar.enabled || !ar.trigger) continue;
          
          // Verificar canales habilitados/deshabilitados
          if (ar.enabledChannels && ar.enabledChannels.length > 0 && !ar.enabledChannels.includes(message.channel.id)) continue;
          if (ar.disabledChannels && ar.disabledChannels.length > 0 && ar.disabledChannels.includes(message.channel.id)) continue;
          
          // Verificar roles habilitados/deshabilitados (evitando errores si message.member es null)
          if (ar.enabledRoles && ar.enabledRoles.length > 0) {
            if (!message.member || !message.member.roles || !ar.enabledRoles.some(rId => message.member.roles.cache.has(rId))) continue;
          }
          if (ar.disabledRoles && ar.disabledRoles.length > 0) {
            if (message.member && message.member.roles && ar.disabledRoles.some(rId => message.member.roles.cache.has(rId))) continue;
          }
          
          // Verificar trigger (con trim y prevención de valores vacíos)
          const msgLower = (message.content || '').trim().toLowerCase();
          const triggerLower = ar.trigger.trim().toLowerCase();
          let matches = false;
          if (ar.wildcard) {
            matches = msgLower.includes(triggerLower);
          } else {
            matches = msgLower === triggerLower;
          }
          
          if (matches) {
            console.log(`[AUTO-RESPUESTAS] Coincidencia encontrada para el disparador "${ar.trigger}" en el servidor "${message.guild.name}". Enviando respuesta...`);
            
            // Elegir respuesta (aleatoria si hay varias)
            let responseText = ar.response || '';
            if (ar.randomResponses && ar.randomResponses.length > 0) {
              const allResponses = responseText ? [responseText, ...ar.randomResponses] : ar.randomResponses;
              responseText = allResponses[Math.floor(Math.random() * allResponses.length)];
            }
            
            // Reemplazar variables helper
            const replaceVars = (str) => {
              if (!str) return '';
              return str
                .replace(/\{user\}/g, `<@${message.author.id}>`)
                .replace(/\{username\}/g, message.author.username)
                .replace(/\{server\}/g, message.guild.name);
            };

            responseText = replaceVars(responseText);

            if (ar.type === 'embed') {
              const { EmbedBuilder } = require('discord.js');
              const embed = new EmbedBuilder();
              
              const embedTitle = replaceVars(ar.embedTitle);
              const embedDesc = replaceVars(ar.embedDesc || responseText);
              const embedColor = ar.embedColor || '#5865F2';
              const embedThumbnail = ar.embedThumbnail;
              const embedImage = ar.embedImage;
              const embedFooter = replaceVars(ar.embedFooter);

              if (embedTitle) embed.setTitle(embedTitle);
              if (embedDesc) embed.setDescription(embedDesc);
              if (embedColor) {
                try {
                  embed.setColor(embedColor);
                } catch(e) {
                  embed.setColor('#5865F2');
                }
              }
              if (embedThumbnail && (embedThumbnail.startsWith('http://') || embedThumbnail.startsWith('https://'))) {
                embed.setThumbnail(embedThumbnail);
              }
              if (embedImage && (embedImage.startsWith('http://') || embedImage.startsWith('https://'))) {
                embed.setImage(embedImage);
              }
              if (embedFooter) embed.setFooter({ text: embedFooter });

              const sendOptions = { 
                embeds: [embed],
                allowedMentions: { repliedUser: ar.replyPing !== false }
              };
              if (ar.reply) {
                try {
                  await message.reply(sendOptions);
                } catch (replyError) {
                  console.error('[AUTO-RESPUESTAS] Error al responder (embed), enviando mensaje en canal:', replyError);
                  await message.channel.send({ embeds: [embed] });
                }
              } else {
                await message.channel.send({ embeds: [embed] });
              }
            } else {
              // Enviar respuesta normal de texto
              if (ar.reply) {
                try {
                  await message.reply({
                    content: responseText,
                    allowedMentions: { repliedUser: ar.replyPing !== false }
                  });
                } catch (replyError) {
                  console.error('[AUTO-RESPUESTAS] Error al responder (texto), enviando mensaje en canal:', replyError);
                  await message.channel.send(responseText);
                }
              } else {
                await message.channel.send(responseText);
              }
            }
            break; // Solo una auto-respuesta por mensaje
          }
        }
      }
    }
  } catch (arError) {
    console.error('[AUTO-RESPUESTAS] Error:', arError);
  }

  // Cierre rápido de ticket por texto en canales de ticket
  try {
    const cleanContent = (message.content || '').trim().toLowerCase().replace(/[.!?]+$/, '');
    if (isTicketChannel(message.channel) && /^(ticket|tika)\s+(cerrar|close)$/.test(cleanContent)) {
      if (hasStaffPermission(message.member, message.guild)) {
        await closeTicketChannel(message.channel, message.member, async (replyOptions) => {
          const safeOptions = { content: replyOptions.content, embeds: replyOptions.embeds };
          await message.reply(safeOptions);
        });
        return;
      }
    }
  } catch (closeError) {
    console.error('Error en cierre rápido de ticket:', closeError);
  }

  // COMANDO: !userfolder (prefijo) - Genera archivo TXT con la lista de usuarios
  if (message.content.toLowerCase().startsWith('!userfolder')) {
    try {
      // Verificar permisos: administrador o gestionar servidor
      const member = message.member;
      const hasPerm = member?.permissions?.has && (member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator));
      if (!hasPerm) {
        return message.reply({ content: '❌ Necesitas permisos de administrador o "Gestionar el servidor" para usar este comando.' });
      }

      const replyMsg = await message.reply('⏳ Generando carpeta y archivo con usuarios, espera un momento...');

      // Asegurarse de tener todos los miembros
      await message.guild.members.fetch();

      const members = Array.from(message.guild.members.cache.values());
      members.sort((a, b) => a.user.username.localeCompare(b.user.username, 'es'));
      const lines = members.map((m, i) => `${i + 1}. ${m.user.username} (ID: ${m.user.id})`);

      const folderName = 'user folder';
      const folderPath = path.join(__dirname, folderName);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const ts = `${pad(now.getDate())}${pad(now.getMonth()+1)}${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `users_${message.guild.id}_${ts}.txt`;
      const filePath = path.join(folderPath, fileName);
      const header = `LISTA DE USUARIOS DEL SERVIDOR: ${message.guild.name}\nTotal de usuarios: ${members.length}\nGenerado el: ${now.toLocaleString('es-ES')}\n--------------------------------------------------\n\n`;
      const fileContent = header + lines.join('\n');
      fs.writeFileSync(filePath, fileContent, 'utf8');

      try {
        const indexPath = path.join(folderPath, 'index_log.txt');
        const logLine = `${fileName} | ${message.guild.id} | ${message.guild.name} | ${members.length} | ${now.toLocaleString('es-ES')}\n`;
        fs.appendFileSync(indexPath, logLine, 'utf8');
      } catch (e) {
        console.error('Error escribiendo index_log (prefijo):', e);
      }

      try {
        await message.channel.send({ content: `✅ Archivo creado: ${filePath}`, files: [filePath] });
      } catch (errSend) {
        // Si no puede enviar el archivo, avisar con la ruta
        await replyMsg.edit(`✅ Archivo creado: ${filePath}`);
      }

      return;
    } catch (err) {
      console.error('Error creando user folder (prefijo):', err);
      try { return message.reply({ content: '❌ Error creando la carpeta o el archivo. Revisa permisos.' }); } catch (e) { return; }
    }
  }

  // COMANDO: !sanciones - Ver sanciones registradas
  if (message.content.toLowerCase().startsWith('!sanciones')) {
    const member = message.member;
    const hasPerm = member?.permissions?.has && (member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator));
    if (!hasPerm) {
      return message.reply({ content: '❌ Necesitas permisos de administrador o "Gestionar el servidor" para ver el historial de sanciones.' });
    }

    const mentionMatch = message.content.match(/<@!?(\d+)>/);
    const userId = mentionMatch ? mentionMatch[1] : null;
    const records = getSanctionRecords(message.guild.id, userId);

    if (!records || records.length === 0) {
      return message.reply({ content: userId ? '❌ No se encontraron sanciones para ese usuario.' : '❌ No hay sanciones registradas en este servidor.' });
    }

    const lines = records.slice(-20).map((record, index) => {
      const date = new Date(record.timestamp).toLocaleString('es-ES');
      return `${index + 1}. [${date}] ${record.userTag} (${record.userId}) sancionado por ${record.moderatorTag || 'Sistema'} - ${record.reason}`;
    });

    if (lines.join('\n').length > 1800) {
      if (!fs.existsSync(sanctionsFolderPath)) fs.mkdirSync(sanctionsFolderPath, { recursive: true });
      const outputPath = path.join(sanctionsFolderPath, `sanciones_${message.guild.id}_${Date.now()}.txt`);
      fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
      try {
        await message.reply({ content: `✅ Historial de sanciones generado.`, files: [outputPath] });
      } catch (sendErr) {
        await message.reply({ content: `✅ Historial de sanciones generado en archivo: ${outputPath}` });
      }
    } else {
      await message.reply(lines.join('\n'));
    }
    return;
  }

  // COMANDO: !ban - Banear usuario de la sala de voz (solo propietario)
  if (message.content.toLowerCase().startsWith('!ban ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede banear usuarios.');
    }
    
    const content = message.content.slice(5).trim();
    const userIdMatch = content.match(/<@!?(\d+)>/);
    
    if (!userIdMatch) {
      return message.reply('❌ Debes mencionar al usuario. Ejemplo: !ban @usuario');
    }
    
    const targetUserId = userIdMatch[1];
    
    try {
      const targetMember = await message.guild.members.fetch(targetUserId);
      
      if (voiceChannel.members.has(targetMember.id)) {
        await targetMember.voice.disconnect('Baneado de la sala por el propietario');
      }
      
      if (!client.tempVoiceChannelBannedUsers.has(voiceChannel.id)) {
        client.tempVoiceChannelBannedUsers.set(voiceChannel.id, new Set());
      }
      const bannedUsers = client.tempVoiceChannelBannedUsers.get(voiceChannel.id);
      bannedUsers.add(targetMember.id);
      
      await voiceChannel.permissionOverwrites.edit(targetMember.id, {
        Connect: false,
        ManageChannels: null
      });
      
      return message.reply(`🚫 **${targetMember.user.tag}** ha sido baneado de esta sala. No podrá volver a entrar.`);
    } catch (e) {
      console.error('Error en !ban:', e);
      return message.reply('❌ No pude banear al usuario.');
    }
  }

  // COMANDO: !unban - Desbanear usuario de la sala de voz (solo propietario)
  if (message.content.toLowerCase().startsWith('!unban ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede desbanear usuarios.');
    }
    
    const content = message.content.slice(7).trim();
    const userIdMatch = content.match(/<@!?(\d+)>/);
    
    if (!userIdMatch) {
      return message.reply('❌ Debes mencionar al usuario. Ejemplo: !unban @usuario');
    }
    
    const targetUserId = userIdMatch[1];
    
    try {
      const targetMember = await message.guild.members.fetch(targetUserId);
      
      const bannedUsers = client.tempVoiceChannelBannedUsers.get(voiceChannel.id);
      if (bannedUsers && bannedUsers.has(targetMember.id)) {
        bannedUsers.delete(targetMember.id);
      }
      
      await voiceChannel.permissionOverwrites.edit(targetMember.id, {
        Connect: null,
        ManageChannels: null
      });
      
      return message.reply(`✅ **${targetMember.user.tag}** ha sido desbaneado de esta sala. Ahora puede volver a entrar.`);
    } catch (e) {
      console.error('Error en !unban:', e);
      return message.reply('❌ No pude desbanear al usuario.');
    }
  }

  // COMANDO: !nombre - Cambiar nombre de la sala
  if (message.content.toLowerCase().startsWith('!nombre ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede cambiar el nombre.');
    }
    
    const newName = message.content.slice(8).trim();
    if (!newName) {
      return message.reply('❌ Debes escribir un nombre. Ejemplo: !nombre Mi Sala');
    }
    
    try {
      await voiceChannel.setName(newName);
      return message.reply(`✅ Nombre de la sala cambiado a **${newName}**.`);
    } catch (e) {
      console.error('Error en !nombre:', e);
      return message.reply('❌ No pude cambiar el nombre de la sala.');
    }
  }

  // COMANDO: !limite - Establecer límite de usuarios
  if (message.content.toLowerCase().startsWith('!limite ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede establecer el límite.');
    }
    
    const limit = message.content.slice(8).trim();
    const value = parseInt(limit, 10);
    
    if (isNaN(value) || value < 0 || value > 99) {
      return message.reply('❌ Introduce un número válido entre 0 y 99. Ejemplo: !limite 5');
    }
    
    try {
      await voiceChannel.setUserLimit(value);
      return message.reply(value === 0 ? '✅ Límite eliminado (ilimitado).' : `✅ Límite establecido en **${value}** usuarios.`);
    } catch (e) {
      console.error('Error en !limite:', e);
      return message.reply('❌ No pude establecer el límite.');
    }
  }

  // COMANDO: !expulsar - Expulsar usuario de la sala
  if (message.content.toLowerCase().startsWith('!expulsar ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede expulsar usuarios.');
    }
    
    const content = message.content.slice(10).trim();
    const userIdMatch = content.match(/<@!?(\d+)>/);
    
    if (!userIdMatch) {
      return message.reply('❌ Debes mencionar al usuario. Ejemplo: !expulsar @usuario');
    }
    
    const targetUserId = userIdMatch[1];
    
    try {
      const targetMember = await message.guild.members.fetch(targetUserId);
      if (!voiceChannel.members.has(targetMember.id)) {
        return message.reply('❌ Ese usuario no está en tu sala.');
      }
      await targetMember.voice.disconnect('Expulsado por el dueño de la sala');
      return message.reply(`✅ Usuario **${targetMember.user.tag}** expulsado.`);
    } catch (e) {
      console.error('Error en !expulsar:', e);
      return message.reply('❌ No pude expulsar al usuario.');
    }
  }

  // COMANDO: !privacidad - Hacer la sala privada o pública
  if (message.content.toLowerCase().startsWith('!privacidad ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede cambiar la privacidad.');
    }
    
    const option = message.content.slice(12).trim().toLowerCase();
    const everyone = message.guild.roles.everyone;
    
    try {
      if (option === 'privado' || option === 'on') {
        await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false });
        return message.reply('🔒 La sala ahora es **Privada**.');
      } else if (option === 'publico' || option === 'público' || option === 'off') {
        await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null });
        return message.reply('🔓 La sala ahora es **Pública**.');
      } else {
        return message.reply('❌ Usa: !privacidad privado o !privacidad público');
      }
    } catch (e) {
      console.error('Error en !privacidad:', e);
      return message.reply('❌ No pude cambiar la privacidad.');
    }
  }

  // COMANDO: !invitar - Crear invitación a la sala
  if (message.content.toLowerCase() === '!invitar') {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede crear invitaciones.');
    }
    
    try {
      const invite = await voiceChannel.createInvite({ maxAge: 600, maxUses: 5, reason: 'Invitación temporal a sala privada' });
      return message.reply(`📨 Invitación creada: ${invite.url}`);
    } catch (e) {
      console.error('Error en !invitar:', e);
      return message.reply('❌ No pude crear la invitación.');
    }
  }

  // COMANDO: !claim - Reivindicar la sala si el propietario se fue
  if (message.content.toLowerCase() === '!claim') {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    const ownerStillHere = ownerId ? voiceChannel.members.has(ownerId) : false;
    
    if (ownerStillHere && ownerId !== member.id) {
      return message.reply('❌ El propietario todavía está en la sala. No puedes reclamar aún.');
    }
    
    try {
      const previousOwnerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (previousOwnerId && previousOwnerId !== member.id) {
        await voiceChannel.permissionOverwrites.edit(previousOwnerId, { ManageChannels: null }).catch(() => null);
      }
      
      await voiceChannel.permissionOverwrites.edit(member.id, {
        ManageChannels: true,
        Connect: true,
        Speak: true
      });
      client.tempVoiceChannelOwners.set(voiceChannel.id, member.id);
      
      return message.reply('✅ Ahora tienes control de la sala.');
    } catch (e) {
      console.error('Error en !claim:', e);
      return message.reply('❌ No pude reclamar la sala.');
    }
  }

  // COMANDO: !transferir - Transferir la sala a otro usuario
  if (message.content.toLowerCase().startsWith('!transferir ')) {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede transferir la propiedad.');
    }
    
    const content = message.content.slice(12).trim();
    const userIdMatch = content.match(/<@!?(\d+)>/);
    
    if (!userIdMatch) {
      return message.reply('❌ Debes mencionar al usuario. Ejemplo: !transferir @usuario');
    }
    
    const targetUserId = userIdMatch[1];
    
    try {
      const targetMember = await message.guild.members.fetch(targetUserId);
      
      const previousOwnerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (previousOwnerId) {
        await voiceChannel.permissionOverwrites.edit(previousOwnerId, { ManageChannels: null }).catch(() => null);
      }
      
      await voiceChannel.permissionOverwrites.edit(targetMember.id, {
        ManageChannels: true,
        Connect: true,
        Speak: true
      });
      client.tempVoiceChannelOwners.set(voiceChannel.id, targetMember.id);
      
      return message.reply(`✅ Transferido el control de la sala a **${targetMember.user.tag}**.`);
    } catch (e) {
      console.error('Error en !transferir:', e);
      return message.reply('❌ No pude transferir la sala.');
    }
  }

  // COMANDO: !eliminar - Eliminar la sala
  if (message.content.toLowerCase() === '!eliminar') {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    if (ownerId !== member.id) {
      return message.reply('❌ No eres el propietario de esta sala. Solo el líder puede eliminarla.');
    }
    
    try {
      const channelName = voiceChannel.name;
      client.tempVoiceChannels.delete(voiceChannel.id);
      client.tempVoiceChannelOwners.delete(voiceChannel.id);
      client.tempVoiceChannelBannedUsers.delete(voiceChannel.id);
      await voiceChannel.delete('Eliminada desde comando');
      return message.reply(`✅ Sala **${channelName}** eliminada.`);
    } catch (e) {
      console.error('Error en !eliminar:', e);
      return message.reply('❌ No pude eliminar la sala.');
    }
  }

  // COMANDO: !info - Mostrar información de la sala
  if (message.content.toLowerCase() === '!info') {
    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      return message.reply('❌ Debes estar en una sala de voz para usar este comando.');
    }
    
    const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
    const owner = ownerId ? await message.guild.members.fetch(ownerId).catch(() => null) : null;
    const members = [...voiceChannel.members.values()];
    const bannedUsers = client.tempVoiceChannelBannedUsers.get(voiceChannel.id);
    
    const embed = new EmbedBuilder()
      .setTitle(`📋 Info: ${voiceChannel.name}`)
      .addFields(
        { name: '👑 Propietario', value: owner ? owner.user.tag : 'Sin propietario', inline: true },
        { name: '👥 Usuarios', value: `${members.length}`, inline: true },
        { name: '🔒 Privacidad', value: voiceChannel.permissionOverwrites.cache.get(message.guild.roles.everyone.id)?.deny?.has(PermissionsBitField.Flags.Connect) ? 'Privada' : 'Pública', inline: true },
        { name: '🎚️ Límite', value: voiceChannel.userLimit || 'Ilimitado', inline: true },
        { name: '🚫 Baneados', value: bannedUsers && bannedUsers.size > 0 ? `${bannedUsers.size}` : '0', inline: true }
      )
      .setColor(0x00FFAA)
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }
  
  // ===== COMANDO !juegos - MENÚ DE JUEGOS CON BOTONES =====
  if (message.content.toLowerCase() === '!juegos') {
    // Verificar cooldown (30 segundos)
    const cooldownTime = 30000; // 30 segundos
    const userCooldownKey = `${message.guild.id}-${message.author.id}`;
    
    if (client.juegosCooldowns.has(userCooldownKey)) {
      const expirationTime = client.juegosCooldowns.get(userCooldownKey) + cooldownTime;
      
      if (Date.now() < expirationTime) {
        const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
        return message.reply({ 
          content: `⏰ Espera **${timeLeft} segundos** antes de usar \`!juegos\` de nuevo.`,
          ephemeral: true 
        }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        }).catch(() => {});
      }
    }
    
    // Establecer cooldown
    client.juegosCooldowns.set(userCooldownKey, Date.now());
    
    // Crear embed principal
    const juegosEmbed = new EmbedBuilder()
      .setTitle('🎮 MENÚ DE COMANDOS DE JUEGOS')
      .setDescription('**Selecciona una categoría para ver los comandos:**\n\n' +
                      '🎲 **Juegos de Azar** - Dados, monedas y azar\n' +
                      '🎯 **Juegos Interactivos** - Trivia, RPS y más\n' +
                      '😂 **Diversión** - Memes y entretenimiento\n' +
                      '📚 **Ver Todo** - Todos los comandos juntos')
      .setColor(0xFF6B6B)
      .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
    
    // Crear botones
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('juegos_azar')
          .setLabel('🎲 Juegos de Azar')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('juegos_interactivos')
          .setLabel('🎯 Interactivos')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('juegos_diversion')
          .setLabel('😂 Diversión')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('juegos_todo')
          .setLabel('📚 Ver Todo')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('juegos_volver')
          .setLabel('🔙 Volver al Menú')
          .setStyle(ButtonStyle.Danger)
      );
    
    const response = await message.reply({ 
      embeds: [juegosEmbed], 
      components: [row1, row2] 
    });
    
    // Crear collector para los botones
    const collector = response.createMessageComponentCollector({ 
      time: 120000 // 2 minutos
    });
    
    collector.on('collect', async i => {
      // Solo el usuario que ejecutó el comando puede usar los botones
      if (i.user.id !== message.author.id) {
        return i.reply({ 
          content: '❌ Este menú no es tuyo. Usa `!juegos` para crear el tuyo.', 
          ephemeral: true 
        });
      }
      
      let embed;
      let components = [row1, row2];
      
      if (i.customId === 'juegos_azar') {
        embed = new EmbedBuilder()
          .setTitle('🎲 JUEGOS DE AZAR')
          .setDescription('Comandos basados en suerte y aleatoriedad')
          .setColor(0x3498DB)
          .addFields(
            {
              name: '!8ball <pregunta>',
              value: 'Pregunta a la bola 8 mágica y recibe una respuesta misteriosa\nEjemplo: `!8ball ¿Tendré suerte hoy?`',
              inline: false
            },
            {
              name: '!coinflip',
              value: 'Lanza una moneda al aire (cara o cruz)',
              inline: false
            },
            {
              name: '!dado [caras]',
              value: 'Lanza un dado con 2-100 caras (por defecto: 6)\nEjemplo: `!dado 20`',
              inline: false
            },
            {
              name: '!roll <dados>',
              value: 'Lanza dados estilo D&D\nEjemplo: `!roll 2d6` `!roll 1d20`',
              inline: false
            }
          )
          .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
          
      } else if (i.customId === 'juegos_interactivos') {
        embed = new EmbedBuilder()
          .setTitle('🎯 JUEGOS INTERACTIVOS')
          .setDescription('Comandos que requieren participación e interacción')
          .setColor(0x2ECC71)
          .addFields(
            {
              name: '!rps <elección>',
              value: 'Juega piedra, papel o tijera contra el bot\nEjemplo: `!rps piedra` `!rps papel` `!rps tijera`',
              inline: false
            },
            {
              name: '/trivia [categoría]',
              value: 'Responde preguntas de trivia con botones interactivos\n**Categorías:** Geografía, Historia, Ciencia, Videojuegos, Cine, Música, Deportes, Random\nEjemplo: `/trivia categoria:videojuegos`',
              inline: false
            },
            {
              name: '/ship <persona1> <persona2>',
              value: 'Calcula la compatibilidad entre dos usuarios (0-100%)\nEjemplo: `/ship persona1:@Usuario1 persona2:@Usuario2`',
              inline: false
            }
          )
          .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
          
      } else if (i.customId === 'juegos_diversion') {
        embed = new EmbedBuilder()
          .setTitle('😂 DIVERSIÓN')
          .setDescription('Comandos para entretenerse y reír')
          .setColor(0xE74C3C)
          .addFields(
            {
              name: '!meme',
              value: 'Genera un meme aleatorio divertido\n¡Perfecto para alegrar el día!',
              inline: false
            }
          )
          .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
          
      } else if (i.customId === 'juegos_todo') {
        embed = new EmbedBuilder()
          .setTitle('📚 TODOS LOS COMANDOS DE JUEGOS')
          .setDescription('Lista completa de comandos de juegos con `!`')
          .setColor(0x9B59B6)
          .addFields(
            {
              name: '🎲 Juegos de Azar',
              value: '`!8ball <pregunta>` • `!coinflip` • `!dado [caras]` • `!roll <dados>`',
              inline: false
            },
            {
              name: '🎯 Juegos Interactivos',
              value: '`!rps <elección>` • `/trivia [categoría]` • `/ship <persona1> <persona2>`',
              inline: false
            },
            {
              name: '😂 Diversión',
              value: '`!meme`',
              inline: false
            },
            {
              name: '📚 Categorías de Trivia',
              value: '🌍 Geografía • 📚 Historia • 🔬 Ciencia • 🎮 Videojuegos\n🎬 Cine y TV • 🎵 Música • ⚽ Deportes • 🎲 Random',
              inline: false
            },
            {
              name: '💡 Ejemplos de Uso',
              value: '```\n!8ball ¿Tendré suerte?\n!rps piedra\n!dado 20\n!roll 2d6\n!meme\n```',
              inline: false
            }
          )
          .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
          
      } else if (i.customId === 'juegos_volver') {
        // Volver al menú principal
        embed = new EmbedBuilder()
          .setTitle('🎮 MENÚ DE COMANDOS DE JUEGOS')
          .setDescription('**Selecciona una categoría para ver los comandos:**\n\n' +
                          '🎲 **Juegos de Azar** - Dados, monedas y azar\n' +
                          '🎯 **Juegos Interactivos** - Trivia, RPS y más\n' +
                          '😂 **Diversión** - Memes y entretenimiento\n' +
                          '📚 **Ver Todo** - Todos los comandos juntos')
          .setColor(0xFF6B6B)
          .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
      }
      
      await i.update({ embeds: [embed], components: components });
    });
    
    collector.on('end', async () => {
      // Deshabilitar botones después de 2 minutos
      const disabledRow1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('juegos_azar_disabled')
            .setLabel('🎲 Juegos de Azar')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('juegos_interactivos_disabled')
            .setLabel('🎯 Interactivos')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('juegos_diversion_disabled')
            .setLabel('😂 Diversión')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
      
      const disabledRow2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('juegos_todo_disabled')
            .setLabel('📚 Ver Todo')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('juegos_volver_disabled')
            .setLabel('🔙 Volver al Menú')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );
      
      await response.edit({ components: [disabledRow1, disabledRow2] }).catch(() => {});
    });
    
    return;
  }

  // ===== COMANDOS DE JUEGOS CON ! =====
  
  // !8ball
  if (message.content.toLowerCase().startsWith('!8ball ')) {
    const pregunta = message.content.slice(7).trim();
    
    if (!pregunta) {
      return message.reply('❌ Debes hacer una pregunta. Ejemplo: `!8ball ¿Tendré suerte hoy?`');
    }
    
    const respuestas = [
      '✅ Sí, definitivamente.',
      '✅ Es cierto.',
      '✅ Sin duda.',
      '✅ Puedes confiar en ello.',
      '✅ Como yo lo veo, sí.',
      '✅ Probablemente.',
      '🤔 Las señales apuntan a que sí.',
      '🤔 Sin dudas.',
      '🤔 Sí.',
      '🤔 Mis fuentes dicen que no.',
      '⏳ Respuesta confusa, intenta de nuevo.',
      '⏳ Pregunta de nuevo más tarde.',
      '⏳ Mejor no decírtelo ahora.',
      '⏳ No puedo predecirlo ahora.',
      '⏳ Concéntrate y pregunta de nuevo.',
      '❌ No cuentes con ello.',
      '❌ Mi respuesta es no.',
      '❌ Mis fuentes dicen que no.',
      '❌ Las perspectivas no son buenas.',
      '❌ Muy dudoso.'
    ];
    
    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    
    const ballEmbed = new EmbedBuilder()
      .setTitle('🎱 Bola 8 Mágica')
      .addFields(
        { name: '❓ Pregunta', value: pregunta, inline: false },
        { name: '🔮 Respuesta', value: respuesta, inline: false }
      )
      .setColor(0x9B59B6)
      .setTimestamp();
    
    await message.reply({ embeds: [ballEmbed] });
    return; // Importante: salir para no procesar anti-spam
  }
  
  // !coinflip
  if (message.content.toLowerCase() === '!coinflip') {
    const resultado = Math.random() < 0.5 ? '🪙 **CARA**' : '🔵 **CRUZ**';
    
    const coinEmbed = new EmbedBuilder()
      .setTitle('🪙 Lanzamiento de Moneda')
      .setDescription(resultado)
      .setColor(0xFFD700)
      .setTimestamp();
    
    await message.reply({ embeds: [coinEmbed] });
    return; // Importante: salir para no procesar anti-spam
  }
  
  // !dado
  if (message.content.toLowerCase().startsWith('!dado')) {
    const args = message.content.split(' ');
    let caras = 6;
    
    if (args[1]) {
      caras = parseInt(args[1]);
      if (isNaN(caras) || caras < 2 || caras > 100) {
        return message.reply('❌ El dado debe tener entre 2 y 100 caras. Ejemplo: `!dado 20`');
      }
    }
    
    const resultado = Math.floor(Math.random() * caras) + 1;
    
    const dadoEmbed = new EmbedBuilder()
      .setTitle('🎲 Lanzamiento de Dado')
      .setDescription(`🎲 Has sacado un **${resultado}**!\n\n*Dado de ${caras} caras*`)
      .setColor(0xFF6B6B)
      .setTimestamp();
    
    await message.reply({ embeds: [dadoEmbed] });
    return; // Importante: salir para no procesar anti-spam
  }
  
  // !rps
  if (message.content.toLowerCase().startsWith('!rps ')) {
    const eleccionUsuario = message.content.slice(5).trim().toLowerCase();
    
    if (!['piedra', 'papel', 'tijera'].includes(eleccionUsuario)) {
      return message.reply('❌ Elige: `!rps piedra`, `!rps papel` o `!rps tijera`');
    }
    
    const opciones = ['piedra', 'papel', 'tijera'];
    const eleccionBot = opciones[Math.floor(Math.random() * opciones.length)];
    
    const emojis = {
      piedra: '🪨',
      papel: '📄',
      tijera: '✂️'
    };
    
    let resultado = '';
    let color = 0xFFD700;
    
    if (eleccionUsuario === eleccionBot) {
      resultado = '🤝 **¡EMPATE!**';
      color = 0xFFD700;
    } else if (
      (eleccionUsuario === 'piedra' && eleccionBot === 'tijera') ||
      (eleccionUsuario === 'papel' && eleccionBot === 'piedra') ||
      (eleccionUsuario === 'tijera' && eleccionBot === 'papel')
    ) {
      resultado = '🎉 **¡GANASTE!**';
      color = 0x00FF00;
    } else {
      resultado = '😢 **¡PERDISTE!**';
      color = 0xFF0000;
    }
    
    const rpsEmbed = new EmbedBuilder()
      .setTitle('🎮 Piedra, Papel o Tijera')
      .addFields(
        { name: '👤 Tu elección', value: `${emojis[eleccionUsuario]} ${eleccionUsuario.toUpperCase()}`, inline: true },
        { name: '🤖 Mi elección', value: `${emojis[eleccionBot]} ${eleccionBot.toUpperCase()}`, inline: true }
      )
      .setDescription(resultado)
      .setColor(color)
      .setTimestamp();
    
    await message.reply({ embeds: [rpsEmbed] });
    return; // Importante: salir para no procesar anti-spam
  }
  
  // !roll
  if (message.content.toLowerCase().startsWith('!roll ')) {
    const dadosInput = message.content.slice(6).trim().toLowerCase();
    
    const regex = /^(\d+)d(\d+)$/;
    const match = dadosInput.match(regex);
    
    if (!match) {
      return message.reply('❌ Formato inválido. Usa: `!roll 2d6`, `!roll 1d20`, etc.');
    }
    
    const cantidad = parseInt(match[1]);
    const caras = parseInt(match[2]);
    
    if (cantidad < 1 || cantidad > 20) {
      return message.reply('❌ Debes lanzar entre 1 y 20 dados.');
    }
    
    if (caras < 2 || caras > 100) {
      return message.reply('❌ El dado debe tener entre 2 y 100 caras.');
    }
    
    const resultados = [];
    let total = 0;
    
    for (let i = 0; i < cantidad; i++) {
      const resultado = Math.floor(Math.random() * caras) + 1;
      resultados.push(resultado);
      total += resultado;
    }
    
    const rollEmbed = new EmbedBuilder()
      .setTitle(`🎲 Lanzamiento de Dados: ${dadosInput.toUpperCase()}`)
      .addFields(
        { name: '🎯 Resultados', value: resultados.join(', '), inline: false },
        { name: '📊 Total', value: `**${total}**`, inline: true },
        { name: '📈 Promedio', value: `${(total / cantidad).toFixed(2)}`, inline: true }
      )
      .setColor(0xE74C3C)
      .setFooter({ text: `${cantidad} dado${cantidad > 1 ? 's' : ''} de ${caras} caras` })
      .setTimestamp();
    
    await message.reply({ embeds: [rollEmbed] });
    return; // Importante: salir para no procesar anti-spam
  }
  
  // !meme (solo en canal específico)
  if (message.content.toLowerCase() === '!meme') {
    // Verificar que esté en un canal de memes
    const canalMemes = message.guild.channels.cache.find(ch => 
      ch.name.toLowerCase().includes('meme') || 
      ch.name.toLowerCase().includes('memes')
    );
    
    if (canalMemes && message.channel.id !== canalMemes.id) {
      return message.reply(`❌ El comando \`!meme\` solo puede usarse en ${canalMemes}.`);
    }
    
    try {
      // Obtener memes de r/MemesESP
      const response = await fetch('https://www.reddit.com/r/MemesESP/hot.json?limit=100');
      const data = await response.json();
      
      if (!data || !data.data || !data.data.children || data.data.children.length === 0) {
        return message.reply('❌ No se pudieron obtener memes de Reddit en este momento. Intenta de nuevo más tarde.');
      }
      
      // Filtrar solo posts que tengan imágenes
      const memesConImagen = data.data.children.filter(post => {
        const postData = post.data;
        // Verificar que sea una imagen (jpg, png, gif) o video de reddit
        return postData.post_hint === 'image' || 
               (postData.url && (
                 postData.url.endsWith('.jpg') || 
                 postData.url.endsWith('.jpeg') || 
                 postData.url.endsWith('.png') || 
                 postData.url.endsWith('.gif')
               ));
      });
      
      if (memesConImagen.length === 0) {
        return message.reply('❌ No se encontraron memes con imágenes. Intenta de nuevo.');
      }
      
      // Obtener memes ya enviados en este servidor
      if (!client.memesEnviados.has(message.guild.id)) {
        client.memesEnviados.set(message.guild.id, new Set());
      }
      const memesYaEnviados = client.memesEnviados.get(message.guild.id);
      
      // Filtrar memes que NO se han enviado antes
      let memesNoEnviados = memesConImagen.filter(post => !memesYaEnviados.has(post.data.url));
      
      // Si todos los memes ya se enviaron, resetear la lista
      if (memesNoEnviados.length === 0) {
        memesYaEnviados.clear();
        memesNoEnviados = memesConImagen;
        await message.channel.send('♻️ Se han mostrado todos los memes disponibles. Reiniciando lista...');
      }
      
      // Seleccionar un meme aleatorio que no se haya enviado
      const memeAleatorio = memesNoEnviados[Math.floor(Math.random() * memesNoEnviados.length)];
      const memeData = memeAleatorio.data;
      
      // Guardar este meme como enviado
      memesYaEnviados.add(memeData.url);
      
      const memeEmbed = new EmbedBuilder()
        .setImage(memeData.url)
        .setColor(0xFF6B6B)
        .setFooter({ text: `👍 ${memeData.ups} upvotes • r/MemesESP` })
        .setTimestamp();
      
      // Agregar autor de forma simple
      if (memeData.author) {
        memeEmbed.setAuthor({ name: `u/${memeData.author}` });
      }
      
      await message.reply({ embeds: [memeEmbed] });
      return; // Importante: salir para no procesar anti-spam
      
    } catch (error) {
      console.error('Error obteniendo meme de Reddit:', error);
      return message.reply('❌ Hubo un error al obtener el meme. Intenta de nuevo más tarde.');
    }
  }

  // ===== COMANDO !nex PARA SOPORTE DE VOZ =====
  if (message.content.toLowerCase() === '!nex' || message.content.toLowerCase() === '!next') {
    // Verificar que esté en el canal de log de soporte de voz
    const logChannel = findLogChannel(message.guild);
    const isLogChannel = logChannel && message.channel.id === logChannel.id;
    
    if (isLogChannel) {
      // Verificar que tenga el rol configurado para usar !nex
      const nextRoleId = client.voiceSupportNextRole.get(message.guild.id);
      const staffRoleId = client.voiceSupportStaffRole.get(message.guild.id);
      
      // Verificar que tenga el rol configurado para !nex o el rol de staff (compatibilidad)
      const hasNextRole = nextRoleId && message.member.roles.cache.has(nextRoleId);
      const hasStaffRole = staffRoleId && message.member.roles.cache.has(staffRoleId);
      
      if (hasNextRole || hasStaffRole) {
        const queue = client.voiceSupportQueue.get(message.guild.id);
        
        if (!queue || queue.length === 0) {
          await message.reply('❌ No hay usuarios en espera.');
          return;
        }
        
        // Buscar canales de soporte disponibles
        const supportChannels = findSupportChannels(message.guild);
        
        if (supportChannels.size === 0) {
          await message.reply('❌ No se encontraron canales de soporte. Asegúrate de tener canales con "soporte" en el nombre.');
          return;
        }
        
        // Buscar un canal de soporte donde el staff esté conectado
        let targetChannel = null;
        for (const [channelId, channel] of supportChannels) {
          if (channel.members.has(message.member.id)) {
            targetChannel = channel;
            break;
          }
        }
        
        // Si no está en ningún canal de soporte, usar el primero disponible
        if (!targetChannel) {
          targetChannel = supportChannels.first();
          await message.member.voice.setChannel(targetChannel).catch(() => null);
        }
        
        if (targetChannel) {
          try {
            const nextUserId = queue.shift();
            if (!nextUserId) {
              await message.reply('❌ No hay usuarios en la cola.');
              return;
            }
            
            client.voiceSupportQueue.set(message.guild.id, queue);
            
            const nextUser = await message.guild.members.fetch(nextUserId).catch((err) => {
              console.error('Error obteniendo usuario:', err);
              return null;
            });
            
            if (!nextUser) {
              await message.reply('❌ No se pudo encontrar al usuario en el servidor.');
              return;
            }
            
            if (!nextUser.voice || !nextUser.voice.channel) {
              await message.reply('❌ El usuario no está en ningún canal de voz.');
              return;
            }
            
            const waitingRoom = findWaitingRoom(message.guild);
            
            if (!waitingRoom) {
              await message.reply('❌ No se encontró la sala de espera.');
              return;
            }
            
            if (nextUser.voice.channel.id === waitingRoom.id) {
              try {
                await nextUser.voice.setChannel(targetChannel);
                
                // Remover tiempo de espera
                const waitingTimes = client.voiceSupportWaitingTime.get(message.guild.id);
                if (waitingTimes) {
                  waitingTimes.delete(nextUserId);
                  client.voiceSupportWaitingTime.set(message.guild.id, waitingTimes);
                }
                
                // Remover de advertencias enviadas
                const warningSent = client.voiceSupportWarningSent.get(message.guild.id);
                if (warningSent) {
                  warningSent.delete(nextUserId);
                  client.voiceSupportWarningSent.set(message.guild.id, warningSent);
                }
                
                // Eliminar mensaje de notificación
                if (client.voiceSupportQueueMessages && client.voiceSupportQueueMessages.has(message.guild.id)) {
                  const queueMessages = client.voiceSupportQueueMessages.get(message.guild.id);
                  if (queueMessages) {
                    queueMessages.delete(nextUserId);
                    client.voiceSupportQueueMessages.set(message.guild.id, queueMessages);
                  }
                }
                
                // Obtener la cola actualizada para mostrar el número correcto
                const updatedQueue = client.voiceSupportQueue.get(message.guild.id) || [];
                
                const embed = new EmbedBuilder()
                  .setTitle('✅ Usuario Movido a Soporte')
                  .setDescription(`**Usuario:** ${nextUser.user.tag} (${nextUser})\n**Movido a:** ${targetChannel.name}\n**Por:** ${message.author.tag}\n**Usuarios restantes en espera:** ${updatedQueue.length}`)
                  .setColor(0x00FF00)
                  .setTimestamp();
                
                await message.reply({ embeds: [embed] }).catch((err) => {
                  console.error('Error enviando respuesta:', err);
                });
              } catch (error) {
                console.error('Error moviendo usuario con !nex:', error);
                await message.reply('❌ Error al mover al usuario. Verifica los permisos del bot y que el usuario esté en un canal de voz.').catch(() => {});
              }
            } else {
              await message.reply('❌ El usuario ya no está en la sala de espera.').catch(() => {});
            }
          } catch (error) {
            console.error('Error general en !nex:', error);
            await message.reply('❌ Ocurrió un error inesperado. Por favor, intenta de nuevo.').catch(() => {});
          }
        } else {
          await message.reply('❌ No se pudo determinar el canal de destino.').catch(() => {});
        }
      } else {
        const nextRoleId = client.voiceSupportNextRole.get(message.guild.id);
        const staffRoleId = client.voiceSupportStaffRole.get(message.guild.id);
        
        let errorMsg = '❌ No tienes permisos para usar este comando.';
        if (nextRoleId) {
          const nextRole = message.guild.roles.cache.get(nextRoleId);
          errorMsg += ` Necesitas el rol ${nextRole || 'configurado'}.`;
        } else if (staffRoleId) {
          const staffRole = message.guild.roles.cache.get(staffRoleId);
          errorMsg += ` Necesitas el rol de staff de soporte de voz ${staffRole || ''}.`;
        } else {
          errorMsg += ' Configura un rol con `/voicesupportnextrole`.';
        }
        
        await message.reply(errorMsg);
      }
    }
    return; // Salir para no procesar el anti-spam
  }
  
  const settings = getAntiRaidSettings(message.guild.id);
  console.log(`🔍 Anti-Spam check para ${message.author.tag}: antiSpam=${settings.antiSpam}`);
  
  if (!settings.antiSpam) {
    console.log(`❌ Anti-Spam desactivado para ${message.author.tag}`);
    return;
  }
  
  // Verificar whitelist
  if (isWhitelisted(message.guild.id, message.author.id)) {
    console.log(`✅ ${message.author.tag} está en whitelist`);
    return;
  }
  
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    console.log(`✅ ${message.author.tag} es administrador`);
    return;
  }
  
  console.log(`🛡️ Procesando mensaje de ${message.author.tag}: "${message.content}"`);
  
  // Verificar si el usuario está en timeout (aislado)
  if (message.member.communicationDisabledUntil && message.member.communicationDisabledUntil > Date.now()) {
    // Verificar si está en su propio ticket aislado
    const isOwnIsolatedTicket = message.channel.name.includes(`ticket-aislado-${message.author.username}`);
    
    if (isOwnIsolatedTicket) {
      // Si está en su propio ticket aislado, permitir el mensaje normal
      console.log(`✅ Usuario aislado ${message.author.tag} escribiendo en su ticket`);
      return; // Permitir el mensaje sin modificaciones
    }
    
    // Buscar canal de usuarios aislados
    const isolatedChannel = message.guild.channels.cache.find(ch => 
      ch.type === ChannelType.GuildText && 
      (ch.name.includes('aislados') || ch.name.includes('isolated') || ch.name.includes('timeout'))
    );
    
    if (isolatedChannel && message.channel.id === isolatedChannel.id) {
      // Si está escribiendo en el canal de aislados, permitir el mensaje
      const timeLeft = Math.floor((message.member.communicationDisabledUntil.getTime() - Date.now()) / 1000);
      const timeLeftFormatted = `<t:${Math.floor(message.member.communicationDisabledUntil.getTime() / 1000)}:R>`;
      
      // Agregar información de aislamiento al mensaje
      const isolatedEmbed = new EmbedBuilder()
        .setAuthor({ 
          name: `${message.author.tag} (AISLADO)`, 
          iconURL: message.author.displayAvatarURL() 
        })
        .setDescription(message.content)
        .setColor(0xFFA500)
        .setFooter({ text: `Tiempo restante: ${timeLeftFormatted} | Infracción: ${client.antiRaid.infractions.get(`${message.guild.id}-${message.author.id}`)?.count || 'N/A'}/10` })
        .setTimestamp();
      
      // Reenviar el mensaje como embed
      await isolatedChannel.send({ embeds: [isolatedEmbed] });
      
      // Eliminar el mensaje original - DESACTIVADO
      /*
      try {
        await message.delete();
      } catch (e) {}
      */
      return;
    }
    
    // Si está aislado y NO está en el canal de aislados
    if (message.content.toLowerCase().includes('ticket') || message.content.toLowerCase().includes('ayuda')) {
      const ticketEmbed = new EmbedBuilder()
        .setTitle('🎫 Sistema de Tickets para Usuarios Aislados')
        .setDescription(`**Hola ${message.author.tag}!**\n\nVeo que estás aislado pero necesitas ayuda.\n\n**Opciones disponibles:**\n• Ve al canal de usuarios aislados para comunicarte\n• Contacta a un administrador directamente\n\n**Tiempo restante de aislamiento:** <t:${Math.floor(message.member.communicationDisabledUntil.getTime() / 1000)}:R>`)
        .setColor(0x00FF00)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Los tickets te permiten comunicarte con los administradores' })
        .setTimestamp();

      const ticketMsg = await message.channel.send({ embeds: [ticketEmbed] });
      setTimeout(() => ticketMsg.delete().catch(() => {}), 15000);
    } else {
      // Redirigir al canal de aislados o tickets
      const redirectEmbed = new EmbedBuilder()
        .setTitle('🔒 Usuario Aislado')
        .setDescription(`**${message.author.tag}**, estás aislado y no puedes escribir aquí.\n\n**Para comunicarte:**\n• Ve al canal de usuarios aislados\n• Contacta a un administrador directamente\n\n**Tiempo restante:** <t:${Math.floor(message.member.communicationDisabledUntil.getTime() / 1000)}:R>`)
        .setColor(0xFF0000)
        .setThumbnail(message.author.displayAvatarURL())
        .setTimestamp();

      const redirectMsg = await message.channel.send({ embeds: [redirectEmbed] });
      setTimeout(() => redirectMsg.delete().catch(() => {}), 10000);
    }
    
    // IMPORTANTE: Si está aislado, eliminar el mensaje y salir sin aplicar más castigos - DESACTIVADO
    /*
    try {
      await message.delete();
    } catch (e) {}
    */
    return; // No aplicar más castigos si ya está aislado
  }
  
  const userId = message.author.id;
  const guildId = message.guild.id;
  const key = `${guildId}-${userId}`;
  
  if (!client.antiRaid.messageTracker.has(key)) {
    client.antiRaid.messageTracker.set(key, []);
  }
  
  const tracker = client.antiRaid.messageTracker.get(key);
  const now = Date.now();
  
  // Limpiar mensajes antiguos
  tracker.push({ timestamp: now, content: message.content, messageId: message.id });
  const recentMessages = tracker.filter(msg => now - msg.timestamp < settings.timeWindow);
  client.antiRaid.messageTracker.set(key, recentMessages);
  
  // Verificar repetición de letras (3 veces la misma letra)
  if (message.content.length === 1 && /^[a-zA-Z]$/.test(message.content)) {
    console.log(`🔤 Letra detectada: "${message.content}" de ${message.author.tag}`);
    const sameLetterMessages = recentMessages.filter(msg => 
      msg.content === message.content && 
      msg.content.length === 1 && 
      /^[a-zA-Z]$/.test(msg.content)
    );
    
    console.log(`🔤 Repetición check: ${sameLetterMessages.length} mensajes con "${message.content}"`);
    
    if (sameLetterMessages.length >= 3) {
      console.log(`🚨 REPETICIÓN DETECTADA: ${message.author.tag} repitió "${message.content}" 3 veces`);
      // Eliminar mensajes repetidos - ACTIVADO (sin castigos)
      try {
        const messagesToDelete = sameLetterMessages.slice(-3);
        for (const msgData of messagesToDelete) {
          try {
            const msg = await message.channel.messages.fetch(msgData.messageId);
            await msg.delete();
          } catch (e) {}
        }
      } catch (error) {
        console.error('Error eliminando mensajes repetidos:', error);
      }

      // Verificar si ya está aislado ANTES de contar infracciones
      if (message.member.communicationDisabledUntil && message.member.communicationDisabledUntil > Date.now()) {
        // Si ya está aislado, NO contar más infracciones
        console.log(`⚠️ Usuario ${message.author.tag} ya aislado - NO se cuenta infracción adicional`);
        return; // Salir sin contar infracciones
      }

      // APLICAR CASTIGO PROGRESIVO POR REPETIR LETRAS
      const infractionKey = `${guildId}-${userId}`;
      let infractions = client.antiRaid.infractions.get(infractionKey) || { count: 0, lastInfraction: 0 };
      
      // Resetear si ha pasado más de 1 hora desde la última infracción
      if (Date.now() - infractions.lastInfraction > 3600000) {
        infractions = { count: 0, lastInfraction: 0 };
      }
      
      infractions.count++;
      infractions.lastInfraction = Date.now();
      client.antiRaid.infractions.set(infractionKey, infractions);
      
      // Castigos progresivos (10 niveles)
      const punishments = [
        { time: 60000, label: '1 minuto', action: 'timeout' },       // 1ra vez
        { time: 120000, label: '2 minutos', action: 'timeout' },     // 2da vez
        { time: 300000, label: '5 minutos', action: 'timeout' },     // 3ra vez
        { time: 600000, label: '10 minutos', action: 'timeout' },    // 4ta vez
        { time: 900000, label: '15 minutos', action: 'timeout' },    // 5ta vez
        { time: 1800000, label: '30 minutos', action: 'timeout' },   // 6ta vez
        { time: 3600000, label: '1 hora', action: 'timeout' },       // 7ma vez
        { time: 7200000, label: '2 horas', action: 'timeout' },      // 8va vez
        { time: 86400000, label: '1 día', action: 'timeout' },       // 9na vez
        { time: 0, label: 'BAN PERMANENTE', action: 'ban' }          // 10ma vez
      ];
      
      const punishmentIndex = Math.min(infractions.count - 1, punishments.length - 1);
      const punishment = punishments[punishmentIndex];
      
      let actionText = '';
      
      // SISTEMA DE CASTIGOS DESACTIVADO - Otro bot se encarga de los castigos
      // if (punishment.action === 'ban') {
      //   await message.member.ban({ reason: `Repetición de letras reiterada - Anti-Raid (${infractions.count}ª infracción - BAN)` });
      //   actionText = `**BANEADO PERMANENTEMENTE** del servidor (${infractions.count}ª infracción)`;
      //   client.antiRaid.infractions.delete(infractionKey);
      // } else {
      //   // Verificar si ya está en timeout
      //   if (message.member.communicationDisabledUntil && message.member.communicationDisabledUntil > Date.now()) {
      //     // Ya está aislado, no aplicar más castigos
      //     actionText = `**YA AISLADO** - No se aplicó castigo adicional (${infractions.count}ª infracción)`;
      //   } else {
      //     try {
      //       await message.member.timeout(punishment.time, `Repetición de letras detectada - Anti-Raid (${infractions.count}ª infracción)`);
      //       actionText = `Timeout de **${punishment.label}** (${infractions.count}ª infracción)`;
      //     } catch (e) {
      //       console.error('Error aplicando timeout:', e);
      //       actionText = `**ERROR** - No se pudo aplicar timeout (${infractions.count}ª infracción)`;
      //     }
      //   }
      // }
      
      // Solo registrar la detección sin aplicar castigos
      actionText = `**DETECTADO** - Repetición de letras (${infractions.count}ª vez) - Otro bot se encarga de los castigos`;

      // Log de infracción
      const logEmbed = new EmbedBuilder()
        .setTitle('🛡️ Anti-Spam: Castigo por Repetición de Letras')
        .setDescription(`**Usuario:** ${message.author.tag} (${message.author.id})\n**Infracción:** ${infractions.count}ª vez\n**Acción:** Repitió la letra "${message.content}" 3 veces\n**Canal:** ${message.channel}\n**Acción:** ${actionText}\n**Mensajes eliminados:** ✅`)
        .setColor(infractions.count >= 4 ? 0x8B0000 : 0xFF0000)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Las infracciones se resetean después de 1 hora sin incidentes' })
        .setTimestamp();

      await sendSecurityLog(message.guild, logEmbed);
      
      // Limpiar mensajes repetidos del tracker
      const filteredMessages = recentMessages.filter(msg => 
        !(msg.content === message.content && msg.content.length === 1)
      );
      client.antiRaid.messageTracker.set(key, filteredMessages);
      return;
    }
  }
  
  // Detectar spam
  console.log(`📊 Spam check: ${recentMessages.length} mensajes recientes, límite: ${settings.maxMessages}`);
  
  if (recentMessages.length > settings.maxMessages) {
    console.log(`🚨 SPAM DETECTADO: ${message.author.tag} envió ${recentMessages.length} mensajes en ${settings.timeWindow/1000}s`);
    try {
      // Eliminar todos los mensajes recientes del spammer - ACTIVADO (sin castigos)
      try {
        const messagesToDelete = recentMessages.map(msg => msg.messageId);
        for (const messageId of messagesToDelete) {
          try {
            const msg = await message.channel.messages.fetch(messageId);
            await msg.delete();
          } catch (e) {}
        }
      } catch (e) {
        console.error('Error eliminando mensajes de spam:', e);
      }

      // Verificar si ya está aislado ANTES de contar infracciones
      if (message.member.communicationDisabledUntil && message.member.communicationDisabledUntil > Date.now()) {
        // Si ya está aislado, NO contar más infracciones
        console.log(`⚠️ Usuario ${message.author.tag} ya aislado - NO se cuenta infracción adicional por spam`);
        return; // Salir sin contar infracciones
      }

      // Sistema de castigos progresivos
      const infractionKey = `${guildId}-${userId}`;
      let infractions = client.antiRaid.infractions.get(infractionKey) || { count: 0, lastInfraction: 0 };
      
      // Resetear si ha pasado más de 1 hora desde la última infracción
      if (Date.now() - infractions.lastInfraction > 3600000) {
        infractions = { count: 0, lastInfraction: 0 };
      }
      
      infractions.count++;
      infractions.lastInfraction = Date.now();
      client.antiRaid.infractions.set(infractionKey, infractions);
      
      // Castigos progresivos (10 niveles)
      const punishments = [
        { time: 60000, label: '1 minuto', action: 'timeout' },       // 1ra vez
        { time: 120000, label: '2 minutos', action: 'timeout' },     // 2da vez
        { time: 300000, label: '5 minutos', action: 'timeout' },     // 3ra vez
        { time: 600000, label: '10 minutos', action: 'timeout' },    // 4ta vez
        { time: 900000, label: '15 minutos', action: 'timeout' },    // 5ta vez
        { time: 1800000, label: '30 minutos', action: 'timeout' },   // 6ta vez
        { time: 3600000, label: '1 hora', action: 'timeout' },       // 7ma vez
        { time: 7200000, label: '2 horas', action: 'timeout' },      // 8va vez
        { time: 86400000, label: '1 día', action: 'timeout' },       // 9na vez
        { time: 0, label: 'BAN PERMANENTE', action: 'ban' }          // 10ma vez
      ];
      
      const punishmentIndex = Math.min(infractions.count - 1, punishments.length - 1);
      const punishment = punishments[punishmentIndex];
      
      let actionText = '';
      
      // SISTEMA DE CASTIGOS DESACTIVADO - Otro bot se encarga de los castigos
      // if (punishment.action === 'ban') {
      //   await message.member.ban({ reason: `Spam reiterado - Anti-Raid (${infractions.count}ª infracción - BAN)` });
      //   actionText = `**BANEADO PERMANENTEMENTE** del servidor (${infractions.count}ª infracción)`;
      //   client.antiRaid.infractions.delete(infractionKey);
      // } else {
      //   // Verificar si ya está en timeout
      //   if (message.member.communicationDisabledUntil && message.member.communicationDisabledUntil > Date.now()) {
      //     // Ya está aislado, no aplicar más castigos
      //     actionText = `**YA AISLADO** - No se aplicó castigo adicional (${infractions.count}ª infracción)`;
      //   } else {
      //     try {
      //       await message.member.timeout(punishment.time, `Spam detectado - Anti-Raid (${infractions.count}ª infracción)`);
      //       actionText = `Timeout de **${punishment.label}** (${infractions.count}ª infracción)`;
      //     } catch (e) {
      //       console.error('Error aplicando timeout:', e);
      //       actionText = `**ERROR** - No se pudo aplicar timeout (${infractions.count}ª infracción)`;
      //     }
      //   }
      // }
      
      // Solo registrar la detección sin aplicar castigos
      actionText = `**DETECTADO** - Spam masivo (${infractions.count}ª vez) - Otro bot se encarga de los castigos`;
      
      const logEmbed = new EmbedBuilder()
        .setTitle('🛡️ Anti-Spam: Castigo Progresivo')
        .setDescription(`**Usuario:** ${message.author.tag} (${message.author.id})\n**Infracción:** ${infractions.count}ª vez\n**Spam:** ${recentMessages.length} mensajes en ${settings.timeWindow/1000}s\n**Canal:** ${message.channel}\n**Acción:** ${actionText}\n**Mensajes eliminados:** ✅`)
        .setColor(infractions.count >= 4 ? 0x8B0000 : 0xFF0000)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Las infracciones se resetean después de 1 hora sin incidentes' })
        .setTimestamp();
      
      await sendSecurityLog(message.guild, logEmbed);
      client.antiRaid.messageTracker.delete(key);
    } catch (error) {
      console.error('Error aplicando castigo por spam:', error);
    }
  }
  
  // Anti-Links
  if (settings.antiLinks) {
    const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)/gi;
    if (linkRegex.test(message.content)) {
      const canPostLinks = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
      if (!canPostLinks) {
        try {
          await message.delete(); // ACTIVADO - Eliminar mensajes con enlaces
          // await message.channel.send(`⚠️ ${message.author}, los enlaces no están permitidos.`).then(msg => setTimeout(() => msg.delete(), 3000)); // DESACTIVADO
          
          const logEmbed = new EmbedBuilder()
            .setTitle('🛡️ Anti-Links: Mensaje Eliminado')
            .setDescription(`**Usuario:** ${message.author.tag}\n**Canal:** ${message.channel}\n**Contenido:** ${message.content.substring(0, 200)}`)
            .setColor(0xFFA500)
            .setTimestamp();
          
          await sendSecurityLog(message.guild, logEmbed);
        } catch (error) {
          console.error('Error eliminando link:', error);
        }
      }
    }
  }
});

// Anti-Bots no autorizados
client.on('guildMemberAdd', async (member) => {
  if (!member.user.bot) return;
  
  const settings = getAntiRaidSettings(member.guild.id);
  if (!settings.antiBots) return;
  
  // Verificar whitelist
  if (isWhitelisted(member.guild.id, member.user.id)) return;
  
  // Nunca intentar expulsar al propio bot
  if (member.user.id === client.user.id) return;
  
    try {
      const botMember = member.guild.members.me;
      if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        console.log('❌ No tengo permisos para expulsar bots no autorizados.');
        return;
      }

      await member.kick('Bot no autorizado - Anti-Raid');
      
      const logEmbed = new EmbedBuilder()
      .setTitle('🛡️ Anti-Bots: Bot Expulsado')
      .setDescription(`**Bot:** ${member.user.tag} (${member.user.id})\n**Razón:** Bot no autorizado\n**Acción:** Expulsado automáticamente`)
      .setColor(0xFF0000)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    
    await sendSecurityLog(member.guild, logEmbed);
  } catch (error) {
    console.error('Error expulsando bot no autorizado:', error);
  }
});

// Anti-Channel Spam (Creación/Eliminación masiva)
client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  
  const settings = getAntiRaidSettings(channel.guild.id);
  if (!settings.antiChannelSpam) return;
  
  const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 10 }); // CHANNEL_CREATE
  const createLog = auditLogs.entries.first();
  
  if (!createLog) return;
  const executor = createLog.executor;
  
  if (executor.bot || isWhitelisted(channel.guild.id, executor.id)) return;
  
  const key = `${channel.guild.id}-${executor.id}`;
  if (!client.antiRaid.channelActions.has(key)) {
    client.antiRaid.channelActions.set(key, []);
  }
  
  const tracker = client.antiRaid.channelActions.get(key);
  const now = Date.now();
  tracker.push({ time: now, action: 'create' });
  
  const recentActions = tracker.filter(a => now - a.time < settings.channelTimeWindow);
  client.antiRaid.channelActions.set(key, recentActions);
  
  if (recentActions.length > settings.maxChannelActions) {
    try {
      const member = await channel.guild.members.fetch(executor.id);
      if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
      
      await member.roles.set([], 'Spam de canales detectado - Anti-Raid');
      
      const logEmbed = new EmbedBuilder()
        .setTitle('🛡️ Anti-Channel Spam: Usuario Bloqueado')
        .setDescription(`**Usuario:** ${executor.tag} (${executor.id})\n**Razón:** ${recentActions.length} canales creados en ${settings.channelTimeWindow/1000}s\n**Acción:** Roles removidos`)
        .setColor(0xFF0000)
        .setTimestamp();
      
      await sendSecurityLog(channel.guild, logEmbed);
      client.antiRaid.channelActions.delete(key);
    } catch (error) {
      console.error('Error bloqueando spam de canales:', error);
    }
  }
});

client.on('channelDelete', async (channel) => {
  if (!channel.guild) return;
  
  const settings = getAntiRaidSettings(channel.guild.id);
  if (!settings.antiChannelSpam) return;
  
  const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }); // CHANNEL_DELETE
  const deleteLog = auditLogs.entries.first();
  
  if (!deleteLog) return;
  const executor = deleteLog.executor;
  
  if (executor.bot || isWhitelisted(channel.guild.id, executor.id)) return;
  
  const key = `${channel.guild.id}-${executor.id}`;
  if (!client.antiRaid.channelActions.has(key)) {
    client.antiRaid.channelActions.set(key, []);
  }
  
  const tracker = client.antiRaid.channelActions.get(key);
  const now = Date.now();
  tracker.push({ time: now, action: 'delete' });
  
  const recentActions = tracker.filter(a => now - a.time < settings.channelTimeWindow);
  client.antiRaid.channelActions.set(key, recentActions);
  
  if (recentActions.length > settings.maxChannelActions) {
    try {
      const member = await channel.guild.members.fetch(executor.id);
      if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
      
      await member.roles.set([], 'Spam de eliminación de canales - Anti-Raid');
      
      const logEmbed = new EmbedBuilder()
        .setTitle('🛡️ Anti-Channel Spam: Usuario Bloqueado')
        .setDescription(`**Usuario:** ${executor.tag} (${executor.id})\n**Razón:** ${recentActions.length} canales eliminados en ${settings.channelTimeWindow/1000}s\n**Acción:** Roles removidos`)
        .setColor(0xFF0000)
        .setTimestamp();
      
      await sendSecurityLog(channel.guild, logEmbed);
      client.antiRaid.channelActions.delete(key);
    } catch (error) {
      console.error('Error bloqueando spam de canales:', error);
    }
  }
});

// ===== SISTEMA DE LOGS COMPLETO =====

// LOG: Mensaje eliminado
client.on('messageDelete', async (message) => {
  if (!message.guild || message.author?.bot) return;
  
  try {
    // Intentar obtener quién lo borró desde Audit Logs
    const fetchedLogs = await message.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageDelete,
    });
    
    const deletionLog = fetchedLogs.entries.first();
    let executor = 'Desconocido (Borrado por autor o bot)';
    
    // Verificamos si el log es reciente y coincide con el canal
    if (deletionLog) {
      const { executor: user, target, createdTimestamp } = deletionLog;
      // Si el log es de hace menos de 5 segundos y coincide el autor del mensaje borrado
      if (target.id === message.author.id && (Date.now() - createdTimestamp) < 5000) {
        executor = `${user.tag} (${user.id})`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Mensaje Eliminado')
      .setDescription(`**Autor:** ${message.author?.tag || 'Desconocido'}\n**Canal:** ${message.channel}\n**Eliminado por:** ${executor}\n**Fecha:** <t:${Math.floor(Date.now()/1000)}:F>`)
      .addFields(
        { name: '📝 Contenido', value: message.content || '*Sin contenido de texto (posiblemente imagen o embed)*' }
      )
      .setColor(0xFF0000)
      .setTimestamp();
    
    if (message.attachments.size > 0) {
      embed.addFields({ name: '📎 Archivos', value: message.attachments.map(a => a.url).join('\n').substring(0, 1024) });
    }
    
    await sendLogEmbed(message.guild, embed, 'messageDelete');
  } catch (error) {
    console.error('Error procesando log de mensaje eliminado:', error);
  }
});

// LOG: Mensaje editado / fijado / desfijado
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;

  const pinnedChanged = typeof oldMessage.pinned === 'boolean' && oldMessage.pinned !== newMessage.pinned;
  if (pinnedChanged) {
    const embed = new EmbedBuilder()
      .setTitle(newMessage.pinned ? '📌 Mensaje Fijado' : '🔓 Mensaje Desfijado')
      .setDescription(`**Autor:** ${newMessage.author.tag}\n**Canal:** ${newMessage.channel}\n**Fecha:** <t:${Math.floor(Date.now()/1000)}:F>\n[Ir al mensaje](${newMessage.url})`)
      .setColor(newMessage.pinned ? 0x00BFFF : 0xFFA500)
      .setTimestamp();

    try {
      await sendLogEmbed(newMessage.guild, embed, 'messageUpdate');
    } catch (error) {
      console.error('Error enviando log de mensaje fijado/desfijado:', error);
    }
  }

  if (oldMessage.content === newMessage.content) return;

  const embed = new EmbedBuilder()
    .setTitle('✏️ Mensaje Editado')
    .setDescription(`**Autor:** ${newMessage.author.tag}\n**Canal:** ${newMessage.channel}\n**Fecha:** <t:${Math.floor(Date.now()/1000)}:F>\n[Ir al mensaje](${newMessage.url})`)
    .addFields(
      { name: '📝 Antes', value: oldMessage.content?.substring(0, 1024) || '*Sin contenido*' },
      { name: '📝 Después', value: newMessage.content?.substring(0, 1024) || '*Sin contenido*' }
    )
    .setColor(0xFFA500)
    .setTimestamp();

  try {
    await sendLogEmbed(newMessage.guild, embed, 'messageUpdate');
  } catch (error) {
    console.error('Error enviando log de mensaje editado:', error);
  }
});

// LOG: Usuario se une / Bot añadido
client.on('guildMemberAdd', async (member) => {
  const accountAge = Date.now() - member.user.createdTimestamp;
  const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
  const isBot = member.user.bot;
  
  const embed = new EmbedBuilder()
    .setTitle(isBot ? '➕ Bot Añadido' : '👋 Usuario se Unió')
    .setDescription(`**Usuario:** ${member.user.tag} (${member.user.id})\n**Mención:** ${member}\n**Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${accountAgeDays} días)`)
    .setThumbnail(member.user.displayAvatarURL())
    .setColor(isBot ? 0x7289DA : 0x00FF00)
    .setFooter({ text: `Total de miembros: ${member.guild.memberCount}` })
    .setTimestamp();
  
  if (isBot) {
    embed.addFields({ name: '🤖 Es un Bot', value: 'Sí' });
  }
  
  try {
    await sendLogEmbed(member.guild, embed, 'guildMemberAdd');
  } catch (error) {
    console.error('Error enviando log de usuario añadido:', error);
  }

  // --- Sistema de Bienvenidas Pro ---
  try {
    const welcomeConfigPath = path.join(__dirname, 'config', 'welcome-config.json');
    if (fs.existsSync(welcomeConfigPath)) {
      const welcomeConfig = JSON.parse(fs.readFileSync(welcomeConfigPath, 'utf8'));
      const guildConfig = welcomeConfig[member.guild.id];
      
      if (guildConfig && guildConfig.enabled && guildConfig.channel) {
        console.log(`[WELCOME DEBUG] Configurado para ${member.guild.name} (#${guildConfig.channel})`);
        
        let welcomeChannel = member.guild.channels.cache.get(guildConfig.channel);
        if (!welcomeChannel) {
           welcomeChannel = await member.guild.channels.fetch(guildConfig.channel).catch(() => null);
        }

        if (welcomeChannel) {
          const title = (guildConfig.title || '¡Bienvenido {user}!')
            .replace(/{user}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);

          const welcomeMsg = (guildConfig.message || '¡Bienvenido {user} a {server}!')
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);
          
          // ===== SISTEMA DE TARJETA DE BIENVENIDA (JIMP LOCAL) =====
          const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
          
          let bgPath = null;
          if (guildConfig.background) {
            // Si subió archivo local
            if (guildConfig.background.startsWith('/uploads/') || guildConfig.background.includes('/uploads/')) {
               const fileName = path.basename(guildConfig.background);
               const candidate = path.join(__dirname, 'uploads', fileName);
               if (fs.existsSync(candidate)) bgPath = candidate;
            } else if (guildConfig.background.startsWith('http')) {
               bgPath = guildConfig.background; // Jimp puede leer URLs HTTP/HTTPS
            }
          }

          let cardBuffer = null;
          try {
            const { generateWelcomeCard } = require('./scripts/welcome-card.js');
            cardBuffer = await generateWelcomeCard({
              bgPath: bgPath,
              avatarUrl: avatarUrl,
              username: member.user.username,
              title: title,
              memberCount: member.guild.memberCount,
              color: guildConfig.color || '#5865f2'
            });
          } catch (err) {
            console.error('[WELCOME] Error generando tarjeta local Jimp:', err.message);
          }

          // Construir embed
          const welcomeEmbed = new EmbedBuilder()
            .setColor(guildConfig.color || '#5865f2')
            .setAuthor({ name: member.user.username, iconURL: avatarUrl })
            .setTitle(title)
            .setDescription(`**Miembro #${member.guild.memberCount}**`)
            .setTimestamp()
            .setFooter({ text: `¡Bienvenido al servidor!` });

          const msgOptions = { content: welcomeMsg, embeds: [welcomeEmbed] };

          if (cardBuffer) {
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome.png' });
            welcomeEmbed.setImage('attachment://welcome.png');
            msgOptions.files = [attachment];
          } else {
            welcomeEmbed.setThumbnail(avatarUrl);
          }

          try {
            await welcomeChannel.send(msgOptions);
            console.log(`[WELCOME SUCCESS] Tarjeta enviada a ${member.user.tag}`);
          } catch (err) {
            console.error('[WELCOME] Fallo enviando mensaje de bienvenida:', err.message);
          }
        } else {
          console.log(`[WELCOME ERROR] No se encontró el canal ${guildConfig.channel}`);
        }
      }
    }
  } catch (e) { 
    console.error('❌ [WELCOME CRITICAL ERROR]:', e); 
  }
});

// LOG: Usuario sale / Bot eliminado / Expulsado / Baneado
client.on('guildMemberRemove', async (member) => {
  let reason = 'Salió del servidor';
  let executor = 'N/A';
  const isBot = member.user.bot;
  let isKick = false;
  let isBanned = false;
  
  try {
    // Primero intentar detectar kick (más común)
    const kickLogs = await member.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberKick });
    let kickLog = null;
    for (const [id, entry] of kickLogs.entries) {
      if (entry.target.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
        kickLog = entry;
        break;
      }
    }
    
    if (kickLog) {
      reason = kickLog.reason || 'Sin razón';
      executor = kickLog.executor.tag;
      isKick = true;
    } else {
      // Si no fue kick, buscar ban
      const banLogs = await member.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberBanAdd });
      let banLog = null;
      for (const [id, entry] of banLogs.entries) {
        if (entry.target.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
          banLog = entry;
          break;
        }
      }
      
      if (banLog) {
        reason = banLog.reason || 'Sin razón';
        executor = banLog.executor.tag;
        isBanned = true;
      }
    }
  } catch (e) {
    console.error('Error leyendo audit logs en guildMemberRemove:', e);
  }
  
  const embed = new EmbedBuilder()
    .setTitle(isBanned ? '🔨 Miembro baneado' : (isKick ? '👢 Miembro expulsado' : (isBot ? '➖ Bot Eliminado' : '👋 Usuario Salió')))
    .setDescription(`**Usuario:** ${member.user.tag} (${member.user.id})\n**Mención:** ${member}\n**Razón:** ${reason}\n**Ejecutor:** ${executor}`)
    .setThumbnail(member.user.displayAvatarURL())
    .setColor(isBanned ? 0xFF0000 : (isKick ? 0xFFA500 : (isBot ? 0x7289DA : 0xFF0000)))
    .setFooter({ text: `Total de miembros: ${member.guild.memberCount}` })
    .setTimestamp();
  
  await sendLogEmbed(member.guild, embed, isBanned ? 'guildBanAdd' : (isKick ? 'guildMemberKick' : 'guildMemberRemove'));
});

// LOG: Roles modificados / Miembro actualizado / Nickname / Timeout
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  // LOG: Apodo cambiado
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setTitle('✏️ Apodo Cambiado')
      .setDescription(`**Usuario:** ${newMember.user.tag}\n**Antes:** ${oldMember.nickname || '*Sin apodo*'}\n**Después:** ${newMember.nickname || '*Sin apodo*'}`)
      .setColor(0x00BFFF)
      .setTimestamp();
    await sendLogEmbed(newMember.guild, embed, 'guildMemberUpdate');
  }

  // LOG: Timeout / Aislamiento
  const oldTimeout = oldMember.communicationDisabledUntil?.getTime() || 0;
  const newTimeout = newMember.communicationDisabledUntil?.getTime() || 0;
  if (oldTimeout !== newTimeout) {
    const isTimeout = newTimeout > Date.now();
    const embed = new EmbedBuilder()
      .setTitle(isTimeout ? '🔇 Usuario Silenciado (Timeout)' : '🔊 Silencio Eliminado')
      .setDescription(`**Usuario:** ${newMember.user.tag}\n${isTimeout ? `**Hasta:** <t:${Math.floor(newTimeout / 1000)}:F>` : 'El aislamiento ha terminado o fue removido.'}`)
      .setColor(isTimeout ? 0xFF8C00 : 0x00FF00)
      .setTimestamp();
    await sendLogEmbed(newMember.guild, embed, 'guildMemberTimeout');
  }

  // LOG: Roles Añadidos / Removidos
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;
  const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
  const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
  
  if (addedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setTitle('➕ Rol Añadido')
      .setDescription(`**Usuario:** ${newMember.user.tag}\n**Roles añadidos:** ${addedRoles.map(r => r.name).join(', ')}`)
      .setColor(0x00FF00)
      .setTimestamp();
    await sendLogEmbed(newMember.guild, embed, 'roleAdd');
  }
  
  if (removedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setTitle('➖ Rol Removido')
      .setDescription(`**Usuario:** ${newMember.user.tag}\n**Roles quitados:** ${removedRoles.map(r => r.name).join(', ')}`)
      .setColor(0xFF0000)
      .setTimestamp();
    await sendLogEmbed(newMember.guild, embed, 'roleRemove');
  }

  // LOG: Boost del servidor
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Boost del servidor')
      .setDescription(`**Usuario:** ${newMember.user.tag} ha empezado a boostear el servidor!`)
      .setColor(0xFFD700)
      .setTimestamp();
    await sendLogEmbed(newMember.guild, embed, 'guildUpdate');
  }
});

// LOG: Ban
client.on('guildBanAdd', async (ban) => {
  let executor = 'Desconocido';
  let reason = ban.reason || 'Sin razón';
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const entry = auditLogs.entries.first();
    if (entry && entry.target.id === ban.user.id) {
      executor = entry.executor.tag;
      reason = entry.reason || reason;
    }
  } catch (e) {}
  const embed = new EmbedBuilder()
    .setTitle('🔨 Miembro baneado')
    .setDescription(`**Usuario:** ${ban.user.tag} (${ban.user.id})\n**Baneado por:** ${executor}\n**Razón:** ${reason}`)
    .setThumbnail(ban.user.displayAvatarURL())
    .setColor(0xFF0000)
    .setTimestamp();
  await sendLogEmbed(ban.guild, embed, 'guildBanAdd');
});

// LOG: Unban
client.on('guildBanRemove', async (ban) => {
  let executor = 'Desconocido';
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
    const entry = auditLogs.entries.first();
    if (entry && entry.target.id === ban.user.id) executor = entry.executor.tag;
  } catch (e) {}
  const embed = new EmbedBuilder()
    .setTitle('🔓 Miembro desbaneado')
    .setDescription(`**Usuario:** ${ban.user.tag} (${ban.user.id})\n**Desbaneado por:** ${executor}`)
    .setThumbnail(ban.user.displayAvatarURL())
    .setColor(0x00FF00)
    .setTimestamp();
  await sendLogEmbed(ban.guild, embed, 'guildBanRemove');
});

// LOG: Servidor actualizado
client.on('guildUpdate', async (oldGuild, newGuild) => {
  const changes = [];
  if (oldGuild.name !== newGuild.name) changes.push(`Nombre: **${oldGuild.name}** ➜ **${newGuild.name}**`);
  if (oldGuild.icon !== newGuild.icon) changes.push('Icono cambiado');
  if (oldGuild.description !== newGuild.description) changes.push(`Descripción: **${oldGuild.description || 'Ninguna'}** ➜ **${newGuild.description || 'Ninguna'}**`);
  if (changes.length === 0) return;
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Servidor actualizado')
    .setDescription(`**Cambios:**\n${changes.join('\n')}`)
    .setColor(0x5865f2)
    .setTimestamp();
  await sendLogEmbed(newGuild, embed, 'guildUpdate');
});

// LOG: Invitación creada
client.on('inviteCreate', async (invite) => {
  const embed = new EmbedBuilder()
    .setTitle('📩 Invitación creada')
    .setDescription(`**Código:** ${invite.code}\n**Canal:** ${invite.channel}\n**Creador:** ${invite.inviter?.tag || 'Desconocido'}`)
    .setColor(0x00FF00)
    .setTimestamp();
  await sendLogEmbed(invite.guild, embed, 'inviteCreate');
});

// LOG: Invitación borrada
client.on('inviteDelete', async (invite) => {
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Invitación borrada')
    .setDescription(`**Código:** ${invite.code}\n**Canal:** ${invite.channel?.name || 'Desconocido'}`)
    .setColor(0xFF0000)
    .setTimestamp();
  await sendLogEmbed(invite.guild, embed, 'inviteDelete');
});

// LOG: Webhook actualizado
client.on('webhookUpdate', async (channel) => {
  const embed = new EmbedBuilder()
    .setTitle('🔗 Webhook actualizado')
    .setDescription(`**Canal:** ${channel}`)
    .setColor(0x5865f2)
    .setTimestamp();
  await sendLogEmbed(channel.guild, embed, 'webhookUpdate');
});

// LOG: Canal creado / borrado / actualizado
client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setTitle('➕ Canal Creado')
    .setDescription(`**Canal:** ${channel}\n**Tipo:** ${channel.type}\n**ID:** ${channel.id}`)
    .setColor(0x00FF00)
    .setTimestamp();
  await sendLogEmbed(channel.guild, embed, 'channelCreate');
});

client.on('channelDelete', async (channel) => {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setTitle('❌ Canal Borrado')
    .setDescription(`**Nombre:** ${channel.name}\n**Tipo:** ${channel.type}\n**ID:** ${channel.id}`)
    .setColor(0xFF0000)
    .setTimestamp();
  await sendLogEmbed(channel.guild, embed, 'channelDelete');
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  const changes = [];
  if (oldChannel.name !== newChannel.name) changes.push(`Nombre: **${oldChannel.name}** ➜ **${newChannel.name}**`);
  if (oldChannel.topic !== newChannel.topic) changes.push(`Tema: **${oldChannel.topic || 'Ninguno'}** ➜ **${newChannel.topic || 'Ninguno'}**`);
  
  // Detectar cambios de permisos
  const oldPerms = oldChannel.permissionOverwrites.cache;
  const newPerms = newChannel.permissionOverwrites.cache;
  if (!oldPerms.equals(newPerms)) {
    const embed = new EmbedBuilder()
      .setTitle('🔐 Permisos de Canal Actualizados')
      .setDescription(`**Canal:** ${newChannel}\nSe han modificado los permisos del canal.`)
      .setColor(0xFFA500)
      .setTimestamp();
    await sendLogEmbed(newChannel.guild, embed, 'channelPermissionsUpdate');
  }

  if (changes.length > 0) {
    const embed = new EmbedBuilder()
      .setTitle('✏️ Canal Actualizado')
      .setDescription(`**Canal:** ${newChannel}\n\n**Cambios:**\n${changes.join('\n')}`)
      .setColor(0xFFA500)
      .setTimestamp();
    await sendLogEmbed(newChannel.guild, embed, 'channelUpdate');
  }
});

// LOG: Hilos
client.on('threadCreate', async (thread) => {
  const embed = new EmbedBuilder()
    .setTitle('🧵 Hilo Creado')
    .setDescription(`**Nombre:** ${thread.name}\n**Canal:** ${thread.parent}`)
    .setColor(0x00FF00)
    .setTimestamp();
  await sendLogEmbed(thread.guild, embed, 'threadCreate');
});

client.on('threadDelete', async (thread) => {
  const embed = new EmbedBuilder()
    .setTitle('🧵 Hilo Eliminado')
    .setDescription(`**Nombre:** ${thread.name}\n**ID:** ${thread.id}`)
    .setColor(0xFF0000)
    .setTimestamp();
  await sendLogEmbed(thread.guild, embed, 'threadDelete');
});

client.on('threadUpdate', async (oldThread, newThread) => {
  if (oldThread.name !== newThread.name) {
    const embed = new EmbedBuilder()
      .setTitle('🧵 Hilo Actualizado')
      .setDescription(`**Antes:** ${oldThread.name}\n**Después:** ${newThread.name}`)
      .setColor(0xFFA500)
      .setTimestamp();
    await sendLogEmbed(newThread.guild, embed, 'threadUpdate');
  }
});

// LOG: Roles Creados / Borrados / Actualizados
client.on('roleCreate', async (role) => {
  const embed = new EmbedBuilder()
    .setTitle('➕ Rol Creado')
    .setDescription(`**Nombre:** ${role.name}\n**ID:** ${role.id}`)
    .setColor(0x00FF00)
    .setTimestamp();
  await sendLogEmbed(role.guild, embed, 'roleCreate');
});

client.on('roleDelete', async (role) => {
  const embed = new EmbedBuilder()
    .setTitle('❌ Rol Borrado')
    .setDescription(`**Nombre:** ${role.name}\n**ID:** ${role.id}`)
    .setColor(0xFF0000)
    .setTimestamp();
  await sendLogEmbed(role.guild, embed, 'roleDelete');
});

client.on('roleUpdate', async (oldRole, newRole) => {
  if (oldRole.name !== newRole.name) {
    const embed = new EmbedBuilder()
      .setTitle('✏️ Rol Actualizado')
      .setDescription(`**Antes:** ${oldRole.name}\n**Después:** ${newRole.name}`)
      .setColor(0xFFA500)
      .setTimestamp();
    await sendLogEmbed(newRole.guild, embed, 'roleUpdate');
  }
});

// LOG: Voz granular + Funcionalidad
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const member = newState.member || oldState.member;
    if (!member) return;
    const guild = newState.guild || oldState.guild;
    const joinedChannel = newState.channel;
    const leftChannel = oldState.channel;

    // --- 1. LOGS GRANULARES ---
    // Unirse
    if (!leftChannel && joinedChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🔊 Miembro se unió a voz')
        .setDescription(`**Usuario:** ${member.user.tag}\n**Canal:** ${joinedChannel}`)
        .setColor(0x00FF00)
        .setTimestamp();
      await sendLogEmbed(guild, embed, 'voiceJoin');
    }
    // Salir
    else if (leftChannel && !joinedChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🔇 Miembro salió de voz')
        .setDescription(`**Usuario:** ${member.user.tag}\n**Canal:** ${leftChannel}`)
        .setColor(0xFF0000)
        .setTimestamp();
      await sendLogEmbed(guild, embed, 'voiceDisconnect');
    }
    // Moverse
    else if (leftChannel && joinedChannel && leftChannel.id !== joinedChannel.id) {
      const embed = new EmbedBuilder()
        .setTitle('🔀 Miembro movido de voz')
        .setDescription(`**Usuario:** ${member.user.tag}\n**De:** ${leftChannel}\n**A:** ${joinedChannel}`)
        .setColor(0xFFA500)
        .setTimestamp();
      await sendLogEmbed(guild, embed, 'voiceMove');
    }

    // --- 2. SISTEMA DE SOPORTE DE VOZ ---
    const staffRoleId = client.voiceSupportStaffRole.get(guild.id);
    const sanctionedRoleId = client.voiceSupportSanctionedRole.get(guild.id);

    if (joinedChannel && isWaitingRoom(joinedChannel)) {
      const nextRoleId = client.voiceSupportNextRole.get(guild.id);
      const hasStaffRole = staffRoleId && member.roles.cache.has(staffRoleId);
      const hasNextRole = nextRoleId && member.roles.cache.has(nextRoleId);

      if (hasStaffRole || hasNextRole) {
        const supportChannels = findSupportChannels(guild);
        if (supportChannels.size > 0) {
          setTimeout(async () => {
            const currentChannel = member.voice?.channel;
            if (currentChannel && isWaitingRoom(currentChannel)) {
              const support1 = guild.channels.cache.find(ch => ch.type === ChannelType.GuildVoice && ch.name.toLowerCase().includes('soporte-1'));
              const target = support1 || supportChannels.first();
              await member.voice.setChannel(target);
            }
          }, 500);
        }
        return;
      }

      if (sanctionedRoleId && member.roles.cache.has(sanctionedRoleId)) {
        const support1 = guild.channels.cache.find(ch => ch.type === ChannelType.GuildVoice && ch.name.toLowerCase().includes('soporte-1'));
        if (support1) await member.voice.setChannel(support1);
        return;
      }

      // Cola de espera
      if (!client.voiceSupportQueue.has(guild.id)) client.voiceSupportQueue.set(guild.id, []);
      const queue = client.voiceSupportQueue.get(guild.id);
      if (!queue.includes(member.id)) {
        queue.push(member.id);
        if (!client.voiceSupportWaitingTime.has(guild.id)) client.voiceSupportWaitingTime.set(guild.id, new Map());
        client.voiceSupportWaitingTime.get(guild.id).set(member.id, Date.now());
      }
    }

    // --- 3. SALAS TEMPORALES ---
    if (joinedChannel && joinedChannel.name === '🔊 Crear sala') {
      const privateChannel = await guild.channels.create({
        name: `🔊 Sala de ${member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: joinedChannel.parent ?? null,
        permissionOverwrites: [{ id: member.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.ManageChannels] }]
      });
      client.tempVoiceChannels.add(privateChannel.id);
      client.tempVoiceChannelOwners.set(privateChannel.id, member.id);
      await member.voice.setChannel(privateChannel);
      
      setTimeout(async () => {
        const interfacePanel = buildVoiceInterfacePanel();
        await privateChannel.send({ content: `${member}`, embeds: [interfacePanel.embed], components: interfacePanel.rows });
      }, 2000);
    }

    // Eliminar si se vacía
    if (leftChannel && client.tempVoiceChannels.has(leftChannel.id) && leftChannel.members.size === 0) {
      await leftChannel.delete('Sala temporal vacía').catch(() => {});
      client.tempVoiceChannels.delete(leftChannel.id);
    }

  } catch (error) {
    console.error('Error en voiceStateUpdate:', error);
  }
});

// NUEVA FUNCIÓN: Verificar si un usuario puede usar comandos del bot
function canUseCommand(member, guildId) {
  // El owner del servidor siempre puede usar todos los comandos
  if (member.id === member.guild.ownerId) return true;
  
  // Verificar si hay roles configurados para este servidor
  const allowedRoles = client.commandRoles.get(guildId);
  if (!allowedRoles || allowedRoles.length === 0) {
    // Si no hay roles configurados, todos pueden usar los comandos
    return true;
  }
  
  // Verificar si el usuario tiene alguno de los roles permitidos
  return allowedRoles.some(roleId => member.roles.cache.has(roleId));
}

// Construye el panel de interfaz de voz (embed + filas de botones)
function buildVoiceInterfacePanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎶 Interfaz de Canales de Voz Temporales')
    .setDescription('Esta interfaz puede ser usada para gestionar canales de voz temporales. Más opciones disponibles con comandos de voz.')
    .addFields(
      { name: '📝 Acciones disponibles:', value: '✏️ NOMBRE - Cambiar nombre del canal\n🎚️ LÍMITE - Establecer límite de usuarios\n🔒 PRIVACIDAD - Hacer canal privado/público\n📨 INVITAR - Invitar usuarios\n👢 EXPULSAR - Expulsar usuario (puede volver)\n🚫 BAN - Banear usuario (no puede volver)\n✅ UNBAN - Quitar ban de usuario\n👑 REIVINDICAR - Tomar control del canal si el dueño se fue\n🔁 TRANSFERIR - Transferir propiedad\n🗑️ ELIMINAR - Eliminar canal' }
    )
    .setColor(0x00FFAA)
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vi_name').setLabel('NOMBRE').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
    new ButtonBuilder().setCustomId('vi_limit').setLabel('LÍMITE').setStyle(ButtonStyle.Primary).setEmoji('🎚️'),
    new ButtonBuilder().setCustomId('vi_privacy').setLabel('PRIVACIDAD').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('vi_invite').setLabel('INVITAR').setStyle(ButtonStyle.Success).setEmoji('📨')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vi_kick').setLabel('EXPULSAR').setStyle(ButtonStyle.Danger).setEmoji('👢'),
    new ButtonBuilder().setCustomId('vi_ban').setLabel('BAN').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
    new ButtonBuilder().setCustomId('vi_unban').setLabel('UNBAN').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('vi_claim').setLabel('REIVINDICAR').setStyle(ButtonStyle.Success).setEmoji('👑'),
    new ButtonBuilder().setCustomId('vi_transfer').setLabel('TRANSFERIR').setStyle(ButtonStyle.Secondary).setEmoji('🔁')
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vi_delete').setLabel('ELIMINAR').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    new ButtonBuilder().setCustomId('vi_info').setLabel('INFO').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️')
  );

  return { embed, rows: [row1, row2, row3] };
}

// Función para crear roles de colores
async function createColorRole(guild, color) {
  try {
    const role = await guild.roles.create({
      name: `Color ${color}`,
      color: color,
      permissions: [],
      reason: 'Rol de color automático'
    });
    return role;
  } catch (error) {
    console.error('Error creando rol de color:', error);
    return null;
  }
}

// Función para cambiar colores automáticamente
function startColorRotation(guild, speedSeconds = 5) {
  const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500, 0x800080];
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
          await role.setColor(colors[currentIndex]);
          currentIndex = (currentIndex + 1) % colors.length;
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

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    console.log('🔍 Comando recibido:', commandName, 'por:', interaction.user.tag);
    
    // Comando enviarmd - PRIMERO PARA EVITAR INTERFERENCIAS
    if (commandName === 'enviarmd') {
      try {
        console.log('📧 Comando enviarmd ejecutado por:', interaction.user.tag);
        
        // IMPORTANTE: Responder inmediatamente para evitar "La aplicación no ha respondido"
        await interaction.deferReply({ ephemeral: true });
        
        // Verificar permisos de staff
        if (!hasStaffPermission(interaction.member, interaction.guild)) {
          return await interaction.editReply({ 
            content: '❌ No tienes permisos de staff para usar este comando.'
          });
        }

        // Obtener usuario por mención o ID
        let targetUser = interaction.options.getUser('usuario');
        const userId = interaction.options.getString('id');
        
        // Si no hay mención pero hay ID, buscar el usuario por ID
        if (!targetUser && userId) {
          try {
            console.log(`🔍 Buscando usuario por ID: ${userId}`);
            targetUser = await client.users.fetch(userId);
            console.log(`✅ Usuario encontrado: ${targetUser.tag}`);
          } catch (fetchError) {
            console.error('❌ Error al buscar usuario por ID:', fetchError);
            return await interaction.editReply({ 
              content: `❌ No se pudo encontrar un usuario con el ID: \`${userId}\`. Verifica que el ID sea correcto.`
            });
          }
        }
        
        // Validar que se proporcionó al menos una opción
        if (!targetUser) {
          return await interaction.editReply({ 
            content: '❌ Debes proporcionar un usuario (mención) o un ID de usuario.'
          });
        }

        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const subtitulo = interaction.options.getString('subtitulo') || null;
        const color = interaction.options.getString('color') || '#0099FF';

        // Validar que el color sea hexadecimal válido
        let embedColor = 0x0099FF;
        if (color.match(/^#[0-9A-F]{6}$/i)) {
          embedColor = parseInt(color.replace('#', ''), 16);
        }

        // Crear el embed
        const dmEmbed = new EmbedBuilder()
          .setTitle(titulo)
          .setDescription(descripcion)
          .setColor(embedColor)
          .setFooter({ text: `Mensaje enviado desde ${interaction.guild.name}` })
          .setTimestamp();

        // Agregar subtítulo como campo si existe
        if (subtitulo) {
          dmEmbed.addFields({ name: '📌 Información adicional', value: subtitulo, inline: false });
        }

        // Intentar enviar el DM
        try {
          console.log(`📤 Intentando enviar MD a: ${targetUser.tag} (${targetUser.id})`);
          await targetUser.send({ embeds: [dmEmbed] });
          console.log(`✅ MD enviado exitosamente a: ${targetUser.tag}`);
          
          // Confirmar al usuario que usó el comando
          const confirmEmbed = new EmbedBuilder()
            .setTitle('✅ Mensaje Directo Enviado')
            .setDescription(`El mensaje fue enviado exitosamente a **${targetUser.tag}**`)
            .setColor(0x00FF00)
            .addFields(
              { name: '📧 Destinatario', value: `${targetUser.tag} (${targetUser})`, inline: true },
              { name: '📝 Título', value: titulo, inline: true },
              { name: '📄 Descripción', value: descripcion.substring(0, 100) + (descripcion.length > 100 ? '...' : ''), inline: false }
            )
            .setTimestamp();

          return await interaction.editReply({ embeds: [confirmEmbed] });
          
        } catch (dmError) {
          console.error('❌ Error enviando DM:', dmError);
          console.error('❌ Código de error:', dmError.code);
          console.error('❌ Mensaje de error:', dmError.message);
          
          let errorMessage = `❌ No se pudo enviar el mensaje directo a **${targetUser.tag}**.`;
          
          // Identificar el tipo específico de error
          if (dmError.code === 50007) {
            errorMessage += '\n\n**Motivo:** El usuario tiene los mensajes directos desactivados o ha bloqueado al bot.';
          } else if (dmError.code === 50013) {
            errorMessage += '\n\n**Motivo:** El bot no tiene permisos suficientes.';
          } else if (dmError.message.includes('Cannot send messages to this user')) {
            errorMessage += '\n\n**Motivo:** No se puede enviar mensajes a este usuario. Verifica que:\n• El bot comparta al menos un servidor con el usuario\n• El usuario tenga los DM abiertos\n• El usuario no haya bloqueado al bot';
          } else {
            errorMessage += `\n\n**Motivo:** ${dmError.message}`;
          }
          
          return await interaction.editReply({ 
            content: errorMessage
          });
        }
        
      } catch (error) {
        console.error('❌ Error en comando enviarmd:', error);
        // Si falla antes del deferReply, intentar responder normalmente
        if (!interaction.deferred && !interaction.replied) {
          return await interaction.reply({ 
            content: '❌ Error al procesar el comando. Revisa los parámetros e intenta de nuevo.',
            ephemeral: true
          });
        } else {
          return await interaction.editReply({ 
            content: '❌ Error al procesar el comando. Revisa los parámetros e intenta de nuevo.'
          });
        }
      }
    }

    // Comando avatar
    if (commandName === 'avatar') {
      console.log('🎯 AVATAR: Comando ejecutado por:', interaction.user.tag);
      
      try {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        console.log('🎯 AVATAR: Usuario objetivo:', targetUser.tag);
        
        // Embed simple con imagen del avatar
        const embed = new EmbedBuilder()
          .setTitle(`🖼️ Avatar de ${targetUser.username}`)
          .setImage(targetUser.displayAvatarURL({ size: 4096, dynamic: true }))
          .setColor(0x0099FF)
          .setFooter({ text: `Solicitado por ${interaction.user.username}` })
          .setTimestamp();
        
        console.log('🎯 AVATAR: Enviando respuesta...');
        await interaction.reply({ embeds: [embed] });
        console.log('🎯 AVATAR: ¡Respuesta enviada correctamente!');
        return;
        
      } catch (error) {
        console.error('🎯 AVATAR: Error:', error);
        await interaction.reply({ content: '❌ Error al obtener el avatar.', ephemeral: true });
        return;
      }
    }

    // Comando userinfo
    if (commandName === 'userinfo') {
      console.log('👤 Comando userinfo ejecutado por:', interaction.user.tag);
      
      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ Este comando solo funciona en servidores.',
          ephemeral: true
        });
      }

      const targetUser = interaction.options.getUser('usuario') || interaction.user;
      let targetMember = null;

      try {
        targetMember = await interaction.guild.members.fetch(targetUser.id);
      } catch (error) {
        return interaction.reply({
          content: '❌ Usuario no encontrado en este servidor.',
          ephemeral: true
        });
      }

      const getUserBadges = (flags) => {
        const badges = [];
        if (flags?.has(UserFlags.Staff)) badges.push('🔧 Staff de Discord');
        if (flags?.has(UserFlags.Partner)) badges.push('🤝 Partner de Discord');
        if (flags?.has(UserFlags.Hypesquad)) badges.push('⚡ HypeSquad Events');
        if (flags?.has(UserFlags.BugHunterLevel1)) badges.push('🐛 Bug Hunter');
        if (flags?.has(UserFlags.BugHunterLevel2)) badges.push('🐛 Bug Hunter Oro');
        if (flags?.has(UserFlags.HypeSquadOnlineHouse1)) badges.push('💜 HypeSquad Bravery');
        if (flags?.has(UserFlags.HypeSquadOnlineHouse2)) badges.push('🧡 HypeSquad Brilliance');
        if (flags?.has(UserFlags.HypeSquadOnlineHouse3)) badges.push('💚 HypeSquad Balance');
        if (flags?.has(UserFlags.PremiumEarlySupporter)) badges.push('💎 Early Supporter');
        if (flags?.has(UserFlags.VerifiedDeveloper)) badges.push('🔨 Desarrollador Verificado');
        if (flags?.has(UserFlags.CertifiedModerator)) badges.push('🛡️ Moderador Certificado');
        if (flags?.has(UserFlags.ActiveDeveloper)) badges.push('⚙️ Desarrollador Activo');
        return badges.length > 0 ? badges.join('\n') : 'Sin badges';
      };

      const getKeyPermissions = (member) => {
        const keyPerms = member.permissions.toArray().filter(perm => 
          ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 
           'ManageMessages', 'KickMembers', 'BanMembers', 'MuteMembers'].includes(perm)
        );
        return keyPerms.length > 0 ? keyPerms.join(', ') : 'Permisos básicos';
      };

      const getRolesList = (member) => {
        const roles = member.roles.cache
          .filter(role => role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .first(5)
          .map(role => `<@&${role.id}>`)
          .join(', ');
        
        const totalRoles = member.roles.cache.size - 1;
        return roles || '@everyone' + (totalRoles > 5 ? ` y ${totalRoles - 5} más` : '');
      };

      const getStatusEmoji = (status) => {
        switch(status) {
          case 'online': return '🟢';
          case 'idle': return '🟡';
          case 'dnd': return '🔴';
          case 'offline': return '⚫';
          default: return '❓';
        }
      };

      const getStatusText = (status) => {
        switch(status) {
          case 'online': return 'En línea';
          case 'idle': return 'Ausente';
          case 'dnd': return 'No molestar';
          case 'offline': return 'Desconectado';
          default: return 'Desconocido';
        }
      };

      const getDeviceInfo = (clientStatus) => {
        if (!clientStatus) return 'Desconocido';
        
        const devices = [];
        if (clientStatus.desktop) devices.push('🖥️ Escritorio');
        if (clientStatus.mobile) devices.push('📱 Móvil');
        if (clientStatus.web) devices.push('🌐 Web');
        
        return devices.length > 0 ? devices.join(', ') : 'Desconocido';
      };

      const getMemberStatus = (member) => {
        if (member.isCommunicationDisabled()) return '🔇 Silenciado';
        if (member.roles.cache.has(interaction.guild.roles.everyone.id)) {
          const timeInServer = Date.now() - member.joinedTimestamp;
          const daysInServer = Math.floor(timeInServer / (1000 * 60 * 60 * 24));
          
          if (daysInServer < 7) return '🆕 Nuevo miembro';
          if (daysInServer < 30) return '👤 Miembro activo';
          if (daysInServer < 365) return '⭐ Miembro veterano';
          return '🏆 Miembro legendario';
        }
        return '✅ Miembro activo';
      };

      const getCommunicationStatus = (member) => {
        if (member.isCommunicationDisabled()) {
          const timeout = member.communicationDisabledUntil;
          if (timeout) {
            const timeLeft = timeout.getTime() - Date.now();
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
            return `🔇 Silenciado por ${hoursLeft}h más`;
          }
          return '🔇 Silenciado permanentemente';
        }
        return '✅ Puede comunicarse';
      };

      const getLastActivity = (member) => {
        const lastMessage = member.lastMessageAt;
        if (lastMessage) {
          return `<t:${Math.floor(lastMessage.getTime() / 1000)}:R>`;
        }
        return 'Nunca ha enviado mensajes';
      };

      const embed = new EmbedBuilder()
        .setTitle(`👤 Información de ${targetUser.displayName}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setColor(targetMember.displayColor || 0x5865F2)
        .addFields(
          {
            name: '👤 Información del Usuario',
            value: `**Nombre de usuario:** ${targetUser.username}\n**ID:** \`${targetUser.id}\`\n**Bot:** ${targetUser.bot ? '🤖 Sí' : '👤 No'}\n**Cuenta creada:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
            inline: false
          },
          {
            name: '🏠 Información del Servidor',
            value: `**Se unió:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n**Apodo:** ${targetMember.nickname || 'Ninguno'}\n**Booster:** ${targetMember.premiumSince ? `💎 Desde <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>` : '❌ No'}\n**Color:** ${targetMember.displayHexColor || 'Por defecto'}`,
            inline: false
          },
          {
            name: '🛡️ Estado del Miembro',
            value: `**Estado:** ${getMemberStatus(targetMember)}\n**Comunicación:** ${getCommunicationStatus(targetMember)}\n**Última actividad:** ${getLastActivity(targetMember)}`,
            inline: false
          },
          {
            name: '🟢 Estado del Usuario',
            value: `**Estado:** ${getStatusEmoji(targetMember.presence?.status)} ${getStatusText(targetMember.presence?.status)}\n**Actividad:** ${targetMember.presence?.activities?.[0]?.name || 'Ninguna'}\n**Dispositivo:** ${getDeviceInfo(targetMember.presence?.clientStatus)}`,
            inline: false
          },
          {
            name: '🎭 Roles y Permisos',
            value: `**Roles (${targetMember.roles.cache.size - 1}):** ${getRolesList(targetMember)}\n**Permisos clave:** ${getKeyPermissions(targetMember)}`,
            inline: false
          },
          {
            name: '🏅 Discord Badges',
            value: getUserBadges(targetUser.flags),
            inline: false
          }
        )
        .setFooter({ text: `Solicitado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // Comando channelinfo
    if (commandName === 'channelinfo') {
      console.log('📚 Comando channelinfo ejecutado por:', interaction.user.tag);
      
      const channel = interaction.options.getChannel('canal') || interaction.channel;
      
      const embed = new EmbedBuilder()
        .setColor("#7289DA")
        .setTitle(`📚 Información del Canal #${channel.name}`)
        .setThumbnail(channel.guild.iconURL())
        .setDescription(`¡Aquí tienes los detalles del canal **${channel.name}**!`)
        .addFields(
          { name: "🆔 ID del canal", value: `${channel.id}`, inline: true },
          { name: "🏷️ Tipo", value: `${channel.type}`, inline: true },
          { name: "📆 Creación", value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>` },
          { name: "🔞 NSFW", value: `${channel.nsfw ? 'Sí ✅' : 'No ❌'}`, inline: true },
          { name: "📋 Tópico", value: `${channel.topic || 'No tiene'}` },
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Comando serverrole
    if (commandName === 'serverrole') {
      console.log('🎭 Comando serverrole ejecutado por:', interaction.user.tag);
      
      try {
        const role = interaction.options.getRole('rol');

        if (!role) {
          return interaction.reply({ 
            content: '❌ No se ha proporcionado un rol válido.', 
            ephemeral: true 
          });
        }

        let baseMentionable = role.mentionable ? "Sí" : "No";
        let color = parseInt(role.color);

        if (isNaN(color)) {
          console.warn("El color del rol no es un valor numérico válido, utilizando color predeterminado.");
          color = "ORANGE"; 
        }

        // Obtener información del creador del rol
        let creatorInfo = "Desconocido";
        
        try {
          // Buscar en los audit logs del servidor
          const auditLogs = await interaction.guild.fetchAuditLogs({ 
            limit: 50, 
            type: 30 // ROLE_CREATE
          });
          
          const roleCreateLog = auditLogs.entries.find(entry => 
            entry.target && entry.target.id === role.id
          );
          
          if (roleCreateLog && roleCreateLog.executor) {
            creatorInfo = `${roleCreateLog.executor.username} (${roleCreateLog.executor.id})`;
          } else {
            // Si no encontramos en audit logs, mostrar información básica
            const roleAge = Date.now() - role.createdTimestamp;
            const daysOld = Math.floor(roleAge / (1000 * 60 * 60 * 24));
            creatorInfo = daysOld > 30 ? "Creado hace mucho tiempo" : "Creado recientemente";
          }
        } catch (error) {
          console.log('No se pudo obtener audit logs:', error.message);
          const roleAge = Date.now() - role.createdTimestamp;
          const daysOld = Math.floor(roleAge / (1000 * 60 * 60 * 24));
          creatorInfo = daysOld > 30 ? "Creado hace mucho tiempo" : "Creado recientemente";
        }

        const embed = new EmbedBuilder()
          .setColor("#FF5733")
          .setTitle(`🎭 Información del Rol ${role.name}`)
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .addFields(
            { name: "🆔 ID del Rol", value: `${role.id}`, inline: true },
            { name: "🪪 Nombre del Rol", value: `${role.name}`, inline: true },
            { name: "👤 Creador", value: `${creatorInfo}`, inline: true },
            { name: "📆 Creación del Rol", value: `<t:${parseInt(role.createdTimestamp / 1000)}:d> (<t:${parseInt(role.createdTimestamp / 1000)}:R>)`, inline: true },
            { name: "🎨 Color", value: `${role.color} (${role.hexColor})`, inline: true },
            { name: "📋 Posición", value: `${role.position}`, inline: true },
            { name: "📣 Mencionable", value: `${baseMentionable}`, inline: true }
          )
          .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('❌ Error en serverrole:', error);
        await interaction.reply({ 
          content: '❌ Se ha producido un error al ejecutar el comando.', 
          ephemeral: true 
        });
      }
    }

    // Comando comandos (menú de ayuda)
    if (commandName === 'comandos') {
      console.log('📋 Comando comandos ejecutado por:', interaction.user.tag);
      
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🤖 Comandos del Bot")
        .setDescription("Aquí tienes todos los comandos disponibles del bot:")
        .addFields(
          {
            name: "👤 Información",
            value: "`/userinfo` - Información de usuarios\n`/channelinfo` - Información de canales\n`/serverrole` - Información de roles\n`/avatar` - Avatar de usuarios\n`/userfolder` - Generar archivo de usuarios",
            inline: false
          },
          {
            name: "🛡️ Moderación",
            value: "`/ban` - Banear usuarios\n`/kick` - Expulsar usuarios\n`/timeout` - Silenciar usuarios\n`/unban` - Desbanear usuarios\n`/clear` - Eliminar mensajes\n`/warn` - Advertir usuario\n`/warnings` - Ver advertencias\n`/slowmode` - Modo lento",
            inline: false
          },
          {
            name: "🎭 Roles y Colores",
            value: "`/rol` - Asignar/quitar roles\n`/colorrole` - Roles de color automático\n`/stopcolor` - Detener colores automáticos",
            inline: false
          },
          {
            name: "🏠 Salas Privadas",
            value: "`/voiceinterface` - Interfaz de salas\n`/setup` - Configurar salas\n`/createcategory` - Crear categoría\n`/rename` - Renombrar sala\n`/nick` - Cambiar apodo de un usuario",
            inline: false
          },
          {
            name: "🎫 Tickets",
            value: "`/ticketpanel` - Panel de tickets\n`/ticketstaffrole` - Configurar rol de staff para tickets\n`/ticketlogchannel` - Canal de logs de tickets\n`/ticketclose` - Cerrar ticket actual",
            inline: false
          },
          {
            name: "🎧 Soporte de Voz",
            value: "`/createsupportchannels` - Crear canales soporte\n`/addsupportrole` - Agregar roles soporte\n`/voicesupportnextrole` - Rol para !nex\n`/voicesanctionedrole` - Rol sancionado\n`/sanctionsupport` - Sancionar usuario\n`/sanctionhistory` - Ver historial de sanciones",
            inline: false
          },
          {
            name: "📋 Logs y Configuración",
            value: "`/logs` - Configurar logs\n`/automod` - Configurar automoderación\n`/staffrole` - Configurar rol staff\n`/setroles` - Configurar roles permitidos\n`/voiceadmin` - Administración de voz\n`/enviarmd` - Enviar MD personalizado",
            inline: false
          },
          {
            name: "🧪 Utilidades",
            value: "`/comandos` - Este menú de ayuda\n`/helpadmin` - Menú con botones",
            inline: false
          }
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Comando help (menú con botones)
    if (commandName === 'helpadmin') {
      console.log('🤖 Comando help ejecutado por:', interaction.user.tag);
      
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🤖 Menú de Comandos del Bot")
        .setDescription("Selecciona una categoría para ver los comandos disponibles:")
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
        .setTimestamp();

      // Crear botones para cada categoría
      const row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_info')
            .setLabel('👤 Información')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('help_mod')
            .setLabel('🛡️ Moderación')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('help_roles')
            .setLabel('🎭 Roles')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('help_voice')
            .setLabel('🏠 Salas')
            .setStyle(ButtonStyle.Success)
        );

      const row2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_tickets')
            .setLabel('🎫 Tickets')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('help_config')
            .setLabel('📋 Configuración')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('help_utils')
            .setLabel('🧪 Utilidades')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({ 
        embeds: [embed], 
        components: [row1, row2],
        ephemeral: true 
      });
    }

    
    
    
    // /ban [usuario] [razon]
    if (commandName === 'ban') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('razon') || 'Sin razón';
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      try {
        const member = await interaction.guild.members.fetch(user.id);
        
        // Enviar MD al usuario antes de banearlo
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🔨 Has sido baneado del servidor')
            .setDescription(`**Servidor:** ${interaction.guild.name}\n**Razón:** ${reason}\n**Baneado por:** ${interaction.user.tag}`)
            .setColor(0x8B0000)
            .setThumbnail(interaction.guild.iconURL() || user.displayAvatarURL())
            .setFooter({ text: `Baneado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] });
          console.log(`✅ MD enviado a ${user.tag} antes del ban`);
        } catch (dmError) {
          console.log(`⚠️ No se pudo enviar MD a ${user.tag}:`, dmError.message);
        }
        
        // Banear al usuario
        await member.ban({ reason });
        
        // Crear embed bonito para el ban
        const banEmbed = new EmbedBuilder()
          .setTitle('🔨 Usuario Baneado')
          .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Baneado por:** ${interaction.user.tag}\n**Razón:** ${reason}`)
          .setThumbnail(user.displayAvatarURL())
          .setColor(0x8B0000)
          .setFooter({ text: `Baneado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
          .setTimestamp();
        await sendLogEmbed(interaction.guild, banEmbed);
        return interaction.reply({ embeds: [banEmbed] });
      } catch (e) {
        console.error('Error al banear:', e);
        return interaction.reply({ content: 'No pude banear a ese usuario.', ephemeral: true });
      }
    }

    // /unban [usuario] [razon]
    if (commandName === 'unban') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('razon') || 'Sin razón';
      
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ content: 'No tienes permiso para desbanear.', ephemeral: true });
      }
      
      try {
        // Verificar si el usuario está baneado
        const bans = await interaction.guild.bans.fetch();
        const banInfo = bans.get(user.id);
        
        if (!banInfo) {
          return interaction.reply({ content: 'Ese usuario no está baneado en este servidor.', ephemeral: true });
        }
        
        // Desbanear al usuario
        await interaction.guild.members.unban(user, reason);
        
        // Crear embed bonito para el unban
        const unbanEmbed = new EmbedBuilder()
          .setTitle('✅ Usuario Desbaneado')
          .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Desbaneado por:** ${interaction.user.tag}\n**Razón:** ${reason}`)
          .setThumbnail(user.displayAvatarURL())
          .setColor(0x00FF00)
          .setFooter({ text: `Desbaneado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
          .setTimestamp();
        await sendLogEmbed(interaction.guild, unbanEmbed);
        return interaction.reply({ embeds: [unbanEmbed] });
      } catch (e) {
        console.error('Error al desbanear:', e);
        return interaction.reply({ content: 'No pude desbanear a ese usuario.', ephemeral: true });
      }
    }

    // COMANDO: /kick - Expulsar usuario
    if (commandName === 'kick') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('razon') || 'Sin razón';
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      try {
        const member = await interaction.guild.members.fetch(user.id);
        
        if (!member.kickable) {
          return interaction.reply({ content: '❌ No puedo expulsar a este usuario (puede tener un rol superior al mío).', ephemeral: true });
        }
        
        // Enviar MD al usuario antes de expulsarlo
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('👢 Has sido expulsado del servidor')
            .setDescription(`**Servidor:** ${interaction.guild.name}\n**Razón:** ${reason}\n**Expulsado por:** ${interaction.user.tag}`)
            .setColor(0xFFA500)
            .setThumbnail(interaction.guild.iconURL() || user.displayAvatarURL())
            .setFooter({ text: `Expulsado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] });
          console.log(`✅ MD enviado a ${user.tag} antes del kick`);
        } catch (dmError) {
          console.log(`⚠️ No se pudo enviar MD a ${user.tag}:`, dmError.message);
        }
        
        // Expulsar al usuario
        await member.kick(reason);
        
        // Embed de confirmación
        const kickEmbed = new EmbedBuilder()
          .setTitle('👢 Usuario Expulsado')
          .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Expulsado por:** ${interaction.user.tag}\n**Razón:** ${reason}`)
          .setThumbnail(user.displayAvatarURL())
          .setColor(0xFFA500)
          .setFooter({ text: `Expulsado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}` })
          .setTimestamp();
        await sendLogEmbed(interaction.guild, kickEmbed);
        return interaction.reply({ embeds: [kickEmbed] });
      } catch (e) {
        console.error('Error al expulsar:', e);
        return interaction.reply({ content: '❌ No pude expulsar a ese usuario.', ephemeral: true });
      }
    }

    // COMANDO: /timeout - Aislar usuario temporalmente
    if (commandName === 'timeout') {
      const user = interaction.options.getUser('usuario');
      const duration = interaction.options.getInteger('duracion');
      const reason = interaction.options.getString('razon') || 'Sin razón';
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      try {
        const member = await interaction.guild.members.fetch(user.id);
        
        if (!member.moderatable) {
          return interaction.reply({ content: '❌ No puedo aislar a este usuario (puede tener un rol superior al mío).', ephemeral: true });
        }
        
        // Enviar MD al usuario
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🔇 Has sido aislado temporalmente')
            .setDescription(`**Servidor:** ${interaction.guild.name}\n**Duración:** ${duration} minutos\n**Razón:** ${reason}\n**Aislado por:** ${interaction.user.tag}`)
            .setColor(0xFF6B6B)
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`⚠️ No se pudo enviar MD a ${user.tag}`);
        }
        
        // Aislar al usuario
        await member.timeout(duration * 60 * 1000, reason);
        
        // Embed de confirmación
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('🔇 Usuario Aislado')
          .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Duración:** ${duration} minutos\n**Aislado por:** ${interaction.user.tag}\n**Razón:** ${reason}`)
          .setThumbnail(user.displayAvatarURL())
          .setColor(0xFF6B6B)
          .setTimestamp();
        await sendLogEmbed(interaction.guild, timeoutEmbed);
        return interaction.reply({ embeds: [timeoutEmbed] });
      } catch (e) {
        console.error('Error al aislar:', e);
        return interaction.reply({ content: '❌ No pude aislar a ese usuario.', ephemeral: true });
      }
    }

    // COMANDO: /clear - Borrar mensajes
    if (commandName === 'clear') {
      const amount = interaction.options.getInteger('cantidad');
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      if (amount < 1 || amount > 100) {
        return interaction.reply({ content: '❌ Debes especificar un número entre 1 y 100.', ephemeral: true });
      }
      
      try {
        await interaction.deferReply({ ephemeral: true });
        
        const deletedMessages = await interaction.channel.bulkDelete(amount, true);
        
        const clearEmbed = new EmbedBuilder()
          .setTitle('🗑️ Mensajes Eliminados')
          .setDescription(`Se eliminaron **${deletedMessages.size}** mensajes.`)
          .setColor(0x00FF00)
          .setFooter({ text: `Eliminado por ${interaction.user.tag}` })
          .setTimestamp();
        await sendLogEmbed(interaction.guild, clearEmbed);
        return interaction.editReply({ embeds: [clearEmbed] });
      } catch (e) {
        console.error('Error al borrar mensajes:', e);
        return interaction.editReply({ content: '❌ No pude borrar los mensajes. Los mensajes deben tener menos de 14 días.' });
      }
    }

    // COMANDO: /slowmode - Activar modo lento
    if (commandName === 'slowmode') {
      const seconds = interaction.options.getInteger('segundos');
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      try {
        await interaction.channel.setRateLimitPerUser(seconds);
        
        if (seconds === 0) {
          return interaction.reply({ content: '✅ Modo lento **desactivado** en este canal.', ephemeral: true });
        } else {
          return interaction.reply({ content: `✅ Modo lento activado: **${seconds} segundos** entre mensajes.`, ephemeral: true });
        }
      } catch (e) {
        console.error('Error al activar slowmode:', e);
        return interaction.reply({ content: '❌ No pude cambiar el modo lento.', ephemeral: true });
      }
    }

    // COMANDO: /warn - Advertir usuario
    if (commandName === 'warn') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('razon') || 'Sin razón especificada';
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      try {
        // Inicializar sistema de advertencias si no existe
        if (!client.userWarnings.has(interaction.guild.id)) {
          client.userWarnings.set(interaction.guild.id, new Map());
        }
        
        const guildWarnings = client.userWarnings.get(interaction.guild.id);
        
        if (!guildWarnings.has(user.id)) {
          guildWarnings.set(user.id, []);
        }
        
        const userWarnList = guildWarnings.get(user.id);
        
        // Agregar la advertencia
        userWarnList.push({
          reason: reason,
          moderator: interaction.user.tag,
          timestamp: Date.now()
        });
        
        const warnCount = userWarnList.length;
        
        // Enviar MD al usuario
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Has recibido una advertencia')
            .setDescription(`**Servidor:** ${interaction.guild.name}\n**Razón:** ${reason}\n**Advertido por:** ${interaction.user.tag}\n**Total de advertencias:** ${warnCount}`)
            .setColor(0xFFCC00)
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`⚠️ No se pudo enviar MD a ${user.tag}`);
        }
        
        // Embed de confirmación
        const warnEmbed = new EmbedBuilder()
          .setTitle('⚠️ Usuario Advertido')
          .setDescription(`**Usuario:** ${user.tag} (${user.id})\n**Razón:** ${reason}\n**Advertido por:** ${interaction.user.tag}\n**Total de advertencias:** ${warnCount}`)
          .setThumbnail(user.displayAvatarURL())
          .setColor(0xFFCC00)
          .setTimestamp();
        await sendLogEmbed(interaction.guild, warnEmbed);
        return interaction.reply({ embeds: [warnEmbed] });
      } catch (e) {
        console.error('Error al advertir:', e);
        return interaction.reply({ content: '❌ No pude advertir a ese usuario.', ephemeral: true });
      }
    }

    // COMANDO: /warnings - Ver advertencias de un usuario
    if (commandName === 'warnings') {
      const user = interaction.options.getUser('usuario');
      
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: '❌ No tienes permiso para ver advertencias.', ephemeral: true });
      }
      
      try {
        const guildWarnings = client.userWarnings.get(interaction.guild.id);
        
        if (!guildWarnings || !guildWarnings.has(user.id)) {
          return interaction.reply({ content: `✅ ${user.tag} no tiene ninguna advertencia.`, ephemeral: true });
        }
        
        const userWarnList = guildWarnings.get(user.id);
        
        const warningsText = userWarnList.map((warn, index) => {
          const date = new Date(warn.timestamp);
          return `**${index + 1}.** ${warn.reason}\n   *Por: ${warn.moderator}*\n   *Fecha: ${date.toLocaleDateString('es-ES')} a las ${date.toLocaleTimeString('es-ES')}*`;
        }).join('\n\n');
        
        const warningsEmbed = new EmbedBuilder()
          .setTitle(`⚠️ Advertencias de ${user.tag}`)
          .setDescription(warningsText || 'Sin advertencias')
          .setThumbnail(user.displayAvatarURL())
          .setColor(0xFFCC00)
          .setFooter({ text: `Total: ${userWarnList.length} advertencia(s)` })
          .setTimestamp();
        
        return interaction.reply({ embeds: [warningsEmbed], ephemeral: true });
      } catch (e) {
        console.error('Error al ver advertencias:', e);
        return interaction.reply({ content: '❌ No pude obtener las advertencias.', ephemeral: true });
      }
    }

    // COMANDO: /anuncio - Crear anuncio con embed
    if (commandName === 'anuncio') {
      const titulo = interaction.options.getString('titulo');
      const descripcion = interaction.options.getString('descripcion');
      const canal = interaction.options.getChannel('canal');
      const color = interaction.options.getString('color') || '#0099FF';
      const imagen = interaction.options.getString('imagen');
      
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: '❌ No tienes permiso para crear anuncios.', ephemeral: true });
      }
      
      try {
        let embedColor = 0x0099FF;
        if (color.match(/^#[0-9A-F]{6}$/i)) {
          embedColor = parseInt(color.replace('#', ''), 16);
        }
        
        const anuncioEmbed = new EmbedBuilder()
          .setTitle(titulo)
          .setDescription(descripcion)
          .setColor(embedColor)
          .setFooter({ text: `Anuncio por ${interaction.user.tag}` })
          .setTimestamp();
        
        if (imagen) {
          anuncioEmbed.setImage(imagen);
        }
        
        await canal.send({ embeds: [anuncioEmbed] });
        
        return interaction.reply({ content: `✅ Anuncio enviado a ${canal}`, ephemeral: true });
      } catch (e) {
        console.error('Error al crear anuncio:', e);
        return interaction.reply({ content: '❌ No pude crear el anuncio.', ephemeral: true });
      }
    }

    // COMANDO: /poll - Crear encuesta
    if (commandName === 'poll') {
      const pregunta = interaction.options.getString('pregunta');
      const opcionesString = interaction.options.getString('opciones');
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      try {
        const opciones = opcionesString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
        
        if (opciones.length < 2) {
          return interaction.reply({ content: '❌ Debes proporcionar al menos 2 opciones separadas por comas.', ephemeral: true });
        }
        
        if (opciones.length > 10) {
          return interaction.reply({ content: '❌ Máximo 10 opciones permitidas.', ephemeral: true });
        }
        
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const opcionesText = opciones.map((opt, index) => `${emojis[index]} ${opt}`).join('\n');
        
        const pollEmbed = new EmbedBuilder()
          .setTitle(`📊 ${pregunta}`)
          .setDescription(opcionesText)
          .setColor(0x00FF00)
          .setFooter({ text: `Encuesta creada por ${interaction.user.tag}` })
          .setTimestamp();
        
        const mensaje = await interaction.channel.send({ embeds: [pollEmbed] });
        
        // Agregar reacciones
        for (let i = 0; i < opciones.length; i++) {
          await mensaje.react(emojis[i]);
        }
        
        return interaction.reply({ content: '✅ Encuesta creada exitosamente!', ephemeral: true });
      } catch (e) {
        console.error('Error al crear encuesta:', e);
        return interaction.reply({ content: '❌ No pude crear la encuesta.', ephemeral: true });
      }
    }

    // COMANDO: /say - Hacer que el bot diga algo
    if (commandName === 'say') {
      const mensaje = interaction.options.getString('mensaje');
      const canal = interaction.options.getChannel('canal');
      
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }
      
      try {
        const targetChannel = canal || interaction.channel;
        await targetChannel.send(mensaje);
        
        return interaction.reply({ content: `✅ Mensaje enviado a ${targetChannel}`, ephemeral: true });
      } catch (e) {
        console.error('Error al enviar mensaje:', e);
        return interaction.reply({ content: '❌ No pude enviar el mensaje.', ephemeral: true });
      }
    }

    // COMANDO: /ping - Ver latencia del bot
    if (commandName === 'ping') {
      const ping = client.ws.ping;
      
      const pingEmbed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(`**Latencia del bot:** ${ping}ms\n**Latencia API:** ${Date.now() - interaction.createdTimestamp}ms`)
        .setColor(ping < 100 ? 0x00FF00 : ping < 200 ? 0xFFCC00 : 0xFF0000)
        .setTimestamp();
      
      return interaction.reply({ embeds: [pingEmbed] });
    }

    // COMANDO: /serverinfo - Información del servidor
    if (commandName === 'serverinfo') {
      try {
        const guild = interaction.guild;
        
        const serverInfoEmbed = new EmbedBuilder()
          .setTitle(`📊 Información de ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '🆔 ID', value: guild.id, inline: true },
            { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
            { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
            { name: '💬 Canales', value: `${guild.channels.cache.size}`, inline: true },
            { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: '😊 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
            { name: '🚀 Boosts', value: `Nivel ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true }
          )
          .setColor(0x0099FF)
          .setTimestamp();
        
        return interaction.reply({ embeds: [serverInfoEmbed] });
      } catch (e) {
        console.error('Error al obtener info del servidor:', e);
        return interaction.reply({ content: '❌ No pude obtener la información del servidor.', ephemeral: true });
      }
    }

    // COMANDO: /membercount - Contador de miembros
    if (commandName === 'membercount') {
      const total = interaction.guild.memberCount;
      const humans = interaction.guild.members.cache.filter(m => !m.user.bot).size;
      const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
      
      const countEmbed = new EmbedBuilder()
        .setTitle('👥 Contador de Miembros')
        .setDescription(`**Total:** ${total}\n**Humanos:** ${humans}\n**Bots:** ${bots}`)
        .setColor(0x00FF00)
        .setTimestamp();
      
      return interaction.reply({ embeds: [countEmbed] });
    }

    // COMANDO: /8ball - Bola 8 mágica
    if (commandName === '8ball') {
      const pregunta = interaction.options.getString('pregunta');
      
      const respuestas = [
        '✅ Sí, definitivamente.',
        '✅ Es cierto.',
        '✅ Sin duda.',
        '✅ Puedes confiar en ello.',
        '✅ Como yo lo veo, sí.',
        '✅ Probablemente.',
        '🤔 Las señales apuntan a que sí.',
        '🤔 Sin dudas.',
        '🤔 Sí.',
        '🤔 Mis fuentes dicen que no.',
        '⏳ Respuesta confusa, intenta de nuevo.',
        '⏳ Pregunta de nuevo más tarde.',
        '⏳ Mejor no decírtelo ahora.',
        '⏳ No puedo predecirlo ahora.',
        '⏳ Concéntrate y pregunta de nuevo.',
        '❌ No cuentes con ello.',
        '❌ Mi respuesta es no.',
        '❌ Mis fuentes dicen que no.',
        '❌ Las perspectivas no son buenas.',
        '❌ Muy dudoso.'
      ];
      
      const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
      
      const ballEmbed = new EmbedBuilder()
        .setTitle('🎱 Bola 8 Mágica')
        .addFields(
          { name: '❓ Pregunta', value: pregunta },
          { name: '💬 Respuesta', value: respuesta }
        )
        .setColor(0x000000)
        .setTimestamp();
      
      return interaction.reply({ embeds: [ballEmbed] });
    }

    // COMANDO: /coinflip - Lanzar moneda
    if (commandName === 'coinflip') {
      const resultado = Math.random() < 0.5 ? '🪙 **CARA**' : '🔵 **CRUZ**';
      
      const coinEmbed = new EmbedBuilder()
        .setTitle('🪙 Lanzamiento de Moneda')
        .setDescription(resultado)
        .setColor(0xFFD700)
        .setTimestamp();
      
      return interaction.reply({ embeds: [coinEmbed] });
    }

    // COMANDO: /dado - Tirar dados
    if (commandName === 'dado') {
      const caras = interaction.options.getInteger('caras') || 6;
      
      if (caras < 2 || caras > 100) {
        return interaction.reply({ content: '❌ El dado debe tener entre 2 y 100 caras.', ephemeral: true });
      }
      
      const resultado = Math.floor(Math.random() * caras) + 1;
      
      const dadoEmbed = new EmbedBuilder()
        .setTitle('🎲 Lanzamiento de Dado')
        .setDescription(`🎲 Has sacado un **${resultado}**!\n\n*Dado de ${caras} caras*`)
        .setColor(0xFF6B6B)
        .setTimestamp();
      
      return interaction.reply({ embeds: [dadoEmbed] });
    }

    // COMANDO: /rps - Piedra, Papel o Tijera
    if (commandName === 'rps') {
      const eleccionUsuario = interaction.options.getString('eleccion');
      const opciones = ['piedra', 'papel', 'tijera'];
      const eleccionBot = opciones[Math.floor(Math.random() * opciones.length)];
      
      const emojis = {
        piedra: '🪨',
        papel: '📄',
        tijera: '✂️'
      };
      
      let resultado = '';
      let color = 0xFFD700;
      
      if (eleccionUsuario === eleccionBot) {
        resultado = '🤝 **¡EMPATE!**';
        color = 0xFFD700;
      } else if (
        (eleccionUsuario === 'piedra' && eleccionBot === 'tijera') ||
        (eleccionUsuario === 'papel' && eleccionBot === 'piedra') ||
        (eleccionUsuario === 'tijera' && eleccionBot === 'papel')
      ) {
        resultado = '🎉 **¡GANASTE!**';
        color = 0x00FF00;
      } else {
        resultado = '😢 **¡PERDISTE!**';
        color = 0xFF0000;
      }
      
      const rpsEmbed = new EmbedBuilder()
        .setTitle('🎮 Piedra, Papel o Tijera')
        .addFields(
          { name: '👤 Tu elección', value: `${emojis[eleccionUsuario]} ${eleccionUsuario.toUpperCase()}`, inline: true },
          { name: '🤖 Mi elección', value: `${emojis[eleccionBot]} ${eleccionBot.toUpperCase()}`, inline: true }
        )
        .setDescription(resultado)
        .setColor(color)
        .setTimestamp();
      
      return interaction.reply({ embeds: [rpsEmbed] });
    }

    // COMANDO: /ship - Calcular compatibilidad
    if (commandName === 'ship') {
      const persona1 = interaction.options.getUser('persona1');
      const persona2 = interaction.options.getUser('persona2');
      
      if (persona1.id === persona2.id) {
        return interaction.reply({ content: '❌ No puedes hacer ship de la misma persona consigo misma.', ephemeral: true });
      }
      
      // Generar porcentaje "aleatorio" pero consistente basado en los IDs
      const seed = parseInt(persona1.id.slice(-8), 16) + parseInt(persona2.id.slice(-8), 16);
      const porcentaje = (seed % 101);
      
      let emoji = '';
      let mensaje = '';
      let color = 0xFF0000;
      
      if (porcentaje < 20) {
        emoji = '💔';
        mensaje = 'No hay química...';
        color = 0xFF0000;
      } else if (porcentaje < 40) {
        emoji = '😐';
        mensaje = 'Podría funcionar con esfuerzo';
        color = 0xFFA500;
      } else if (porcentaje < 60) {
        emoji = '💛';
        mensaje = 'Hay potencial';
        color = 0xFFD700;
      } else if (porcentaje < 80) {
        emoji = '💖';
        mensaje = '¡Buena pareja!';
        color = 0xFF69B4;
      } else {
        emoji = '💕';
        mensaje = '¡Match perfecto!';
        color = 0xFF1493;
      }
      
      const barLength = 20;
      const filled = Math.floor((porcentaje / 100) * barLength);
      const empty = barLength - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      
      const shipEmbed = new EmbedBuilder()
        .setTitle(`${emoji} Ship Compatibility ${emoji}`)
        .setDescription(`**${persona1.username}** 💘 **${persona2.username}**\n\n${bar}\n\n**${porcentaje}%** - ${mensaje}`)
        .setColor(color)
        .setTimestamp();
      
      return interaction.reply({ embeds: [shipEmbed] });
    }

    // COMANDO: /rate - Calificar algo
    if (commandName === 'rate') {
      const cosa = interaction.options.getString('cosa');
      
      // Generar rating "aleatorio" pero consistente basado en el texto
      let seed = 0;
      for (let i = 0; i < cosa.length; i++) {
        seed += cosa.charCodeAt(i);
      }
      const rating = (seed % 11);
      
      let emoji = '';
      let mensaje = '';
      
      if (rating <= 2) {
        emoji = '😡';
        mensaje = 'Horrible';
      } else if (rating <= 4) {
        emoji = '😕';
        mensaje = 'Malo';
      } else if (rating <= 6) {
        emoji = '😐';
        mensaje = 'Regular';
      } else if (rating <= 8) {
        emoji = '😊';
        mensaje = 'Bueno';
      } else {
        emoji = '🤩';
        mensaje = 'Excelente';
      }
      
      const estrellas = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);
      
      const rateEmbed = new EmbedBuilder()
        .setTitle('📊 Rating')
        .addFields(
          { name: '📝 Evaluando', value: `\`${cosa}\``, inline: false },
          { name: '⭐ Calificación', value: `**${rating}/10** ${emoji}`, inline: true },
          { name: '💭 Opinión', value: mensaje, inline: true },
          { name: '━━━━━━━━━━', value: estrellas, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp();
      
      return interaction.reply({ embeds: [rateEmbed] });
    }

    // COMANDO: /trivia - Preguntas de trivia
    if (commandName === 'trivia') {
      const categoria = interaction.options.getString('categoria') || 'random';
      
      const preguntasPorCategoria = {
        geografia: [
          { pregunta: '¿Cuál es la capital de Japón?', respuestas: ['Tokio', 'Osaka', 'Kioto', 'Yokohama'], correcta: 0 },
          { pregunta: '¿Qué océano está al oeste de África?', respuestas: ['Atlántico', 'Pacífico', 'Índico', 'Ártico'], correcta: 0 },
          { pregunta: '¿Cuál es el país más grande del mundo?', respuestas: ['Rusia', 'Canadá', 'China', 'Estados Unidos'], correcta: 0 },
          { pregunta: '¿En qué continente está Egipto?', respuestas: ['África', 'Asia', 'Europa', 'América'], correcta: 0 }
        ],
        historia: [
          { pregunta: '¿En qué año comenzó la Segunda Guerra Mundial?', respuestas: ['1939', '1914', '1945', '1941'], correcta: 0 },
          { pregunta: '¿Quién pintó la Mona Lisa?', respuestas: ['Leonardo da Vinci', 'Miguel Ángel', 'Rafael', 'Donatello'], correcta: 0 },
          { pregunta: '¿Qué imperio construyó Machu Picchu?', respuestas: ['Inca', 'Azteca', 'Maya', 'Olmeca'], correcta: 0 },
          { pregunta: '¿En qué año llegó Colón a América?', respuestas: ['1492', '1498', '1500', '1485'], correcta: 0 }
        ],
        ciencia: [
          { pregunta: '¿Cuál es el planeta más grande del sistema solar?', respuestas: ['Júpiter', 'Saturno', 'Neptuno', 'Urano'], correcta: 0 },
          { pregunta: '¿Cuál es el símbolo químico del oro?', respuestas: ['Au', 'Ag', 'Fe', 'Cu'], correcta: 0 },
          { pregunta: '¿Cuántos huesos tiene el cuerpo humano adulto?', respuestas: ['206', '198', '215', '180'], correcta: 0 },
          { pregunta: '¿A qué velocidad viaja la luz?', respuestas: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '200,000 km/s'], correcta: 0 }
        ],
        videojuegos: [
          { pregunta: '¿Quién es el protagonista de la saga Zelda?', respuestas: ['Link', 'Zelda', 'Ganon', 'Navi'], correcta: 0 },
          { pregunta: '¿En qué año salió el primer Minecraft?', respuestas: ['2011', '2009', '2013', '2015'], correcta: 0 },
          { pregunta: '¿Qué empresa creó Fortnite?', respuestas: ['Epic Games', 'Riot Games', 'Valve', 'Blizzard'], correcta: 0 },
          { pregunta: '¿Cuál es el Pokémon número 1 en la Pokédex?', respuestas: ['Bulbasaur', 'Pikachu', 'Charmander', 'Squirtle'], correcta: 0 }
        ],
        cine: [
          { pregunta: '¿Quién dirigió "Titanic"?', respuestas: ['James Cameron', 'Steven Spielberg', 'Christopher Nolan', 'Martin Scorsese'], correcta: 0 },
          { pregunta: '¿En qué año se estrenó "El Padrino"?', respuestas: ['1972', '1975', '1970', '1968'], correcta: 0 },
          { pregunta: '¿Qué actor interpretó a Iron Man?', respuestas: ['Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo'], correcta: 0 },
          { pregunta: '¿Cuántos anillos hay en "El Señor de los Anillos"?', respuestas: ['20 anillos', '3 anillos', '9 anillos', '1 anillo'], correcta: 0 }
        ],
        musica: [
          { pregunta: '¿Quién es conocido como el Rey del Pop?', respuestas: ['Michael Jackson', 'Elvis Presley', 'Prince', 'Freddie Mercury'], correcta: 0 },
          { pregunta: '¿Qué banda hizo "Bohemian Rhapsody"?', respuestas: ['Queen', 'The Beatles', 'Led Zeppelin', 'Pink Floyd'], correcta: 0 },
          { pregunta: '¿Cuántas cuerdas tiene una guitarra estándar?', respuestas: ['6', '4', '8', '12'], correcta: 0 },
          { pregunta: '¿En qué país nació Shakira?', respuestas: ['Colombia', 'España', 'México', 'Argentina'], correcta: 0 }
        ],
        deportes: [
          { pregunta: '¿Cuántos jugadores hay en un equipo de fútbol?', respuestas: ['11', '10', '9', '12'], correcta: 0 },
          { pregunta: '¿En qué deporte se usa un "birdie"?', respuestas: ['Bádminton', 'Golf', 'Tenis', 'Béisbol'], correcta: 0 },
          { pregunta: '¿Cada cuántos años son los Juegos Olímpicos?', respuestas: ['4 años', '2 años', '5 años', '3 años'], correcta: 0 },
          { pregunta: '¿Quién tiene más Balones de Oro?', respuestas: ['Lionel Messi', 'Cristiano Ronaldo', 'Pelé', 'Maradona'], correcta: 0 }
        ]
      };
      
      // Obtener preguntas de la categoría o todas si es random
      let preguntasDisponibles = [];
      if (categoria === 'random') {
        Object.values(preguntasPorCategoria).forEach(preguntas => {
          preguntasDisponibles.push(...preguntas);
        });
      } else {
        preguntasDisponibles = preguntasPorCategoria[categoria] || [];
      }
      
      if (preguntasDisponibles.length === 0) {
        return interaction.reply({ content: '❌ No hay preguntas disponibles para esta categoría.', ephemeral: true });
      }
      
      // Seleccionar pregunta aleatoria
      const preguntaObj = preguntasDisponibles[Math.floor(Math.random() * preguntasDisponibles.length)];
      
      // Crear botones con las respuestas
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const buttons = preguntaObj.respuestas.map((respuesta, index) => {
        return new ButtonBuilder()
          .setCustomId(`trivia_${index}`)
          .setLabel(respuesta)
          .setStyle(ButtonStyle.Primary);
      });
      
      const row = new ActionRowBuilder().addComponents(buttons);
      
      const categoriaEmojis = {
        geografia: '🌍',
        historia: '📚',
        ciencia: '🔬',
        videojuegos: '🎮',
        cine: '🎬',
        musica: '🎵',
        deportes: '⚽',
        random: '🎲'
      };
      
      const triviaEmbed = new EmbedBuilder()
        .setTitle(`${categoriaEmojis[categoria]} Pregunta de Trivia`)
        .setDescription(`**${preguntaObj.pregunta}**\n\n⏱️ Tienes 30 segundos para responder`)
        .setColor(0x3498DB)
        .setFooter({ text: `Categoría: ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}` })
        .setTimestamp();
      
      const response = await interaction.reply({ 
        embeds: [triviaEmbed], 
        components: [row],
        fetchReply: true 
      });
      
      // Crear collector para los botones
      const collector = response.createMessageComponentCollector({ 
        time: 30000 
      });
      
      let respondido = false;
      
      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ Esta no es tu pregunta.', ephemeral: true });
        }
        
        if (respondido) {
          return i.reply({ content: '❌ Ya has respondido.', ephemeral: true });
        }
        
        respondido = true;
        collector.stop();
        
        const respuestaIndex = parseInt(i.customId.split('_')[1]);
        const esCorrecta = respuestaIndex === preguntaObj.correcta;
        
        const resultEmbed = new EmbedBuilder()
          .setTitle(esCorrecta ? '✅ ¡Correcto!' : '❌ Incorrecto')
          .setDescription(`**${preguntaObj.pregunta}**\n\n**Respuesta correcta:** ${preguntaObj.respuestas[preguntaObj.correcta]}`)
          .setColor(esCorrecta ? 0x00FF00 : 0xFF0000)
          .setFooter({ text: `Respondido por ${i.user.username}` })
          .setTimestamp();
        
        await i.update({ embeds: [resultEmbed], components: [] });
      });
      
      collector.on('end', async collected => {
        if (!respondido) {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏱️ Tiempo agotado')
            .setDescription(`**${preguntaObj.pregunta}**\n\n**Respuesta correcta:** ${preguntaObj.respuestas[preguntaObj.correcta]}`)
            .setColor(0xFF0000)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
      });
      
      return;
    }

    // COMANDO: /roll - Dados de rol (D&D style)
    if (commandName === 'roll') {
      const dadosInput = interaction.options.getString('dados').toLowerCase();
      
      // Validar formato (ejemplo: 2d6, 1d20, 3d8)
      const regex = /^(\d+)d(\d+)$/;
      const match = dadosInput.match(regex);
      
      if (!match) {
        return interaction.reply({ 
          content: '❌ Formato inválido. Usa el formato: `[número]d[caras]` (ejemplo: 2d6, 1d20, 3d8)', 
          ephemeral: true 
        });
      }
      
      const cantidad = parseInt(match[1]);
      const caras = parseInt(match[2]);
      
      if (cantidad < 1 || cantidad > 20) {
        return interaction.reply({ content: '❌ Debes lanzar entre 1 y 20 dados.', ephemeral: true });
      }
      
      if (caras < 2 || caras > 100) {
        return interaction.reply({ content: '❌ El dado debe tener entre 2 y 100 caras.', ephemeral: true });
      }
      
      const resultados = [];
      let total = 0;
      
      for (let i = 0; i < cantidad; i++) {
        const resultado = Math.floor(Math.random() * caras) + 1;
        resultados.push(resultado);
        total += resultado;
      }
      
      const rollEmbed = new EmbedBuilder()
        .setTitle(`🎲 Lanzamiento de Dados: ${dadosInput.toUpperCase()}`)
        .addFields(
          { name: '🎯 Resultados', value: resultados.join(', '), inline: false },
          { name: '📊 Total', value: `**${total}**`, inline: true },
          { name: '📈 Promedio', value: `${(total / cantidad).toFixed(2)}`, inline: true }
        )
        .setColor(0xE74C3C)
        .setFooter({ text: `${cantidad} dado${cantidad > 1 ? 's' : ''} de ${caras} caras` })
        .setTimestamp();
      
      return interaction.reply({ embeds: [rollEmbed] });
    }

    // COMANDO: /meme - Generar meme aleatorio de Reddit (solo en canal específico)
    if (commandName === 'meme') {
      // Verificar que esté en un canal de memes
      const canalMemes = interaction.guild.channels.cache.find(ch => 
        ch.name.toLowerCase().includes('meme') || 
        ch.name.toLowerCase().includes('memes')
      );
      
      if (canalMemes && interaction.channel.id !== canalMemes.id) {
        return interaction.reply({ 
          content: `❌ El comando \`/meme\` solo puede usarse en ${canalMemes}.`,
          ephemeral: true 
        });
      }
      
      try {
        await interaction.deferReply();
        
        // Obtener memes de r/MemesESP
        const response = await fetch('https://www.reddit.com/r/MemesESP/hot.json?limit=100');
        const data = await response.json();
        
        if (!data || !data.data || !data.data.children || data.data.children.length === 0) {
          return interaction.editReply('❌ No se pudieron obtener memes de Reddit en este momento. Intenta de nuevo más tarde.');
        }
        
        // Filtrar solo posts que tengan imágenes
        const memesConImagen = data.data.children.filter(post => {
          const postData = post.data;
          return postData.post_hint === 'image' || 
                 (postData.url && (
                   postData.url.endsWith('.jpg') || 
                   postData.url.endsWith('.jpeg') || 
                   postData.url.endsWith('.png') || 
                   postData.url.endsWith('.gif')
                 ));
        });
        
        if (memesConImagen.length === 0) {
          return interaction.editReply('❌ No se encontraron memes con imágenes. Intenta de nuevo.');
        }
        
        // Obtener memes ya enviados en este servidor
        if (!client.memesEnviados.has(interaction.guild.id)) {
          client.memesEnviados.set(interaction.guild.id, new Set());
        }
        const memesYaEnviados = client.memesEnviados.get(interaction.guild.id);
        
        // Filtrar memes que NO se han enviado antes
        let memesNoEnviados = memesConImagen.filter(post => !memesYaEnviados.has(post.data.url));
        
        // Si todos los memes ya se enviaron, resetear la lista
        if (memesNoEnviados.length === 0) {
          memesYaEnviados.clear();
          memesNoEnviados = memesConImagen;
          await interaction.channel.send('♻️ Se han mostrado todos los memes disponibles. Reiniciando lista...');
        }
        
        // Seleccionar un meme aleatorio que no se haya enviado
        const memeAleatorio = memesNoEnviados[Math.floor(Math.random() * memesNoEnviados.length)];
        const memeData = memeAleatorio.data;
        
        // Guardar este meme como enviado
        memesYaEnviados.add(memeData.url);
        
        const memeEmbed = new EmbedBuilder()
          .setImage(memeData.url)
          .setColor(0xFF6B6B)
          .setFooter({ text: `👍 ${memeData.ups} upvotes • r/MemesESP` })
          .setTimestamp();
        
        // Agregar autor de forma simple
        if (memeData.author) {
          memeEmbed.setAuthor({ name: `u/${memeData.author}` });
        }
        
        return interaction.editReply({ embeds: [memeEmbed] });
        
      } catch (error) {
        console.error('Error obteniendo meme de Reddit:', error);
        return interaction.editReply('❌ Hubo un error al obtener el meme. Intenta de nuevo más tarde.');
      }
    }

    // /rename [nombre] : renombra la sala de voz actual del usuario
    if (commandName === 'rename') {
      const name = interaction.options.getString('nombre');
      const vc = interaction.member.voice?.channel;
      if (!vc) return interaction.reply({ content: 'Debes estar en una sala de voz.', ephemeral: true });
      try {
        await vc.setName(name);
        return interaction.reply({ content: `Nombre de la sala cambiado a **${name}**.`, ephemeral: true });
      } catch (e) {
        console.error('Error renombrando sala:', e);
        return interaction.reply({ content: 'No pude renombrar la sala.', ephemeral: true });
      }
    }

    // /nick : cambia el apodo de un usuario o el tuyo
    if (commandName === 'nick') {
      const targetUser = interaction.options.getUser('usuario');
      const newNick = interaction.options.getString('nuevo_nick');
      const targetMember = targetUser
        ? await interaction.guild.members.fetch(targetUser.id).catch(() => null)
        : interaction.member;

      if (!targetMember) {
        return interaction.reply({ content: 'No pude encontrar al usuario indicado.', ephemeral: true });
      }

      const botMember = interaction.guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
        return interaction.reply({ content: '❌ No tengo permiso para cambiar apodos. Otorga el permiso Gestionar Apodos al bot.', ephemeral: true });
      }

      if (targetMember.id !== interaction.member.id) {
        const canManage = interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!canManage) {
          return interaction.reply({ content: '❌ Necesitas permisos para gestionar apodos de otros usuarios.', ephemeral: true });
        }
      }

      try {
        await targetMember.setNickname(newNick, `Cambio de apodo vía /nick por ${interaction.user.tag}`);
        return interaction.reply({ content: `✅ Apodo de ${targetMember.user.tag} actualizado a **${newNick}**.`, ephemeral: true });
      } catch (e) {
        console.error('Error cambiando apodo:', e);
        return interaction.reply({ content: '❌ No pude cambiar el apodo. Revisa mis permisos y la jerarquía de roles.', ephemeral: true });
      }
    }

    // /staffrole : gestión de roles de staff
    if (commandName === 'staffrole') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores pueden gestionar roles de staff.', ephemeral: true });
      }
      
      // Obtener roles actuales
      const staffRoles = client.commandRoles.get(interaction.guild.id) || [];
      const allRoles = [...interaction.guild.roles.cache.filter(r => r.name !== '@everyone').values()].sort((a, b) => b.position - a.position);
      
      // Crear opciones para añadir (roles no configurados)
      const availableRoles = allRoles.filter(r => !staffRoles.includes(r.id));
      const addOptions = availableRoles.slice(0, 25).map(role => 
        new StringSelectMenuOptionBuilder()
          .setLabel(role.name)
          .setDescription(`Añadir como staff`)
          .setValue(role.id)
      );
      
      // Crear opciones para eliminar (roles ya configurados)
      const removeOptions = staffRoles.map(roleId => {
        const role = interaction.guild.roles.cache.get(roleId);
        return new StringSelectMenuOptionBuilder()
          .setLabel(role ? role.name : `Rol eliminado (${roleId})`)
          .setDescription('Eliminar de staff')
          .setValue(roleId);
      });
      
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Gestión de Roles de Staff')
        .setDescription('Selecciona un rol para añadir o eliminar de los roles de staff.')
        .setColor(0x5865F2)
        .setTimestamp();
      
      // Mostrar roles actuales de forma más visible
      let rolesText = '';
      if (staffRoles.length > 0) {
        rolesText = staffRoles.map(roleId => {
          const role = interaction.guild.roles.cache.get(roleId);
          return `• ${role ? role.name : `Rol eliminado (${roleId})`}`;
        }).join('\n');
      } else {
        rolesText = 'No hay roles configurados';
      }
      
      embed.setDescription(`**📋 Roles de Staff Configurados:**\n${rolesText}\n\n**Usa los menús below para añadir o eliminar roles.**`);
      
      // Menú para añadir roles
      const addMenu = new StringSelectMenuBuilder()
        .setCustomId('staff_add')
        .setPlaceholder('➕ Añadir rol de staff');
      if (addOptions.length > 0) {
        addMenu.addOptions(addOptions);
      } else {
        addMenu.addOptions([
          {
            label: 'No hay roles disponibles para añadir',
            description: 'Crea o habilita roles nuevos antes de agregarlos como staff',
            value: 'none_add',
            disabled: true
          }
        ]);
      }
      
      // Menú para eliminar roles
      const removeMenu = new StringSelectMenuBuilder()
        .setCustomId('staff_remove')
        .setPlaceholder('➖ Eliminar rol de staff');
      if (removeOptions.length > 0) {
        removeMenu.addOptions(removeOptions);
      } else {
        removeMenu.addOptions([
          {
            label: 'No hay roles de staff configurados',
            description: 'Añade primero un rol de staff para poder eliminarlo',
            value: 'none_remove',
            disabled: true
          }
        ]);
      }
      
      const row1 = new ActionRowBuilder().addComponents(addMenu);
      const row2 = new ActionRowBuilder().addComponents(removeMenu);
      
      return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }

    // /ticketstaffrole : asignar rol que puede ver/atender tickets
    if (commandName === 'ticketstaffrole') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores pueden configurar el rol de tickets.', ephemeral: true });
      }

      const role = interaction.options.getRole('rol');
      if (!role) {
        return interaction.reply({ content: '❌ Debes seleccionar un rol válido.', ephemeral: true });
      }

      client.ticketStaffRole.set(interaction.guild.id, role.id);
      saveStaffConfig();

      return interaction.reply({ content: `✅ Rol de staff para tickets configurado: ${role}`, ephemeral: true });
    }

    // /ticketlogchannel : configurar canal de logs específico para tickets
    if (commandName === 'ticketlogchannel') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores pueden configurar el canal de logs de tickets.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('canal');
      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({ content: '❌ Debes seleccionar un canal de texto válido.', ephemeral: true });
      }

      const guildConfig = getTicketConfig(interaction.guild.id) || {};
      guildConfig.ticketLogChannelId = channel.id;
      setTicketConfig(interaction.guild.id, guildConfig);

      return interaction.reply({ content: `✅ Canal de logs de tickets configurado: ${channel}`, ephemeral: true });
    }

    // /ticketclose : cerrar el ticket actual desde slash command
    if (commandName === 'ticketclose') {
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos para cerrar este ticket.', ephemeral: true });
      }

      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({ content: '❌ Este comando solo funciona dentro de un canal de ticket.', ephemeral: true });
      }

      await closeTicketChannel(interaction.channel, interaction.member, async (options) => {
        await interaction.reply(options);
      });
      return;
    }

    // /addsupportrole [rol] [rol2] [rol3] [rol4] [rol5] : agregar roles adicionales a canales de soporte existentes
    if (commandName === 'addsupportrole') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'Necesitas permiso para gestionar roles.', ephemeral: true });
      }
      
      const role1 = interaction.options.getRole('rol');
      const role2 = interaction.options.getRole('rol2');
      const role3 = interaction.options.getRole('rol3');
      const role4 = interaction.options.getRole('rol4');
      const role5 = interaction.options.getRole('rol5');
      
      // Recopilar todos los roles
      const allRoles = [role1];
      if (role2) allRoles.push(role2);
      if (role3) allRoles.push(role3);
      if (role4) allRoles.push(role4);
      if (role5) allRoles.push(role5);
      
      try {
        const supportChannels = findSupportChannels(interaction.guild);
        
        if (supportChannels.size === 0) {
          return interaction.reply({ 
            content: '❌ No se encontraron canales de soporte. Usa `/createsupportchannels` para crearlos primero.', 
            ephemeral: true 
          });
        }
        
        let updatedChannels = 0;
        const rolesList = allRoles.map(r => `✅ ${r}`).join('\n');
        
        // Agregar permisos a todos los canales de soporte
        for (const [channelId, channel] of supportChannels) {
          try {
            for (const role of allRoles) {
              await channel.permissionOverwrites.edit(role.id, {
                Connect: true,
                Speak: true
              });
            }
            updatedChannels++;
          } catch (error) {
            console.error(`Error actualizando permisos de ${channel.name}:`, error);
          }
        }
        
        if (updatedChannels > 0) {
          return interaction.reply({ 
            content: `✅ Roles agregados a canales de soporte:\n${rolesList}\n✅ Permisos actualizados en ${updatedChannels} canal(es) de soporte.`, 
            ephemeral: true 
          });
        } else {
          return interaction.reply({ 
            content: `❌ No se pudieron actualizar los permisos.`, 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('Error agregando roles:', error);
        return interaction.reply({ 
          content: `❌ Hubo un error al agregar los roles.`, 
          ephemeral: true 
        });
      }
    }

    // /sanctionsupport [usuario] [motivo] : sancionar un usuario de soporte de voz
    if (commandName === 'sanctionsupport') {
      const staffRoleId = client.voiceSupportStaffRole.get(interaction.guild.id);
      
      // Verificar que tenga el rol de staff
      if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
        // También verificar si tiene permisos de administrador
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          return interaction.reply({ 
            content: '❌ No tienes permisos para usar este comando. Necesitas el rol de staff de soporte de voz o permisos de administrador.', 
            ephemeral: true 
          });
        }
      }
      
      const targetUser = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('motivo') || 'No se especificó un motivo';
      
      try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        const success = await sanctionSupportUser(interaction.guild, targetUser.id, reason, interaction.member);
        
        if (success) {
          return interaction.reply({ 
            content: `✅ Usuario ${targetUser.tag} sancionado correctamente.\n📋 Motivo: ${reason}`, 
            ephemeral: true 
          });
        } else {
          return interaction.reply({ 
            content: '❌ Error al sancionar al usuario. Verifica que el rol de sancionado esté configurado con `/voicesanctionedrole`.', 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('Error en sanctionsupport:', error);
        return interaction.reply({ 
          content: '❌ Error al sancionar al usuario.', 
          ephemeral: true 
        });
      }
    }

    // /sanctionhistory [usuario] : ver historial de sanciones de un usuario o del servidor
    if (commandName === 'sanctionhistory') {
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
      }

      const targetUser = interaction.options.getUser('usuario');
      const records = getSanctionRecords(interaction.guild.id, targetUser?.id);

      if (!records || records.length === 0) {
        return interaction.reply({ content: targetUser ? `✅ ${targetUser.tag} no tiene sanciones registradas.` : '✅ No hay sanciones registradas en este servidor.', ephemeral: true });
      }

      const lines = records.map((record, index) => {
        const date = new Date(record.timestamp).toLocaleString('es-ES');
        return `**${index + 1}.** [${date}] ${record.userTag} (${record.userId}) - ${record.reason} - *Sancionado por:* ${record.moderatorTag}`;
      });

      const title = targetUser ? `Historial de sanciones de ${targetUser.tag}` : `Historial de sanciones del servidor`;
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${title}`)
        .setColor(0xFF6B00)
        .setTimestamp();

      const text = lines.join('\n\n');
      if (text.length > 1800 || lines.length > 10) {
        if (!fs.existsSync(sanctionsFolderPath)) fs.mkdirSync(sanctionsFolderPath, { recursive: true });
        const outputPath = path.join(sanctionsFolderPath, `sanctionhistory_${interaction.guild.id}_${Date.now()}.txt`);
        fs.writeFileSync(outputPath, text, 'utf8');
        try {
          return interaction.reply({ content: `✅ Historial generado en archivo.`, files: [outputPath], ephemeral: true });
        } catch (fileError) {
          console.error('Error enviando archivo de historial:', fileError);
          return interaction.reply({ content: `✅ Historial generado en: ${outputPath}`, ephemeral: true });
        }
      }

      embed.setDescription(text);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // /voicesupportnextrole [rol] : configurar rol que puede usar el comando !nex
    if (commandName === 'voicesupportnextrole') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'Necesitas permiso para gestionar roles.', ephemeral: true });
      }
      const role = interaction.options.getRole('rol');
      client.voiceSupportNextRole.set(interaction.guild.id, role.id);
      return interaction.reply({ 
        content: `✅ Rol configurado para usar el comando \`!nex\`: ${role}\n\nAhora solo los usuarios con este rol podrán usar el comando \`!nex\` en el canal de log de soporte de voz.`, 
        ephemeral: true 
      });
    }

    // /voicesanctionedrole [rol] : guarda rol de sancionado para soporte de voz
    if (commandName === 'voicesanctionedrole') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'Necesitas permiso para gestionar roles.', ephemeral: true });
      }
      const role = interaction.options.getRole('rol');
      client.voiceSupportSanctionedRole.set(interaction.guild.id, role.id);
      
      // Asegurar que el rol de sancionado tenga permisos en canales de soporte
      try {
        const supportChannels = findSupportChannels(interaction.guild);
        let updatedChannels = 0;
        
        for (const [channelId, channel] of supportChannels) {
          try {
            await channel.permissionOverwrites.edit(role.id, {
              Connect: true,
              Speak: true
            });
            updatedChannels++;
          } catch (error) {
            console.error(`Error actualizando permisos de ${channel.name}:`, error);
          }
        }
        
        if (updatedChannels > 0) {
          return interaction.reply({ 
            content: `✅ Rol de sancionado configurado: ${role}\n✅ Los usuarios con este rol serán movidos automáticamente a canales de soporte si intentan entrar a la sala de espera.\n✅ Permisos actualizados en ${updatedChannels} canal(es) de soporte.`, 
            ephemeral: true 
          });
        } else {
          return interaction.reply({ 
            content: `✅ Rol de sancionado configurado: ${role}\n✅ Los usuarios con este rol serán movidos automáticamente a canales de soporte si intentan entrar a la sala de espera.\n⚠️ No se encontraron canales de soporte. Usa \`/createsupportchannels\` para crearlos.`, 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('Error actualizando permisos:', error);
        return interaction.reply({ 
          content: `✅ Rol de sancionado configurado: ${role}\n⚠️ Hubo un error al actualizar permisos de canales.`, 
          ephemeral: true 
        });
      }
    }

    // NUEVOS COMANDOS PARA CONFIGURAR ROLES PERMITIDOS
    if (commandName === 'setroles') {
      // Solo administradores pueden configurar esto
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ 
          content: 'Solo los administradores pueden configurar los roles permitidos.', 
          ephemeral: true 
        });
      }

      const role1 = interaction.options.getRole('rol1');
      const role2 = interaction.options.getRole('rol2');
      const role3 = interaction.options.getRole('rol3');

      const roles = [role1, role2, role3].filter(role => role !== null);
      
      if (roles.length === 0) {
        return interaction.reply({ 
          content: 'Debes especificar al menos un rol.', 
          ephemeral: true 
        });
      }

      const roleIds = roles.map(role => role.id);
      client.commandRoles.set(interaction.guild.id, roleIds);
      
      // Guardar en archivo
      let staffData = {};
      try {
        if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
          staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
        }
      } catch (e) {}
      if (!staffData[interaction.guild.id]) staffData[interaction.guild.id] = {};
      staffData[interaction.guild.id].commandRoles = roleIds;
      fs.writeFileSync(path.join(__dirname, 'config', 'staff-roles.json'), JSON.stringify(staffData, null, 2));

      const embed = new EmbedBuilder()
        .setTitle('✅ Roles Configurados')
        .setDescription(`Los siguientes roles ahora pueden usar los comandos del bot:\n${roles.map(role => `• ${role.name}`).join('\n')}`)
        .setColor(0x00FF00)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      saveStaffConfig();
      return;
    }

    if (commandName === 'automod') {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'role') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '❌ Solo administradores pueden configurar el rol de automoderación.', ephemeral: true });
        }

        const role = interaction.options.getRole('rol');
        client.antiRaid.adminRole.set(interaction.guild.id, role.id);
        saveStaffConfig();

        return interaction.reply({
          content: `✅ Rol autorizado para configurar automoderación: ${role}`,
          ephemeral: true
        });
      }

      if (subcommand === 'settings') {
        if (!canManageAutoMod(interaction.member, interaction.guild)) {
          return interaction.reply({ content: '❌ No tienes permisos para configurar automoderación.', ephemeral: true });
        }

        const antiSpam = interaction.options.getBoolean('antispam');
        const antiLinks = interaction.options.getBoolean('antilinks');
        const antiBots = interaction.options.getBoolean('antibots');
        const antiChannelSpam = interaction.options.getBoolean('antichannelspam');
        const maxMessages = interaction.options.getInteger('maxmessages');
        const timeWindow = interaction.options.getInteger('timewindow');

        const currentSettings = getAntiRaidSettings(interaction.guild.id);
        const newSettings = { ...currentSettings };
        let changed = false;

        if (antiSpam !== null) {
          newSettings.antiSpam = antiSpam;
          changed = true;
        }
        if (antiLinks !== null) {
          newSettings.antiLinks = antiLinks;
          changed = true;
        }
        if (antiBots !== null) {
          newSettings.antiBots = antiBots;
          changed = true;
        }
        if (antiChannelSpam !== null) {
          newSettings.antiChannelSpam = antiChannelSpam;
          changed = true;
        }
        if (maxMessages !== null) {
          newSettings.maxMessages = maxMessages;
          changed = true;
        }
        if (timeWindow !== null) {
          newSettings.timeWindow = timeWindow * 1000;
          changed = true;
        }

        if (!changed) {
          return interaction.reply({ content: '❌ Debes especificar al menos una opción para actualizar.', ephemeral: true });
        }

        client.antiRaid.settings.set(interaction.guild.id, newSettings);
        saveStaffConfig();

        const updatedEmbed = new EmbedBuilder()
          .setTitle('✅ Configuración de Automoderación Actualizada')
          .setColor(0x00FF00)
          .addFields(
            { name: 'Anti-Spam', value: newSettings.antiSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Anti-Links', value: newSettings.antiLinks ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Anti-Bots', value: newSettings.antiBots ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Anti-Canal Spam', value: newSettings.antiChannelSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Límite de mensajes', value: `${newSettings.maxMessages} mensajes`, inline: true },
            { name: 'Ventana de tiempo', value: `${newSettings.timeWindow / 1000} segundos`, inline: true }
          );

        return interaction.reply({ embeds: [updatedEmbed], ephemeral: true });
      }

      if (subcommand === 'status') {
        const currentSettings = getAntiRaidSettings(interaction.guild.id);
        const adminRoleId = client.antiRaid.adminRole.get(interaction.guild.id);
        const adminRole = adminRoleId ? interaction.guild.roles.cache.get(adminRoleId) : null;

        const statusEmbed = new EmbedBuilder()
          .setTitle('🔒 Estado de Automoderación')
          .setColor(0x5865F2)
          .addFields(
            { name: 'Rol autorizado', value: adminRole ? `${adminRole}` : 'No configurado', inline: false },
            { name: 'Anti-Spam', value: currentSettings.antiSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Anti-Links', value: currentSettings.antiLinks ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Anti-Bots', value: currentSettings.antiBots ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Anti-Canal Spam', value: currentSettings.antiChannelSpam ? '✅ Activado' : '❌ Desactivado', inline: true },
            { name: 'Límite de mensajes', value: `${currentSettings.maxMessages} mensajes`, inline: true },
            { name: 'Ventana de tiempo', value: `${currentSettings.timeWindow / 1000} segundos`, inline: true }
          );

        return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
      }
    }

    if (commandName === 'voiceinterface') {
      try {
        await interaction.deferReply({ ephemeral: true });

        const panel = buildVoiceInterfacePanel();

        // Intentar publicar en el canal de interfaz del servidor
        const interfaceChannel = interaction.guild.channels.cache.find(
          (ch) => ch.type === ChannelType.GuildText && /interface/i.test(ch.name)
        );

        if (interfaceChannel) {
          await interfaceChannel.send({ embeds: [panel.embed], components: panel.rows });
          return interaction.editReply({ content: `Panel publicado en ${interfaceChannel}.` });
        }

        // Si no existe canal de interfaz, devolver el panel al usuario igualmente
        return interaction.editReply({ embeds: [panel.embed], components: panel.rows });
      } catch (error) {
        console.error('Error en /voiceinterface:', error);
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({ content: '❌ Ocurrió un error mostrando la interfaz.', ephemeral: true });
        }
        return interaction.editReply({ content: '❌ Ocurrió un error mostrando la interfaz.' });
      }
    }



    // VERIFICACIÓN DE PERMISOS PARA TODOS LOS OTROS COMANDOS
    if (!canUseCommand(interaction.member, interaction.guild.id)) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Sin Permisos')
        .setDescription('No tienes un rol permitido para usar los comandos de este bot.\n\nContacta a un administrador.')
        .setColor(0xFF0000)
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // COMANDO: crear canales de soporte de voz y configurar roles
    if (commandName === 'createsupportchannels') {
      const member = interaction.member;

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo los administradores pueden crear canales de soporte.', ephemeral: true });
      }

      try {
        // Obtener roles (obligatorio el primero, opcionales los demás)
        const mainRole = interaction.options.getRole('rol');
        const role2 = interaction.options.getRole('rol2');
        const role3 = interaction.options.getRole('rol3');
        const role4 = interaction.options.getRole('rol4');
        const role5 = interaction.options.getRole('rol5');
        
        // Guardar el rol principal en la configuración
        client.voiceSupportStaffRole.set(interaction.guild.id, mainRole.id);
        
        // Recopilar todos los roles (principal + opcionales)
        const allRoles = [mainRole];
        if (role2) allRoles.push(role2);
        if (role3) allRoles.push(role3);
        if (role4) allRoles.push(role4);
        if (role5) allRoles.push(role5);

        // Crear categoría para soporte de voz
        const category = await interaction.guild.channels.create({
          name: '🎧 Soporte de Voz',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              allow: [PermissionsBitField.Flags.ViewChannel]
            }
          ]
        });

        // Crear canal de texto para logs
        const logChannel = await interaction.guild.channels.create({
          name: 'soporte-log-de-voz',
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.SendMessages]
            }
          ]
        });

        // Crear canal de voz de espera
        const waitingRoom = await interaction.guild.channels.create({
          name: '⌛ sala-de-espera',
          type: ChannelType.GuildVoice,
          parent: category.id,
          userLimit: 0 // Sin límite
        });

        // Configurar permisos para canales de soporte (solo staff puede entrar)
        const permissionOverwrites = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.Connect]
          }
        ];
        
        // Agregar permisos para todos los roles de staff
        for (const role of allRoles) {
          permissionOverwrites.push({
            id: role.id,
            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
          });
        }

        // Crear canal de soporte 1 (solo staff puede entrar)
        const support1 = await interaction.guild.channels.create({
          name: '🔧 soporte-1',
          type: ChannelType.GuildVoice,
          parent: category.id,
          userLimit: 2, // Solo staff y usuario
          permissionOverwrites: permissionOverwrites
        });

        // Crear canal de soporte 2 (solo staff puede entrar)
        const support2 = await interaction.guild.channels.create({
          name: '🔧 soporte-2',
          type: ChannelType.GuildVoice,
          parent: category.id,
          userLimit: 2, // Solo staff y usuario
          permissionOverwrites: permissionOverwrites
        });

        // Crear lista de roles configurados
        const rolesList = allRoles.map(r => `✅ ${r}`).join('\n');

        // Publicar guía en el canal de log
        const guide = new EmbedBuilder()
          .setTitle('🎧 Sistema de Soporte de Voz')
          .setDescription('Sistema de soporte de voz configurado correctamente.')
          .addFields(
            { name: '📋 Canales Creados', value: `✅ ${waitingRoom} - Sala de espera\n✅ ${support1} - Canal de soporte 1\n✅ ${support2} - Canal de soporte 2\n✅ ${logChannel} - Canal de logs`, inline: false },
            { name: '👥 Roles de Staff Configurados', value: rolesList, inline: false },
            { name: '🔧 Cómo Funciona', value: '1) Los usuarios se unen a la sala de espera\n2) El staff se une a soporte-1 o soporte-2\n3) El bot mueve automáticamente al siguiente usuario\n4) Usa `!nex` en el canal de log para mover manualmente', inline: false },
            { name: '⚠️ Importante', value: 'Solo usuarios con los roles de staff configurados pueden entrar a los canales de soporte.', inline: false }
          )
          .setColor(0x00FF00)
          .setTimestamp();

        await logChannel.send({ embeds: [guide] });

        const ok = new EmbedBuilder()
          .setTitle('✅ Sistema de Soporte de Voz Configurado')
          .setDescription(`Se creó la categoría **${category.name}** con:\n${waitingRoom}\n${support1}\n${support2}\n${logChannel}\n\n**Roles de Staff:**\n${rolesList}\n\n✅ Todo está listo para usar.`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.reply({ embeds: [ok], ephemeral: true });
      } catch (error) {
        console.error('Error creando canales de soporte:', error);
        return interaction.reply({ content: '❌ Error al crear los canales. Revisa mis permisos para crear canales.', ephemeral: true });
      }
    }

    // COMANDO: crear categoría y subcanales para salas privadas
    if (commandName === 'createcategory') {
      const member = interaction.member;

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo los administradores pueden crear categorías.', ephemeral: true });
      }

      try {
        // Defer la respuesta para operaciones largas
        await interaction.deferReply({ ephemeral: true });

        // Crear categoría base
        const category = await interaction.guild.channels.create({
          name: '🍺 Salas privadas',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              allow: [PermissionsBitField.Flags.ViewChannel]
            }
          ]
        });

        // Crear canal de texto de interfaz
        const interfaceChannel = await interaction.guild.channels.create({
          name: '🧮 interface',
          type: ChannelType.GuildText,
          parent: category.id
        });

        // Crear canal de voz lobby para disparar creación temporal
        const lobbyChannel = await interaction.guild.channels.create({
          name: '🔊 Crear sala',
          type: ChannelType.GuildVoice,
          parent: category.id
        });

        // Publicar guía en el canal de interfaz
        const guide = new EmbedBuilder()
          .setTitle('🎤 Sistema de Salas Privadas')
          .setDescription('Conéctate a **🔊 Crear sala** para generar tu sala privada automáticamente.')
          .addFields(
            { name: 'Cómo funciona', value: '1) Entra a "🔊 Crear sala"\n2) Se crea tu sala privada y te movemos\n3) Usa `/voiceinterface` para gestionarla\n4) La sala se elimina cuando te desconectas' }
          )
          .setColor(0x00FF00)
          .setTimestamp();

        await interfaceChannel.send({ embeds: [guide] });
        const panel = buildVoiceInterfacePanel();
        await interfaceChannel.send({ embeds: [panel.embed], components: panel.rows });

        const ok = new EmbedBuilder()
          .setTitle('✅ Estructura creada')
          .setDescription(`Se creó **${category.name}** con ${interfaceChannel} y ${lobbyChannel}`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.editReply({ embeds: [ok] });
      } catch (error) {
        console.error('Error creando estructura de salas privadas:', error);
        return interaction.editReply({ content: '❌ Error al crear la estructura. Revisa mis permisos para crear canales.' });
      }
    }

    // COMANDO DE ROLES (existente)
    if (commandName === 'rol') {
      const targetMember = interaction.options.getUser('usuario');
      const role = interaction.options.getRole('rol');

      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: 'Este comando solo funciona en servidores.', ephemeral: true });

      let member;
      try {
        member = await guild.members.fetch(targetMember.id);
      } catch (err) {
        return interaction.reply({ content: 'No pude encontrar al miembro en este servidor.', ephemeral: true });
      }

      const executor = interaction.member;
      if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'No tienes permiso para gestionar roles (Manage Roles).', ephemeral: true });
      }

      const botMember = guild.members.cache.get(client.user.id);
      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'No tengo permiso para gestionar roles. Dame el permiso "Manage Roles".', ephemeral: true });
      }

      const botHighest = botMember.roles.highest.position;
      const targetRolePosition = role.position;
      if (targetRolePosition >= botHighest) {
        return interaction.reply({ content: 'No puedo asignar ese rol porque está por encima (o al mismo nivel) de mi rol más alto.', ephemeral: true });
      }

      if (executor.roles && executor.roles.highest.position <= member.roles.highest.position && executor.id !== guild.ownerId) {
        return interaction.reply({ content: 'No puedes asignar roles a alguien con la misma o mayor jerarquía que tú.', ephemeral: true });
      }

      try {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
          return interaction.reply({ content: `Se ha **quitado** el rol ${role.name} a ${member.user.tag}.`, ephemeral: false });
        } else {
          await member.roles.add(role);
          return interaction.reply({ content: `Se ha **asignado** el rol ${role.name} a ${member.user.tag}.`, ephemeral: false });
        }
      } catch (error) {
        console.error('Error al asignar/quitar rol:', error);
        return interaction.reply({ content: 'Ocurrió un error al intentar modificar los roles. Asegúrate de que mi rol está por encima del rol objetivo y que tengo permisos.', ephemeral: true });
      }
    }

    // Sistema de música removido - comandos no disponibles

    // RESTO DE COMANDOS EXISTENTES (colorrole, stopcolor, ban, embed, say, clear, ticket)
    // [Aquí van todos los demás comandos que ya tenías, manteniendo la misma lógica]
    
    if (commandName === 'colorrole') {
      const guild = interaction.guild;
      const member = interaction.member;
      const targetRole = interaction.options.getRole('rol');
      const speed = interaction.options.getInteger('velocidad') || 5;

      if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'No tienes permisos para gestionar roles de color.', ephemeral: true });
      }

      if (speed < 1 || speed > 60) {
        return interaction.reply({ 
          content: 'La velocidad debe estar entre 1 y 60 segundos.', 
          ephemeral: true 
        });
      }

      const botMember = guild.members.cache.get(client.user.id);
      if (targetRole.position >= botMember.roles.highest.position) {
        return interaction.reply({ 
          content: 'No puedo modificar ese rol porque está por encima de mi rol más alto.', 
          ephemeral: true 
        });
      }

      try {
        const existingInterval = client.colorIntervals?.get(guild.id);
        if (existingInterval) {
          clearInterval(existingInterval);
          client.colorIntervals.delete(guild.id);
        }

        client.colorRoles.set(guild.id, targetRole.id);
        startColorRotation(guild, speed);
        
        // Guardar configuración en archivo para persistencia
        try {
          let colorData = {};
          if (fs.existsSync(path.join(__dirname, 'config', 'color-roles.json'))) {
            colorData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'color-roles.json'), 'utf8'));
          }
          colorData[guild.id] = { roleId: targetRole.id, speed: speed };
          fs.writeFileSync(path.join(__dirname, 'config', 'color-roles.json'), JSON.stringify(colorData, null, 2));
        } catch (saveError) {
          console.error('Error guardando configuración de color:', saveError);
        }
        
        await interaction.reply({ 
          content: `¡Rol **${targetRole.name}** ahora cambiará de color automáticamente cada **${speed} segundos**! 🎨\n💡 El cambio de color continuará incluso si el bot se reinicia.`,
          ephemeral: false 
        });
      } catch (error) {
        console.error('Error con rol de color:', error);
        await interaction.reply({ content: 'Error al configurar el rol de color.', ephemeral: true });
      }
    }

    if (commandName === 'stopcolor') {
      const guild = interaction.guild;
      const member = interaction.member;

      if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'No tienes permisos para gestionar roles de color.', ephemeral: true });
      }

      try {
        const existingInterval = client.colorIntervals?.get(guild.id);
        if (existingInterval) {
          clearInterval(existingInterval);
          client.colorIntervals.delete(guild.id);
        }

        const existingRoleId = client.colorRoles.get(guild.id);
        let roleName = 'el rol';
        if (existingRoleId) {
          const existingRole = guild.roles.cache.get(existingRoleId);
          if (existingRole) {
            roleName = `**${existingRole.name}**`;
          }
          client.colorRoles.delete(guild.id);
        }

        // Eliminar configuración guardada
        try {
          if (fs.existsSync(path.join(__dirname, 'config', 'color-roles.json'))) {
            let colorData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'color-roles.json'), 'utf8'));
            delete colorData[guild.id];
            fs.writeFileSync(path.join(__dirname, 'config', 'color-roles.json'), JSON.stringify(colorData, null, 2));
          }
        } catch (saveError) {
          console.error('Error eliminando configuración de color:', saveError);
        }

        await interaction.reply({ 
          content: `¡Cambio de color detenido para ${roleName}! El rol mantiene su color actual. 🛑`, 
          ephemeral: false 
        });
      } catch (error) {
        console.error('Error deteniendo rol de color:', error);
        await interaction.reply({ content: 'Error al detener el cambio de color.', ephemeral: true });
      }
    }

    // Panel de tickets: publica un botón para crear ticket
    if (commandName === 'ticketpanel') {
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }

      const buttons = [];
      const buttonConfigs = [];
      const panelMessage = interaction.options.getString('mensaje')?.trim();

      const optionErrors = [];
      for (let i = 1; i <= 5; i++) {
        const buttonName = interaction.options.getString(`boton${i}`) || interaction.options.getString(`boton${i}name`);
        const buttonQuestion = interaction.options.getString(`pregunta${i}`) || interaction.options.getString(`boton${i}question`);
        if (!buttonName && buttonQuestion) {
          optionErrors.push(`La pregunta ${i} sólo puede usarse si defines el botón ${i}.`);
          continue;
        }
        if (buttonName) {
          buttonConfigs.push({
            name: buttonName.trim(),
            question: buttonQuestion?.trim() || null,
            index: i
          });
        }
      }
      if (optionErrors.length > 0) {
        return interaction.reply({ content: `❌ Error de configuración:\n${optionErrors.join('\n')}`, ephemeral: true });
      }

      if (buttonConfigs.length === 0) {
        buttonConfigs.push({ name: 'Crear Ticket', question: null, index: 0 });
      }

      for (const config of buttonConfigs) {
        const customId = config.question ? `create_ticket_q${config.index}` : `create_ticket_${config.index}`;
        buttons.push(
          new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(config.name)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );
      }

      const embed = new EmbedBuilder()
        .setTitle('🎫 Centro de Soporte')
        .setDescription(panelMessage || 'Pulsa un botón para abrir un ticket con el staff.\n\n**Para usuarios aislados:** Si estás en timeout, puedes crear un ticket para comunicarte con los administradores.')
        .setColor(0x5865F2);

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
        rows.push(row);
      }

      await interaction.channel.send({ embeds: [embed], components: rows });

      if (buttonConfigs.length > 0) {
        // Guardar configuración del panel en archivo
        const guildConfig = getTicketConfig(interaction.guild.id) || {};
        guildConfig.panelConfigs = buttonConfigs;
        guildConfig.panelMessage = panelMessage || null;
        setTicketConfig(interaction.guild.id, guildConfig);
        console.log(`[TICKETS] ✅ Panel guardado para servidor ${interaction.guild.id}`);
      }

      return interaction.reply({ content: '✅ Panel de tickets publicado correctamente.', ephemeral: true });
    }

    // SETUP: Panel de administración completo del servidor
    if (commandName === 'setup') {
      if (!hasStaffPermission(interaction.member, interaction.guild)) {
        return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎛️ Panel de Administración del Servidor')
        .setDescription('Gestiona todo el servidor desde aquí - VOZ, ROLES, ESTADÍSTICAS')
        .addFields(
          { name: '🔊 GESTIÓN DE VOZ', value: '🔇 Desconectar todos\n🗑️ Borrar salas temporales\n🧹 Limpiar todo', inline: true },
          { name: '👥 GESTIÓN DE ROLES', value: '🎭 Dar/Quitar roles de usuarios\n✅ Gestión completa de roles', inline: true },
          { name: '📊 INFORMACIÓN', value: '📈 Ver estadísticas del servidor\n👥 Miembros, canales, roles', inline: true }
        )
        .setColor(0xFF0000)
        .setFooter({ text: '⚠️ Usa con precaución - Acciones irreversibles' })
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_disconnect_all').setLabel('🔇 DESCONECTAR TODOS').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_delete_temp').setLabel('🗑️ BORRAR SALAS').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_clean_all').setLabel('🧹 LIMPIAR VOZ').setStyle(ButtonStyle.Danger)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_role_user').setLabel('🎭 GESTIONAR ROLES').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_stats').setLabel('📊 ESTADÍSTICAS').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }

    // VOICEADMIN: Panel de administración de voz (alias de setup)
    if (commandName === 'voiceadmin') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎛️ Panel de Administración de Voz')
        .setDescription('Gestiona todos los canales de voz del servidor desde aquí.')
        .addFields(
          { name: '🔇 DESCONECTAR TODOS', value: 'Expulsa a todos los usuarios de todos los canales de voz', inline: false },
          { name: '🗑️ BORRAR SALAS TEMPORALES', value: 'Elimina todos los canales de voz temporales (salas privadas)', inline: false },
          { name: '🧹 LIMPIAR TODO', value: 'Desconecta a todos Y elimina todas las salas temporales', inline: false }
        )
        .setColor(0xFF0000)
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_disconnect_all').setLabel('DESCONECTAR TODOS').setStyle(ButtonStyle.Danger).setEmoji('🔇'),
        new ButtonBuilder().setCustomId('admin_delete_temp').setLabel('BORRAR SALAS TEMPORALES').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_clean_all').setLabel('LIMPIAR TODO').setStyle(ButtonStyle.Danger).setEmoji('🧹')
      );

      return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }


    // LOGS: Configuración simple de canal de logs
    if (commandName === 'logs') {
      console.log(`📋 Comando /logs ejecutado por ${interaction.user.tag}`);
      
      try {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
        }

        const logChannelId = client.antiRaid.logChannel.get(interaction.guild.id);
        const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;

        // Crear menú de selección de canales
        const textChannels = Array.from(interaction.guild.channels.cache
          .filter(ch => ch.type === ChannelType.GuildText)
          .values())
          .sort((a, b) => a.position - b.position)
          .slice(0, 25);

        if (textChannels.length === 0) {
          return interaction.reply({ content: '❌ No hay canales de texto en este servidor.', ephemeral: true });
        }

        const options = textChannels.map(channel => 
          new StringSelectMenuOptionBuilder()
            .setLabel(channel.name)
            .setDescription(`Canal: #${channel.name}`)
            .setValue(channel.id)
            .setEmoji('📝')
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('logs_select_channel')
          .setPlaceholder('Selecciona un canal para los logs')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle('📋 Configurar Canal de Logs')
          .setDescription(`**Hola ${interaction.user.tag}!**\n\nSelecciona un canal donde se registrarán todos los eventos del servidor.\n\n**Canal actual:** ${logChannel ? `${logChannel}` : '⚠️ No configurado'}\n\n**Eventos que se registrarán:**\n• Mensajes eliminados/editados/fijados\n• Usuarios entran/salen\n• Bots añadidos/eliminados\n• Bans/Unbans\n• Roles creados/eliminados/actualizados\n• Canales creados/eliminados/actualizados\n• Categorías actualizadas\n• Invitaciones creadas/eliminadas\n• Webhooks actualizados\n• Servidor actualizado\n• Voz: entrada/salida/cambio/mute\n• Moderación y comandos usados\n• Acciones Anti-Raid, anti-spam y anti-links`)
          .setColor(logChannel ? 0x00FF00 : 0xFFA500)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ text: 'Los logs se envían automáticamente al canal seleccionado' })
          .setTimestamp();

        console.log(`📋 Enviando respuesta del comando /logs`);
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      } catch (error) {
        console.error('❌ Error en comando /logs:', error);
        return interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
      }
    }

    // Comando generatehtml
    if (commandName === 'generatehtml') {
      console.log('📄 Comando generatehtml ejecutado por:', interaction.user.tag);
      console.log('📄 Llegó al handler del comando generatehtml');
      
      // Verificar que estemos en un canal de ticket
      if (!interaction.channel.name.startsWith('ticket-')) {
        return await interaction.reply({ 
          content: '❌ Este comando solo funciona en canales de ticket.', 
          ephemeral: true 
        });
      }
      
      try {
        const ticketName = interaction.channel.name;
        console.log(`📄 Generando HTML manualmente para ticket: ${ticketName}`);
        
        const htmlPath = await generateTicketHTML(interaction.channel, ticketName, interaction.user.tag);
        
        if (htmlPath) {
          return await interaction.reply({ 
            content: `✅ HTML del ticket generado exitosamente: \`${htmlPath}\``, 
            ephemeral: true 
          });
        } else {
          return await interaction.reply({ 
            content: '❌ Error al generar el HTML del ticket.', 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('❌ Error en comando generatehtml:', error);
        return await interaction.reply({ 
          content: '❌ Error al generar el HTML del ticket.', 
          ephemeral: true 
        });
      }
    }

    // [Aquí agregarías todos los demás comandos existentes: ban, embed, say, clear, ticket]
    // Por brevedad no los incluyo todos, but sigue el mismo patrón
  }

  // Manejo de botones (existente)
  if (interaction.isButton()) {
    // Verificar permisos para botones (excepto para admin que siempre pueden)
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const canUse = canUseCommand(interaction.member, interaction.guild.id);
    
    // Excepciones de botones que no deben requerir rol de staff
    const uiButtonAllowed = interaction.customId.startsWith('staff_') ||
      interaction.customId.startsWith('help_') ||
      interaction.customId.startsWith('juegos_') ||
      interaction.customId.startsWith('vi_') ||
      interaction.customId.startsWith('create_ticket') ||
      interaction.customId === 'close_ticket';

    // Permitir si es admin, tiene rol permitido, o es botón de UI público
    if (!isAdmin && !canUse && !uiButtonAllowed) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Sin Permisos')
        .setDescription('No tienes un rol permitido para usar las funciones de este bot.')
        .setColor(0xFF0000);

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // HELP - Botones del menú de ayuda
    if (interaction.customId === 'help_info') {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("👤 Comandos de Información")
        .setDescription("Comandos para obtener información detallada:")
        .addFields(
          { name: "`/userinfo`", value: "Información completa de un usuario", inline: true },
          { name: "`/channelinfo`", value: "Información de un canal", inline: true },
          { name: "`/serverrole`", value: "Información de un rol", inline: true },
          { name: "`/avatar`", value: "Avatar de un usuario", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.customId === 'help_mod') {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("🛡️ Comandos de Moderación")
        .setDescription("Comandos para moderar el servidor:")
        .addFields(
          { name: "`/ban`", value: "Banear a un usuario", inline: true },
          { name: "`/kick`", value: "Expulsar a un usuario", inline: true },
          { name: "`/timeout`", value: "Silenciar a un usuario", inline: true },
          { name: "`/unban`", value: "Desbanear a un usuario", inline: true },
          { name: "`/untimeout`", value: "Quitar silencio a un usuario", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.customId === 'help_roles') {
      const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("🎭 Comandos de Roles")
        .setDescription("Comandos para gestionar roles:")
        .addFields(
          { name: "`/rol`", value: "Asignar o quitar roles", inline: true },
          { name: "`/colorrole`", value: "Crear roles de color automático", inline: true },
          { name: "`/stopcolor`", value: "Detener cambios de color automático", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.customId === 'help_voice') {
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("🏠 Comandos de Salas de Voz")
        .setDescription("Comandos para gestionar salas privadas:")
        .addFields(
          { name: "`/voiceinterface`", value: "Interfaz de control de sala", inline: true },
          { name: "`/setup`", value: "Configurar sistema de salas", inline: true },
          { name: "`/createcategory`", value: "Crear categoría para salas", inline: true },
          { name: "`/rename`", value: "Renombrar tu sala", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.customId === 'help_tickets') {
      const embed = new EmbedBuilder()
        .setColor("#9B59B6")
        .setTitle("🎫 Comandos de Tickets")
        .setDescription("Comandos para el sistema de tickets:")
        .addFields(
          { name: "`/ticketpanel`", value: "Crear panel de tickets", inline: true },
          { name: "`/generatehtml`", value: "Generar HTML de ticket", inline: true },
          { name: "`/ticketstaffrole`", value: "Configurar rol de staff de tickets", inline: true },
          { name: "`/ticketlogchannel`", value: "Configurar canal de logs de tickets", inline: true },
          { name: "`/ticketclose`", value: "Cerrar ticket actual", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.customId === 'help_config') {
      const embed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle("📋 Comandos de Configuración")
        .setDescription("Comandos para configurar el bot:")
        .addFields(
          { name: "`/logs`", value: "Configurar sistema de logs", inline: true },
          { name: "`/staffrole`", value: "Configurar rol de staff", inline: true },
          { name: "`/setroles`", value: "Configurar roles permitidos", inline: true },
          { name: "`/voiceadmin`", value: "Administración de voz", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    if (interaction.customId === 'help_utils') {
      const embed = new EmbedBuilder()
        .setColor("#95A5A6")
        .setTitle("🧪 Comandos de Utilidades")
        .setDescription("Comandos útiles y de prueba:")
        .addFields(
          { name: "`/comandos`", value: "Lista de comandos (texto)", inline: true },
          { name: "`/help`", value: "Este menú interactivo", inline: true }
        )
        .setFooter({ text: "Usa /help para volver al menú principal" })
        .setTimestamp();
      
      await interaction.update({ embeds: [embed] });
      return;
    }

    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    const voiceChannelOwnerId = voiceChannel ? client.tempVoiceChannelOwners.get(voiceChannel.id) : null;
    const isVoiceOwner = voiceChannel && voiceChannelOwnerId === member.id;

    // Utilidad: validar que el usuario esté en un canal de voz
    const ensureInVoice = async () => {
      if (!voiceChannel) {
        await interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
        return false;
      }
      return true;
    };

    // Utilidad: validar que el usuario sea el dueño de la sala
    const ensureVoiceOwner = async () => {
      if (!(await ensureInVoice())) return false;
      if (!isVoiceOwner) {
        await interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede cambiar el nombre.', ephemeral: true });
        return false;
      }
      return true;
    };

    // NOMBRE: modal para cambiar nombre
    if (interaction.customId === 'vi_name') {
      if (!(await ensureVoiceOwner())) return;
      const modal = new ModalBuilder().setCustomId('vi_name_modal').setTitle('Cambiar nombre de la sala');
      const input = new TextInputBuilder()
        .setCustomId('vi_name_input')
        .setLabel('Nuevo nombre')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder(`Sala de ${interaction.user.username}`);
      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      return interaction.showModal(modal);
    }

    // LÍMITE: modal para límite de usuarios
    if (interaction.customId === 'vi_limit') {
      if (!(await ensureVoiceOwner())) return;
      const modal = new ModalBuilder().setCustomId('vi_limit_modal').setTitle('Establecer límite de usuarios');
      const input = new TextInputBuilder()
        .setCustomId('vi_limit_input')
        .setLabel('Límite (0 = ilimitado)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('0, 2, 3, 4, ...');
      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      return interaction.showModal(modal);
    }

    // PRIVACIDAD: mostrar panel efímero con opciones Privado/Público
    if (interaction.customId === 'vi_privacy') {
      if (!(await ensureVoiceOwner())) return;
      const everyone = interaction.guild.roles.everyone;
      const current = voiceChannel.permissionOverwrites.cache.get(everyone.id);
      const isPrivate = current?.deny?.has(PermissionsBitField.Flags.Connect);

      const embed = new EmbedBuilder()
        .setTitle('🔒 Privacidad del canal')
        .setDescription(`Estado actual: **${isPrivate ? 'Privado' : 'Público'}**\n\nElige una opción:`)
        .setColor(isPrivate ? 0xE74C3C : 0x2ECC71);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vi_priv_on').setLabel('Privado').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('vi_priv_off').setLabel('Público').setStyle(ButtonStyle.Success).setEmoji('🔓')
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // PRIVACIDAD -> Privado
    if (interaction.customId === 'vi_priv_on') {
      if (!(await ensureVoiceOwner())) return;
      const everyone = interaction.guild.roles.everyone;
      await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false });
      const confirm = new EmbedBuilder()
        .setTitle('✅ Privacidad actualizada')
        .setDescription('El canal ahora es **Privado** (solo quienes tengan permisos podrán entrar).')
        .setColor(0xE74C3C);
      return interaction.update({ embeds: [confirm], components: [] });
    }

    // PRIVACIDAD -> Público
    if (interaction.customId === 'vi_priv_off') {
      if (!(await ensureVoiceOwner())) return;
      const everyone = interaction.guild.roles.everyone;
      await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null });
      const confirm = new EmbedBuilder()
        .setTitle('✅ Privacidad actualizada')
        .setDescription('El canal ahora es **Público**.')
        .setColor(0x2ECC71);
      return interaction.update({ embeds: [confirm], components: [] });
    }

    // INVITAR: crear invitación al canal
    if (interaction.customId === 'vi_invite') {
      if (!(await ensureVoiceOwner())) return;
      const invite = await voiceChannel.createInvite({ maxAge: 600, maxUses: 5, reason: 'Invitación temporal a sala privada' });
      return interaction.reply({ content: `Invitación creada: ${invite.url}`, ephemeral: true });
    }

    // (REGION eliminado)

    // EXPULSAR: menú para expulsar usuario de la sala
    if (interaction.customId === 'vi_kick') {
      if (!(await ensureVoiceOwner())) return;
      
      // Obtener todos los miembros del canal excepto el bot y el usuario que ejecuta el comando
      const members = [...voiceChannel.members.values()].filter(m => !m.user.bot && m.id !== interaction.user.id);
      
      if (members.length === 0) {
        return interaction.reply({ content: 'No hay otros usuarios en el canal para expulsar.', ephemeral: true });
      }

      // Crear opciones del menú
      const options = members.map(member => 
        new StringSelectMenuOptionBuilder()
          .setLabel(member.user.username)
          .setDescription(`${member.user.tag}`)
          .setValue(member.id)
          .setEmoji('👢')
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('vi_kick_select')
        .setPlaceholder('Selecciona un usuario para expulsar')
        .addOptions(options.slice(0, 25)); // Discord limita a 25 opciones

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('👢 Expulsar Usuario')
        .setDescription('Selecciona el usuario que deseas expulsar de esta sala.')
        .setColor(0xFF0000);

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // BAN: modal para banear usuario de la sala
    if (interaction.customId === 'vi_ban') {
      if (!(await ensureVoiceOwner())) return;
      const modal = new ModalBuilder().setCustomId('vi_ban_modal').setTitle('Banear usuario de la sala');
      const input = new TextInputBuilder()
        .setCustomId('vi_ban_input')
        .setLabel('Usuario a banear')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Etiqueta al usuario o introduce su ID');
      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      return interaction.showModal(modal);
    }

    // UNBAN: modal para desbanear usuario de la sala
    if (interaction.customId === 'vi_unban') {
      if (!(await ensureVoiceOwner())) return;
      const bannedUsers = client.tempVoiceChannelBannedUsers.get(voiceChannel.id);
      if (!bannedUsers || bannedUsers.size === 0) {
        return interaction.reply({ content: 'No hay usuarios baneados en esta sala.', ephemeral: true });
      }
      const modal = new ModalBuilder().setCustomId('vi_unban_modal').setTitle('Desbanear usuario de la sala');
      const input = new TextInputBuilder()
        .setCustomId('vi_unban_input')
        .setLabel('Usuario a desbanear')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Etiqueta al usuario o introduce su ID');
      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      return interaction.showModal(modal);
    }

    // REIVINDICAR: asigna control al usuario actual (ManageChannels)
    if (interaction.customId === 'vi_claim') {
      if (!(await ensureInVoice())) return;
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      const ownerStillHere = ownerId ? voiceChannel.members.has(ownerId) : false;
      if (ownerStillHere && ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ El propietario todavía está en la llamada. No puedes reclamar aún.', ephemeral: true });
      }

      // Quitar permisos de admin anteriores si existían y ya no están en la sala
      const previousOwnerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (previousOwnerId && previousOwnerId !== interaction.user.id) {
        await voiceChannel.permissionOverwrites.edit(previousOwnerId, { ManageChannels: null }).catch(() => null);
      }

      await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
        ManageChannels: true,
        Connect: true,
        Speak: true
      });
      client.tempVoiceChannelOwners.set(voiceChannel.id, interaction.user.id);
      return interaction.reply({ content: 'Ahora tienes control de la sala.', ephemeral: true });
    }

    // TRANSFERIR: menú para transferir control a otro usuario
    if (interaction.customId === 'vi_transfer') {
      if (!(await ensureVoiceOwner())) return;
      
      // Obtener todos los miembros del canal de voz excepto el bot
      const members = [...voiceChannel.members.values()].filter(m => !m.user.bot && m.id !== interaction.user.id);
      
      if (members.length === 0) {
        return interaction.reply({ content: 'No hay otros usuarios en el canal para transferir la propiedad.', ephemeral: true });
      }

      // Crear opciones del menú
      const options = members.map(member => 
        new StringSelectMenuOptionBuilder()
          .setLabel(member.user.username)
          .setDescription(`${member.user.tag}`)
          .setValue(member.id)
          .setEmoji('👤')
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('vi_transfer_select')
        .setPlaceholder('Selecciona un usuario')
        .addOptions(options.slice(0, 25)); // Discord limita a 25 opciones

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('🔁 Transferir Propiedad')
        .setDescription('Selecciona el usuario al que quieres transferir el control de esta sala.')
        .setColor(0x5865F2);

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // INFO: muestra info del canal
    if (interaction.customId === 'vi_info') {
      if (!(await ensureInVoice())) return;
      const members = [...voiceChannel.members.values()].map(m => `• ${m.user.tag}`).join('\n') || 'Nadie';
      const isPrivate = voiceChannel.permissionsFor(interaction.guild.roles.everyone)?.has(PermissionsBitField.Flags.Connect) === false;
      const info = new EmbedBuilder()
        .setTitle(`ℹ️ Info: ${voiceChannel.name}`)
        .addFields(
          { name: 'ID', value: voiceChannel.id, inline: true },
          { name: 'Región', value: voiceChannel.rtcRegion || 'auto', inline: true },
          { name: 'Límite', value: String(voiceChannel.userLimit || 0), inline: true },
          { name: 'Privacidad', value: isPrivate ? 'Privado' : 'Público', inline: true },
          { name: 'Miembros', value: members, inline: false }
        )
        .setColor(0x0099ff);
      return interaction.reply({ embeds: [info], ephemeral: true });
    }
    // ELIMINAR: borrar la sala actual si el usuario está dentro
    if (interaction.customId === 'vi_delete') {
      if (!(await ensureVoiceOwner())) return;
      await interaction.reply({ content: `Eliminando ${voiceChannel.name}...`, ephemeral: true });
      await voiceChannel.delete('Eliminada desde interfaz');
      // Remover del registro de canales temporales si es temporal
      client.tempVoiceChannels.delete(voiceChannel.id);
      client.tempVoiceChannelOwners.delete(voiceChannel.id);
      return;
    }

    // Ticket: crear (con o sin pregunta)
    if (interaction.customId.startsWith('create_ticket')) {
      console.log(`[TICKETS] Botón de ticket presionado por ${interaction.user.tag}`);
      const rawCustomId = interaction.customId;
      const customId = typeof rawCustomId === 'string' ? rawCustomId.trim() : String(rawCustomId).trim();
      console.log(`[TICKETS] raw customId=${JSON.stringify(rawCustomId)} len=${String(rawCustomId).length} trimmed=${JSON.stringify(customId)} len=${customId.length}`);
      const match = customId.match(/^create_ticket(?:_q)?(\d+)$/i) || customId.match(/(\d+)/);
      const buttonIndex = match ? match[1] : null;
      
      // Cargar configuración desde el archivo JSON
      let guildConfig = getTicketConfig(interaction.guild.id);
      let buttonConfig = null;
      let panelMessageFromConfig = null;

      if (guildConfig && guildConfig.panelConfigs) {
        panelMessageFromConfig = guildConfig.panelMessage || null;
        buttonConfig = guildConfig.panelConfigs.find(c => String(c.index) === buttonIndex || (buttonIndex === '' && c.index === 0));
      }

      // Si no hay config, buscar el panel automáticamente en el servidor
      if (!guildConfig || !guildConfig.panelConfigs) {
        console.log('[TICKETS] Buscando panel en el servidor...');
        try {
          const textChannels = interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText);
          let foundPanel = false;
          for (const [, channel] of textChannels) {
            if (foundPanel) break;
            try {
              const messages = await channel.messages.fetch({ limit: 50 });
              for (const [, message] of messages) {
                if (message.embeds.length > 0 && message.embeds[0].title === '🎫 Centro de Soporte') {
                  const components = message.components.flatMap(row => row.components);
                  const ticketButtons = components.filter(c => c.customId?.startsWith('create_ticket'));

                  if (ticketButtons.length > 0) {
                    const buttonConfigs = ticketButtons.map((btn, i) => {
                      const btnMatch = btn.customId.match(/^create_ticket(?:_q)?(\d+)$/);
                      const idx = btnMatch ? btnMatch[1] : '0';
                      return { name: btn.label, index: parseInt(idx) || i, question: null };
                    });

                    // Guardar en archivo JSON
                    const guildConfigToSave = getTicketConfig(interaction.guild.id) || {};
                    guildConfigToSave.panelConfigs = buttonConfigs;
                    guildConfigToSave.panelMessage = message.embeds[0].description?.split('\n\n')[0] || null;
                    setTicketConfig(interaction.guild.id, guildConfigToSave);

                    guildConfig = guildConfigToSave;
                    panelMessageFromConfig = guildConfig.panelMessage || null;
                    if (buttonIndex !== null) {
                      buttonConfig = guildConfig.panelConfigs.find(c => String(c.index) === buttonIndex || (buttonIndex === '' && c.index === 0));
                    }
                    console.log('[TICKETS] Panel encontrado y guardado automáticamente en JSON');
                    foundPanel = true;
                    break;
                  }
                }
              }
            } catch (e) {
              // Ignorar errores al buscar en canales
            }
          }
        } catch (e) {
          console.error('[TICKETS] Error buscando panel:', e);
        }
      }

      if (!match) {
        console.warn('[TICKETS] CustomId de ticket inválido:', interaction.customId);
        return interaction.reply({ content: '❌ Error interno: no pude identificar el botón de ticket.', flags: 64 });
      }

      if (!buttonConfig) {
        console.warn('[TICKETS] No se encontró configuración para el botón:', interaction.customId, 'guild:', interaction.guild.id);
        return interaction.reply({ content: '❌ No pude cargar la configuración del ticket. Vuelve a crear el panel.', flags: 64 });
      }

      if (buttonConfig.question) {
        const questionLabel = typeof buttonConfig.question === 'string'
          ? buttonConfig.question.slice(0, 45)
          : 'Respuesta del ticket';

        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${buttonIndex}`)
          .setTitle('Por favor, responde la siguiente pregunta')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('ticket_answer')
                .setLabel(questionLabel)
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder((panelMessageFromConfig?.slice(0, 100)) || 'Escribe tu respuesta aquí...')
                .setRequired(true)
            )
          );

        try {
          await interaction.showModal(modal);
        } catch (error) {
          console.error('[TICKETS] Error mostrando modal:', error);
          return interaction.reply({ content: '❌ No pude abrir el formulario. Comprueba los permisos del bot.', flags: 64 });
        }
        return;
      }

      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        console.warn('[TICKETS] El bot no tiene permiso Gestionar Canales en este servidor.');
        return interaction.reply({ content: '❌ Necesito el permiso "Gestionar Canales" para crear tickets.', flags: 64 });
      }

      try {
        await interaction.deferReply({ flags: 64 });
      } catch (error) {
        console.error('[TICKETS] Error al deferReply antes de crear el ticket:', error);
      }

      try {
        let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && /ticket|soporte|support/i.test(c.name));
        
        // Si no existe categoría, crearla automáticamente
        if (!category) {
          console.log(`[TICKETS] No se encontró categoría de tickets, creando una nueva...`);
          try {
            category = await interaction.guild.channels.create({
              name: '🎫 Tickets',
              type: ChannelType.GuildCategory,
              permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
              ]
            });
            console.log(`[TICKETS] ✅ Categoría "${category.name}" creada exitosamente (ID: ${category.id})`);
          } catch (categoryError) {
            console.error(`[TICKETS] ❌ Error creando categoría:`, categoryError);
            return interaction.editReply({ content: '❌ Error al crear la categoría de tickets. Verifica los permisos del bot.' });
          }
        } else {
          console.log(`[TICKETS] Usando categoría existente: ${category.name} (ID: ${category.id})`);
        }
        
        const parentId = category.id;
        console.log(`[TICKETS] Creando ticket para ${interaction.user.username} en categoría ${parentId}...`);
        console.log('[TICKETS] Categoría permisos:', category.permissionOverwrites.cache.map(o => ({ id: o.id, allow: o.allow?.toArray?.(), deny: o.deny?.toArray?.() })));
        
        try {
          // Construir permisos base
          const permOverwrites = [
            { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
          ];
          
          const staffRoleIds = guildConfig?.ticketStaffRoles || [];
          console.log('[TICKETS] Roles configurados en ticketConfig:', staffRoleIds);

          // Añadir roles de staff configurados para que vean los tickets
          if (staffRoleIds.length > 0) {
            staffRoleIds.forEach(roleId => {
              if (interaction.guild.roles.cache.has(roleId)) {
                permOverwrites.push({
                  id: roleId,
                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.ManageMessages
                  ]
                });
              } else {
                console.warn('[TICKETS] Rol configurado no encontrado en guild.roles.cache:', roleId);
              }
            });
          }
          // También añadir el rol de staff principal si existe y no está en la lista
          const mainStaffRoleId = client.ticketStaffRole.get(interaction.guild.id);
          console.log('[TICKETS] Rol principal de tickets (mainStaffRoleId):', mainStaffRoleId);
          if (mainStaffRoleId && !permOverwrites.find(p => p.id === mainStaffRoleId)) {
            if (interaction.guild.roles.cache.has(mainStaffRoleId)) {
              permOverwrites.push({
                id: mainStaffRoleId,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.ManageMessages
                ]
              });
            } else {
              console.warn('[TICKETS] Rol principal de tickets no encontrado en guild.roles.cache:', mainStaffRoleId);
            }
          }

          console.log('[TICKETS] permissionOverwrites antes de crear canal:', permOverwrites);
          const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.id}`,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites: permOverwrites
          });
          console.log(`[TICKETS] ✅ Ticket creado exitosamente: ${channel.name} (ID: ${channel.id})`);
          console.log('[TICKETS] Canal permisos tras creación:', channel.permissionOverwrites.cache.map(o => ({ id: o.id, allow: o.allow?.toArray?.(), deny: o.deny?.toArray?.() })));

          const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
          );
          const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Abierto')
            .setDescription('Un miembro del staff te atenderá enseguida. Describe tu problema.')
            .addFields(
              { name: '� Categoría', value: `${buttonConfig?.name || 'General'}`, inline: false },
              { name: '�📌 Solicitante', value: `${interaction.user}`, inline: false }
            )
            .setColor(0x2ECC71);
          const mentionRoleIds = new Set();
          if (guildConfig && guildConfig.ticketStaffRoles) {
            guildConfig.ticketStaffRoles.forEach(roleId => mentionRoleIds.add(roleId));
          }
          if (mainStaffRoleId) mentionRoleIds.add(mainStaffRoleId);
          const mention = Array.from(mentionRoleIds)
            .filter(roleId => interaction.guild.roles.cache.has(roleId))
            .map(roleId => `<@&${roleId}>`)
            .join(' ');
          const mentionText = mention ? ` ${mention}` : '';
          await channel.send({ content: `${interaction.user}${mentionText}`, embeds: [embed], components: [closeRow] });
          
          // Generar ICO y HTML del ticket al crearlo
          const ticketName = `ticket-${interaction.user.id}`;
          console.log(`🔍 Generando ICO para ticket creado: ${ticketName}`);
          const icoPath = await generateTicketICO(channel, ticketName);
          
          console.log(`🔍 Generando HTML para ticket creado: ${ticketName}`);
          const htmlPath = await generateTicketHTML(channel, ticketName, interaction.user.tag);
          
          // LOG: Ticket abierto con HTML adjunto
          const logEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Abierto')
            .setDescription(`**Usuario:** ${interaction.user.tag}\n**Canal:** ${channel}\n**ID del ticket:** ${channel.id}\n**HTML generado:** ${htmlPath ? '✅ Sí' : '❌ No'}`)
            .setColor(0x00FF00)
            .setTimestamp();
          await sendSecurityLog(interaction.guild, logEmbed, htmlPath);
          
          console.log(`[TICKETS] ✅ Proceso completo finalizado para ${interaction.user.tag}`);
          return interaction.editReply({ content: `✅ Tu ticket ha sido creado: ${channel}` });
        } catch (channelError) {
          console.error(`[TICKETS] ❌ Error creando canal de ticket:`, channelError);
          return interaction.editReply({ content: '❌ Error al crear el ticket. Verifica los permisos del bot.' });
        }
      } catch (e) {
        console.error('[TICKETS] ❌ Error general creando ticket:', e);
        console.error('[TICKETS] Stack trace:', e.stack);
        try {
          return interaction.editReply({ content: '❌ No pude crear el ticket. Revisa los logs del bot.' });
        } catch (editError) {
          console.error('[TICKETS] Error editando reply después de fallo:', editError);
          return; 
        }
      }
    }

    // Ticket: cerrar
    if (interaction.customId === 'close_ticket') {
      try {
        const ticketChannel = interaction.channel;
        const ticketName = ticketChannel.name;

        const closeEmbed = new EmbedBuilder()
          .setTitle('🔒 Cerrando ticket...')
          .setDescription('Este ticket se cerrará en 5 segundos.')
          .setColor(0xFFA500);

        await ticketChannel.send({ embeds: [closeEmbed] });
        await interaction.reply({ content: 'El ticket se cerrará en 5 segundos.', flags: 64 });

        // Generar HTML y PDF del ticket antes de cerrarlo
        console.log(`🔍 Debug - Iniciando generación de HTML para ticket: ${ticketName}`);
        const htmlPath = await generateTicketHTML(ticketChannel, ticketName, interaction.user.tag);

        // Solo generamos HTML (PDF desactivado)
        const pdfPath = null;

        if (htmlPath) {
          console.log(`✅ HTML del ticket ${ticketName} generado exitosamente: ${htmlPath}`);
          console.log(`🔍 Debug - Verificando si el archivo HTML existe: ${fs.existsSync(htmlPath)}`);
        } else {
          console.log(`⚠️ No se pudo generar el HTML del ticket ${ticketName}`);
        }

        // LOG: Ticket cerrado con HTML y PDF adjuntos
        const logEmbed = new EmbedBuilder()
          .setTitle('🔒 Ticket Cerrado')
          .setDescription(`**Ticket:** ${ticketName}\n**Cerrado por:** ${interaction.user.tag}\n**ID del canal:** ${ticketChannel.id}\n**HTML generado:** ${htmlPath ? '✅ Sí' : '❌ No'}\n\n📄 **Archivo:** ${htmlPath ? 'HTML disponible' : 'No disponible'}`)
          .setColor(0xFF0000)
          .setTimestamp();

        console.log(`🔍 Debug - Enviando log con HTML y PDF al canal de logs...`);
        
        // Obtener el canal de logs configurado para tickets
        let ticketLogChannelId = null;
        try {
          const ticketsConfigPath = path.join(__dirname, 'config', 'tickets-config.json');
          if (fs.existsSync(ticketsConfigPath)) {
            const ticketsConfig = JSON.parse(fs.readFileSync(ticketsConfigPath, 'utf8'));
            if (ticketsConfig.guilds && ticketsConfig.guilds[interaction.guild.id]) {
              ticketLogChannelId = ticketsConfig.guilds[interaction.guild.id].ticketLogChannelId;
            }
          }
        } catch (e) {
          console.warn('Error leyendo tickets-config.json:', e);
        }

        // Enviar log con HTML y PDF adjuntos si se generaron correctamente
        await sendSecurityLog(interaction.guild, logEmbed, htmlPath, pdfPath, ticketLogChannelId);

        // Buscar el usuario que creó el ticket desde los permissionOverwrites del canal
        let ticketUser = null;
        
        // Buscar en los permissionOverwrites del canal
        for (const [id, overwrite] of ticketChannel.permissionOverwrites.cache) {
          if (overwrite.allow && overwrite.allow.has(PermissionsBitField.Flags.ViewChannel) && !overwrite.deny) {
            // Verificar si es un usuario (no rol)
            const member = await interaction.guild.members.fetch(id).catch(() => null);
            if (member && !member.user.bot) {
              ticketUser = member;
              break;
            }
          }
        }
        
        // Si no se encontró por permissionOverwrites, intentar por el nombre del canal
        if (!ticketUser) {
          const ticketUsername = ticketName.replace('ticket-', '').split('_')[0];
          ticketUser = interaction.guild.members.cache.find(m => m.user.username === ticketUsername);
        }
        
        // Si aún no se encuentra, buscar por ID si el nombre contiene ID
        if (!ticketUser) {
          const match = ticketName.match(/ticket-(\d+)/);
          if (match) {
            ticketUser = await interaction.guild.members.fetch(match[1]).catch(() => null);
          }
        }
        
        // Enviar HTML y PDF al usuario que creó el ticket (o al owner del servidor si no se encuentra)
        const recipient = ticketUser || interaction.guild.owner;
        
        if (recipient) {
          try {
            const userEmbed = new EmbedBuilder()
              .setTitle('🔒 Tu Ticket ha sido Cerrado')
              .setDescription(`Tu ticket **${ticketName}** ha sido cerrado por **${interaction.user.tag}**`)
              .addFields(
                { name: '📄 Archivo', value: htmlPath ? 'HTML enviado' : 'No disponible', inline: true }
              )
              .setColor(0x00FF00)
              .setTimestamp();
            
            // Preparar archivos para enviar al usuario
            const userFiles = [];
            if (htmlPath && fs.existsSync(htmlPath)) {
              userFiles.push({ attachment: htmlPath, name: path.basename(htmlPath) });
            }
            if (pdfPath && fs.existsSync(pdfPath)) {
              userFiles.push({ attachment: pdfPath, name: path.basename(pdfPath) });
            }
            
            if (userFiles.length > 0) {
              await recipient.send({ embeds: [userEmbed], files: userFiles });
            } else {
              await recipient.send({ embeds: [userEmbed] });
            }
            console.log(`✅ Archivos del ticket enviados a ${recipient.user.tag}`);
          } catch (dmError) {
            console.log(`⚠️ No se pudo enviar MD al usuario: ${dmError.message}`);
          }
        }
        
        // Esperar un momento antes de eliminar el canal para que el usuario vea el mensaje
        setTimeout(async () => {
          try {
            await interaction.channel.delete('Ticket cerrado - HTML generado');
          } catch (deleteError) {
            console.error('Error eliminando canal del ticket:', deleteError);
          }
        }, 5000);
        
      } catch (e) {
        console.error('Error cerrando ticket:', e);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Error al cerrar el ticket.', ephemeral: true });
        }
      }
      return;
    }

    // ADMIN VOZ: Desconectar a todos de los canales de voz
    if (interaction.customId === 'admin_disconnect_all') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        let disconnectedCount = 0;
        const voiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
        
        for (const [, channel] of voiceChannels) {
          for (const [, member] of channel.members) {
            try {
              await member.voice.disconnect('Desconectado por administrador');
              disconnectedCount++;
            } catch (e) {
              console.error(`Error desconectando a ${member.user.tag}:`, e);
            }
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Desconexión Masiva Completada')
          .setDescription(`Se han desconectado **${disconnectedCount}** usuarios de todos los canales de voz.`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error en desconexión masiva:', error);
        return interaction.editReply({ content: '❌ Error al desconectar usuarios.' });
      }
    }

    // ADMIN VOZ: Borrar todas las salas temporales
    if (interaction.customId === 'admin_delete_temp') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        let deletedCount = 0;
        const voiceChannels = interaction.guild.channels.cache.filter(
          c => c.type === ChannelType.GuildVoice && 
          (c.name.includes('Sala de ') || c.name.includes('🔊 Sala') || client.tempVoiceChannels.has(c.id))
        );
        
        for (const [, channel] of voiceChannels) {
          try {
            await channel.delete('Eliminado por administrador');
            // Remover del registro de canales temporales
            client.tempVoiceChannels.delete(channel.id);
            client.tempVoiceChannelOwners.delete(channel.id);
            deletedCount++;
          } catch (e) {
            console.error(`Error eliminando ${channel.name}:`, e);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Salas Temporales Eliminadas')
          .setDescription(`Se han eliminado **${deletedCount}** salas temporales.`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error eliminando salas:', error);
        return interaction.editReply({ content: '❌ Error al eliminar salas temporales.' });
      }
    }

    // ADMIN VOZ: Limpiar todo (desconectar + borrar salas)
    if (interaction.customId === 'admin_clean_all') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        let disconnectedCount = 0;
        let deletedCount = 0;

        // Primero desconectar a todos
        const allVoiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
        
        for (const [, channel] of allVoiceChannels) {
          for (const [, member] of channel.members) {
            try {
              await member.voice.disconnect('Limpieza de voz por administrador');
              disconnectedCount++;
            } catch (e) {
              console.error(`Error desconectando a ${member.user.tag}:`, e);
            }
          }
        }

        // Luego eliminar salas temporales
        const tempChannels = interaction.guild.channels.cache.filter(
          c => c.type === ChannelType.GuildVoice && 
          (c.name.includes('Sala de ') || c.name.includes('🔊 Sala'))
        );
        
        for (const [, channel] of tempChannels) {
          try {
            await channel.delete('Limpieza de voz por administrador');
            deletedCount++;
          } catch (e) {
            console.error(`Error eliminando ${channel.name}:`, e);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Limpieza Total Completada')
          .setDescription(`**${disconnectedCount}** usuarios desconectados\n**${deletedCount}** salas temporales eliminadas`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error en limpieza total:', error);
        return interaction.editReply({ content: '❌ Error en la limpieza total.' });
      }
    }

    // ADMIN ROLES: Quitar todos los roles de todos los usuarios
    if (interaction.customId === 'admin_remove_roles') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        let rolesRemovedCount = 0;
        let usersAffected = 0;
        const members = await interaction.guild.members.fetch();
        
        for (const [, member] of members) {
          if (member.user.bot) continue; // Saltar bots
          
          const memberRoles = member.roles.cache.filter(role => role.id !== interaction.guild.roles.everyone.id);
          
          for (const [, role] of memberRoles) {
            try {
              // Solo quitar roles que el bot pueda gestionar
              if (role.position < interaction.guild.members.me.roles.highest.position) {
                await member.roles.remove(role);
                rolesRemovedCount++;
              }
            } catch (e) {
              console.error(`Error quitando rol ${role.name} a ${member.user.tag}:`, e);
            }
          }
          
          if (memberRoles.size > 0) usersAffected++;
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Roles Removidos')
          .setDescription(`**${rolesRemovedCount}** roles removidos de **${usersAffected}** usuarios`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error removiendo roles:', error);
        return interaction.editReply({ content: '❌ Error al remover roles.' });
      }
    }

    // ADMIN ROLES: Menú para quitar roles de un usuario específico
    if (interaction.customId === 'admin_role_user') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        // Obtener TODOS los miembros del servidor
        await interaction.guild.members.fetch();
        
        const allMembers = Array.from(interaction.guild.members.cache.values())
          .filter(m => !m.user.bot)
          .sort((a, b) => a.user.username.localeCompare(b.user.username));
        
        if (allMembers.length === 0) {
          return interaction.editReply({ content: 'No hay usuarios en el servidor.' });
        }

        // Guardar página actual (comenzar en 0)
        const page = 0;
        const membersPerPage = 25;
        const totalPages = Math.ceil(allMembers.length / membersPerPage);
        
        const members = allMembers.slice(page * membersPerPage, (page + 1) * membersPerPage);

        const options = members.map(member => 
          new StringSelectMenuOptionBuilder()
            .setLabel(member.user.username)
            .setDescription(`${member.user.tag} - ${member.roles.cache.size - 1} roles`)
            .setValue(member.id)
            .setEmoji('👤')
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('admin_select_user_roles')
          .setPlaceholder('Selecciona un usuario de la lista')
          .addOptions(options);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);

        // Botones de navegación y opción manual
        const navigationButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_users_prev_${page}`)
            .setLabel('◀️ Anterior')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`admin_users_next_${page}`)
            .setLabel('Siguiente ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1),
          new ButtonBuilder()
            .setCustomId('admin_user_by_id')
            .setLabel('📝 Ingresar ID')
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('🧑 Gestionar Roles de Usuario')
          .setDescription(`**${allMembers.length}** usuarios en total\nMostrando página **${page + 1}** de **${totalPages}**\n\n🔍 Selecciona un usuario o ingresa su ID manualmente`)
          .setColor(0x5865F2)
          .setFooter({ text: `Usuarios ${page * membersPerPage + 1}-${Math.min((page + 1) * membersPerPage, allMembers.length)} de ${allMembers.length}` });

        return interaction.editReply({ embeds: [embed], components: [row1, navigationButtons] });
      } catch (error) {
        console.error('Error obteniendo miembros:', error);
        return interaction.editReply({ content: '❌ Error al obtener la lista de usuarios.' });
      }
    }

    // ADMIN STATS: Mostrar estadísticas del servidor
    if (interaction.customId === 'admin_stats') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const guild = interaction.guild;
        const members = await guild.members.fetch();
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        const tempChannels = voiceChannels.filter(c => c.name.includes('Sala de ') || c.name.includes('🔊 Sala'));
        
        let usersInVoice = 0;
        voiceChannels.forEach(channel => {
          usersInVoice += channel.members.size;
        });

        const embed = new EmbedBuilder()
          .setTitle(`📊 Estadísticas de ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '👥 Miembros', value: `Total: **${members.size}**\nHumanos: **${members.filter(m => !m.user.bot).size}**\nBots: **${members.filter(m => m.user.bot).size}**`, inline: true },
            { name: '🔊 Canales de Voz', value: `Total: **${voiceChannels.size}**\nUsuarios en voz: **${usersInVoice}**\nSalas temporales: **${tempChannels.size}**`, inline: true },
            { name: '💬 Canales de Texto', value: `**${textChannels.size}** canales`, inline: true },
            { name: '🎭 Roles', value: `**${guild.roles.cache.size}** roles`, inline: true },
            { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true }
          )
          .setColor(0x5865F2)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return interaction.editReply({ content: '❌ Error al obtener estadísticas.' });
      }
    }

    // ADMIN - Navegación de páginas de usuarios (ANTERIOR)
    if (interaction.customId.startsWith('admin_users_prev_')) {
      const currentPage = parseInt(interaction.customId.split('_').pop());
      const newPage = Math.max(0, currentPage - 1);
      
      await interaction.deferUpdate();
      
      try {
        await interaction.guild.members.fetch();
        const allMembers = Array.from(interaction.guild.members.cache.values())
          .filter(m => !m.user.bot)
          .sort((a, b) => a.user.username.localeCompare(b.user.username));
        
        const membersPerPage = 25;
        const totalPages = Math.ceil(allMembers.length / membersPerPage);
        const members = allMembers.slice(newPage * membersPerPage, (newPage + 1) * membersPerPage);

        const options = members.map(member => 
          new StringSelectMenuOptionBuilder()
            .setLabel(member.user.username)
            .setDescription(`${member.user.tag} - ${member.roles.cache.size - 1} roles`)
            .setValue(member.id)
            .setEmoji('👤')
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('admin_select_user_roles')
          .setPlaceholder('Selecciona un usuario de la lista')
          .addOptions(options);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);

        const navigationButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_users_prev_${newPage}`)
            .setLabel('◀️ Anterior')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPage === 0),
          new ButtonBuilder()
            .setCustomId(`admin_users_next_${newPage}`)
            .setLabel('Siguiente ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPage >= totalPages - 1),
          new ButtonBuilder()
            .setCustomId('admin_user_by_id')
            .setLabel('📝 Ingresar ID')
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('🧑 Gestionar Roles de Usuario')
          .setDescription(`**${allMembers.length}** usuarios en total\nMostrando página **${newPage + 1}** de **${totalPages}**\n\n🔍 Selecciona un usuario o ingresa su ID manualmente`)
          .setColor(0x5865F2)
          .setFooter({ text: `Usuarios ${newPage * membersPerPage + 1}-${Math.min((newPage + 1) * membersPerPage, allMembers.length)} de ${allMembers.length}` });

        return interaction.editReply({ embeds: [embed], components: [row1, navigationButtons] });
      } catch (error) {
        console.error('Error en navegación:', error);
        return interaction.editReply({ content: '❌ Error al cambiar de página.' });
      }
    }

    // ADMIN - Navegación de páginas de usuarios (SIGUIENTE)
    if (interaction.customId.startsWith('admin_users_next_')) {
      const currentPage = parseInt(interaction.customId.split('_').pop());
      
      await interaction.deferUpdate();
      
      try {
        await interaction.guild.members.fetch();
        const allMembers = Array.from(interaction.guild.members.cache.values())
          .filter(m => !m.user.bot)
          .sort((a, b) => a.user.username.localeCompare(b.user.username));
        
        const membersPerPage = 25;
        const totalPages = Math.ceil(allMembers.length / membersPerPage);
        const newPage = Math.min(totalPages - 1, currentPage + 1);
        const members = allMembers.slice(newPage * membersPerPage, (newPage + 1) * membersPerPage);

        const options = members.map(member => 
          new StringSelectMenuOptionBuilder()
            .setLabel(member.user.username)
            .setDescription(`${member.user.tag} - ${member.roles.cache.size - 1} roles`)
            .setValue(member.id)
            .setEmoji('👤')
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('admin_select_user_roles')
          .setPlaceholder('Selecciona un usuario de la lista')
          .addOptions(options);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);

        const navigationButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_users_prev_${newPage}`)
            .setLabel('◀️ Anterior')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPage === 0),
          new ButtonBuilder()
            .setCustomId(`admin_users_next_${newPage}`)
            .setLabel('Siguiente ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPage >= totalPages - 1),
          new ButtonBuilder()
            .setCustomId('admin_user_by_id')
            .setLabel('📝 Ingresar ID')
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('🧑 Gestionar Roles de Usuario')
          .setDescription(`**${allMembers.length}** usuarios en total\nMostrando página **${newPage + 1}** de **${totalPages}**\n\n🔍 Selecciona un usuario o ingresa su ID manualmente`)
          .setColor(0x5865F2)
          .setFooter({ text: `Usuarios ${newPage * membersPerPage + 1}-${Math.min((newPage + 1) * membersPerPage, allMembers.length)} de ${allMembers.length}` });

        return interaction.editReply({ embeds: [embed], components: [row1, navigationButtons] });
      } catch (error) {
        console.error('Error en navegación:', error);
        return interaction.editReply({ content: '❌ Error al cambiar de página.' });
      }
    }

    // ADMIN - Ingresar ID manualmente
    if (interaction.customId === 'admin_user_by_id') {
      const modal = new ModalBuilder()
        .setCustomId('admin_user_id_modal')
        .setTitle('Ingresar ID de Usuario');

      const input = new TextInputBuilder()
        .setCustomId('user_id_input')
        .setLabel('ID del Usuario')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678')
        .setMinLength(17)
        .setMaxLength(20);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    // LOGS - Configurar canal de logs
    if (interaction.customId === 'logs_set_channel') {
      const modal = new ModalBuilder()
        .setCustomId('logs_channel_modal')
        .setTitle('Configurar Canal de Logs');

      const input = new TextInputBuilder()
        .setCustomId('log_channel_id')
        .setLabel('ID del Canal de Logs')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('ID del canal o nombre (ej: logs, seguridad)')
        .setMinLength(1)
        .setMaxLength(100);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    // LOGS - Enviar log de prueba
    if (interaction.customId === 'logs_test') {
      const logEmbed = new EmbedBuilder()
        .setTitle('🧪 Log de Prueba')
        .setDescription(`**Enviado por:** ${interaction.user.tag}\n**Hora:** <t:${Math.floor(Date.now()/1000)}:F>\n\nSi ves este mensaje, ¡el sistema de logs funciona correctamente! ✅`)
        .setColor(0x00FF00)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await sendSecurityLog(interaction.guild, logEmbed);
      return interaction.reply({ content: '✅ Log de prueba enviado al canal configurado.', ephemeral: true });
    }

    // LOGS - Desactivar logs
    if (interaction.customId === 'logs_disable') {
      client.antiRaid.logChannel.delete(interaction.guild.id);
      
      const embed = new EmbedBuilder()
        .setTitle('🔴 Logs Desactivados')
        .setDescription('El sistema de logs ha sido desactivado. Ya no se registrarán eventos.')
        .setColor(0xFF0000)
        .setTimestamp();

      return interaction.update({ embeds: [embed], components: [] });
    }

    // ADMIN - Mostrar menú para QUITAR roles específicos (BOTÓN)
    if (interaction.customId.startsWith('remove_roles_from_')) {
      const userId = interaction.customId.replace('remove_roles_from_', '');
      
      try {
        const targetMember = await interaction.guild.members.fetch(userId);
        const userRoles = targetMember.roles.cache
          .filter(role => 
            role.id !== interaction.guild.roles.everyone.id &&
            role.position < interaction.guild.members.me.roles.highest.position
          )
          .sort((a, b) => b.position - a.position);
        
        if (userRoles.size === 0) {
          return interaction.update({ content: `${targetMember.user.tag} no tiene roles que pueda quitar.`, components: [] });
        }

        const options = userRoles.map(role => 
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setDescription(`Posición: ${role.position}`)
            .setValue(role.id)
            .setEmoji('🎭')
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`confirm_remove_role_${userId}`)
          .setPlaceholder('Selecciona los roles a QUITAR')
          .setMinValues(1)
          .setMaxValues(Math.min(userRoles.size, 25))
          .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle(`❌ Quitar Roles de ${targetMember.user.username}`)
          .setDescription('Selecciona uno o varios roles para quitar')
          .setColor(0xFF0000);

        return interaction.update({ embeds: [embed], components: [row] });
      } catch (e) {
        console.error('Error mostrando roles para quitar:', e);
        return interaction.reply({ content: 'Error al cargar roles.', ephemeral: true });
      }
    }

    // ADMIN - Mostrar menú para DAR roles específicos (BOTÓN)
    if (interaction.customId.startsWith('add_roles_to_')) {
      const userId = interaction.customId.replace('add_roles_to_', '');
      
      try {
        const targetMember = await interaction.guild.members.fetch(userId);
        const allRoles = interaction.guild.roles.cache
          .filter(role => 
            role.id !== interaction.guild.roles.everyone.id &&
            !targetMember.roles.cache.has(role.id) &&
            role.position < interaction.guild.members.me.roles.highest.position
          )
          .sort((a, b) => b.position - a.position);
        
        if (allRoles.size === 0) {
          return interaction.update({ content: `${targetMember.user.tag} ya tiene todos los roles disponibles.`, components: [] });
        }

        const options = allRoles.map(role => 
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setDescription(`Posición: ${role.position}`)
            .setValue(role.id)
            .setEmoji('✨')
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`confirm_add_role_${userId}`)
          .setPlaceholder('Selecciona los roles a DAR')
          .setMinValues(1)
          .setMaxValues(Math.min(allRoles.size, 25))
          .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle(`➕ Dar Roles a ${targetMember.user.username}`)
          .setDescription('Selecciona uno o varios roles para asignar')
          .setColor(0x00FF00);

        return interaction.update({ embeds: [embed], components: [row] });
      } catch (e) {
        console.error('Error mostrando roles para dar:', e);
        return interaction.reply({ content: 'Error al cargar roles.', ephemeral: true });
      }
    }
  }

  // Manejo de modales
  if (interaction.isModalSubmit()) {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;

    if (interaction.customId === 'vi_name_modal') {
      if (!voiceChannel) {
        return interaction.reply({ content: 'No estás en un canal de voz.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede cambiar el nombre.', ephemeral: true });
      }
      const newName = interaction.fields.getTextInputValue('vi_name_input').trim();
      if (newName.length === 0) {
        return interaction.reply({ content: 'El nombre no puede estar vacío.', ephemeral: true });
      }
      await voiceChannel.setName(newName);
      return interaction.reply({ content: `Nombre cambiado a **${newName}**.`, ephemeral: true });
    }

    if (interaction.customId === 'vi_limit_modal') {
      const raw = interaction.fields.getTextInputValue('vi_limit_input').trim();
      const value = parseInt(raw, 10);
      if (isNaN(value) || value < 0 || value > 99) {
        return interaction.reply({ content: 'Introduce un número válido entre 0 y 99.', ephemeral: true });
      }
      await voiceChannel.setUserLimit(value);
      return interaction.reply({ content: value === 0 ? 'Límite eliminado (ilimitado).' : `Límite establecido en **${value}**.`, ephemeral: true });
    }

    if (interaction.customId === 'vi_kick_modal') {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede expulsar usuarios.', ephemeral: true });
      }
      const ref = interaction.fields.getTextInputValue('vi_kick_input').trim();
      const id = ref.replace(/<@!?|>/g, '');
      try {
        const targetMember = await interaction.guild.members.fetch(id);
        if (!voiceChannel.members.has(targetMember.id)) {
          return interaction.reply({ content: 'Ese usuario no está en tu sala.', ephemeral: true });
        }
        await targetMember.voice.disconnect('Expulsado por el dueño de la sala');
        return interaction.reply({ content: `✅ Usuario **${targetMember.user.tag}** expulsado.`, ephemeral: true });
      } catch (e) {
        return interaction.reply({ content: 'No pude identificar al usuario. Usa mención o ID válida.', ephemeral: true });
      }
    }

    // BAN: banear usuario de la sala (no puede volver a entrar)
    if (interaction.customId === 'vi_ban_modal') {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede banear usuarios.', ephemeral: true });
      }
      const ref = interaction.fields.getTextInputValue('vi_ban_input').trim();
      const id = ref.replace(/<@!?|>/g, '');
      try {
        const targetMember = await interaction.guild.members.fetch(id);
        
        // Desconectar al usuario si está en el canal
        if (voiceChannel.members.has(targetMember.id)) {
          await targetMember.voice.disconnect('Baneado de la sala por el propietario');
        }
        
        // Añadir a la lista de baneados de esta sala
        if (!client.tempVoiceChannelBannedUsers.has(voiceChannel.id)) {
          client.tempVoiceChannelBannedUsers.set(voiceChannel.id, new Set());
        }
        const bannedUsers = client.tempVoiceChannelBannedUsers.get(voiceChannel.id);
        bannedUsers.add(targetMember.id);
        
        // Denegar permiso de conexión al usuario
        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
          Connect: false,
          ManageChannels: null
        });
        
        return interaction.reply({ content: `🚫 **${targetMember.user.tag}** ha sido baneado de esta sala. No podrá volver a entrar.`, ephemeral: true });
      } catch (e) {
        console.error('Error banenado usuario:', e);
        return interaction.reply({ content: 'No pude identificar al usuario. Usa mención o ID válida.', ephemeral: true });
      }
    }

    // UNBAN: desbanear usuario de la sala
    if (interaction.customId === 'vi_unban_modal') {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede desbanear usuarios.', ephemeral: true });
      }
      const ref = interaction.fields.getTextInputValue('vi_unban_input').trim();
      const id = ref.replace(/<@!?|>/g, '');
      try {
        const targetMember = await interaction.guild.members.fetch(id);
        
        // Quitar de la lista de baneados
        const bannedUsers = client.tempVoiceChannelBannedUsers.get(voiceChannel.id);
        if (bannedUsers && bannedUsers.has(targetMember.id)) {
          bannedUsers.delete(targetMember.id);
        }
        
        // Restaurar permiso de conexión
        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
          Connect: null,
          ManageChannels: null
        });
        
        return interaction.reply({ content: `✅ **${targetMember.user.tag}** ha sido desbaneado de esta sala. Ahora puede volver a entrar.`, ephemeral: true });
      } catch (e) {
        console.error('Error desbanenado usuario:', e);
        return interaction.reply({ content: 'No pude identificar al usuario. Usa mención o ID válida.', ephemeral: true });
      }
    }

    if (interaction.customId === 'vi_transfer_modal') {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede transferir la propiedad.', ephemeral: true });
      }
      const ref = interaction.fields.getTextInputValue('vi_transfer_input').trim();
      const id = ref.replace(/<@!?|>/g, '');
      try {
        const targetMember = await interaction.guild.members.fetch(id);
        // Quitar permisos al anterior propietario
        const previousOwnerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
        if (previousOwnerId) {
          await voiceChannel.permissionOverwrites.edit(previousOwnerId, { ManageChannels: null }).catch(() => null);
        }
        // Dar permisos al nuevo propietario
        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
          ManageChannels: true,
          Connect: true,
          Speak: true
        });
        client.tempVoiceChannelOwners.set(voiceChannel.id, targetMember.id);
        return interaction.reply({ content: `✅ Transferido el control de la sala a **${targetMember.user.tag}**.`, ephemeral: true });
      } catch (e) {
        return interaction.reply({ content: 'No pude identificar al usuario. Usa mención o ID válida.', ephemeral: true });
      }
    }

    // TICKET - Modal de respuesta
    if (interaction.customId.startsWith('ticket_modal_')) {
      const buttonIndex = interaction.customId.replace('ticket_modal_', '');
      const ticketAnswer = interaction.fields.getTextInputValue('ticket_answer').trim();
      const user = interaction.user;

      console.log(`[TICKETS] Usuario ${user.tag} respondió: ${ticketAnswer}`);

      // Cargar configuración desde el archivo JSON
      const guildConfig = getTicketConfig(interaction.guild.id);
      let buttonConfig = null;
      let panelMessageFromConfig = null;
      if (guildConfig && guildConfig.panelConfigs) {
        panelMessageFromConfig = guildConfig.panelMessage || null;
        buttonConfig = guildConfig.panelConfigs?.find(c => String(c.index) === buttonIndex);
      }

      try {
        let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && /ticket|soporte|support/i.test(c.name));

        if (!category) {
          category = await interaction.guild.channels.create({
            name: '🎫 Tickets',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
            ]
          });
        }

        const channelName = `ticket-${user.id}-${ticketAnswer.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20)}`;
        const permOverwrites = [
          { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ];

        const staffRoleIds = guildConfig?.ticketStaffRoles || [];
        console.log('[TICKETS] ticket_modal staff roles:', staffRoleIds);
        if (staffRoleIds.length > 0) {
          staffRoleIds.forEach(roleId => {
            if (interaction.guild.roles.cache.has(roleId)) {
              permOverwrites.push({
                id: roleId,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.ManageMessages
                ]
              });
            } else {
              console.warn('[TICKETS] ticket_modal rol no encontrado en guild.roles.cache:', roleId);
            }
          });
        }

        const mainStaffRoleId = client.ticketStaffRole.get(interaction.guild.id);
        console.log('[TICKETS] ticket_modal mainStaffRoleId:', mainStaffRoleId);
        if (mainStaffRoleId && !permOverwrites.find(p => p.id === mainStaffRoleId)) {
          if (interaction.guild.roles.cache.has(mainStaffRoleId)) {
            permOverwrites.push({
              id: mainStaffRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageMessages
              ]
            });
          } else {
            console.warn('[TICKETS] ticket_modal rol principal no encontrado en guild.roles.cache:', mainStaffRoleId);
          }
        }

        console.log('[TICKETS] ticket_modal permissionOverwrites antes de crear canal:', permOverwrites);
        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: permOverwrites
        });
        console.log('[TICKETS] ticket_modal canal creado con permisos:', channel.permissionOverwrites.cache.map(o => ({ id: o.id, allow: o.allow?.toArray?.(), deny: o.deny?.toArray?.() })));

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        const embed = new EmbedBuilder()
          .setTitle('🎫 Ticket Abierto')
          .setDescription('Un miembro del staff te atenderá enseguida. Describe tu problema.')
          .addFields(
            { name: '📂 Categoría', value: `${buttonConfig?.name || 'Formulario'}`, inline: false },
            ...(buttonConfig?.question ? [{ name: '❓ Pregunta', value: buttonConfig.question, inline: false }] : []),
            { name: '💬 Respuesta', value: ticketAnswer, inline: false },
            { name: '📌 Solicitante', value: `${user}`, inline: false }
          )
          .setColor(0x2ECC71);

        const staffRoleId = client.ticketStaffRole.get(interaction.guild.id);
        const mention = staffRoleId ? ` <@&${staffRoleId}>` : '';

        await channel.send({ content: `${user}${mention}`, embeds: [embed], components: [closeRow] });

        await interaction.reply({ content: `✅ Tu ticket ha sido creado: ${channel}`, ephemeral: true });

        const ticketName = channelName;
        const icoPath = await generateTicketICO(channel, ticketName);
        const htmlPath = await generateTicketHTML(channel, ticketName, user.tag);

        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 Ticket Abierto')
          .setDescription(`**Usuario:** ${user.tag}\n**Canal:** ${channel}\n**Tipo:** ${ticketAnswer}${buttonConfig?.question ? `\n**Pregunta:** ${buttonConfig.question}` : ''}`)
          .setColor(0x00FF00)
          .setTimestamp();
        await sendSecurityLog(interaction.guild, logEmbed, htmlPath);

        return;
      } catch (error) {
        console.error('[TICKETS] Error creando ticket:', error);
        return interaction.reply({ content: '❌ No se pudo crear el ticket.', ephemeral: true });
      }
    }

    // ADMIN - Modal para ingresar ID de usuario
    if (interaction.customId === 'admin_user_id_modal') {
      const userId = interaction.fields.getTextInputValue('user_id_input').trim();
      
      try {
        const targetMember = await interaction.guild.members.fetch(userId);
        const userRoles = targetMember.roles.cache
          .filter(role => role.id !== interaction.guild.roles.everyone.id)
          .sort((a, b) => b.position - a.position);
        
        const embed = new EmbedBuilder()
          .setTitle(`🎭 Gestión de Roles - ${targetMember.user.username}`)
          .setDescription(`Selecciona qué acción quieres realizar con los roles de **${targetMember.user.tag}**`)
          .addFields(
            { name: '✅ Roles Actuales', value: userRoles.size > 0 ? userRoles.map(r => r.name).join(', ') : 'Sin roles', inline: false }
          )
          .setColor(0x5865F2)
          .setThumbnail(targetMember.user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`remove_roles_from_${userId}`)
            .setLabel('❌ Quitar Roles')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`add_roles_to_${userId}`)
            .setLabel('➕ Dar Roles')
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      } catch (e) {
        console.error('Error buscando usuario por ID:', e);
        return interaction.reply({ content: `❌ No se encontró ningún usuario con el ID: ${userId}\n\nAsegúrate de copiar el ID correctamente.`, ephemeral: true });
      }
    }

    // LOGS - Modal para configurar canal
    if (interaction.customId === 'logs_channel_modal') {
      const input = interaction.fields.getTextInputValue('log_channel_id').trim();
      
      try {
        // Buscar canal por ID o nombre
        let channel = interaction.guild.channels.cache.get(input);
        
        if (!channel) {
          // Buscar por nombre
          channel = interaction.guild.channels.cache.find(ch => 
            ch.type === ChannelType.GuildText && 
            ch.name.toLowerCase().includes(input.toLowerCase())
          );
        }
        
        if (!channel) {
          return interaction.reply({ 
            content: `❌ No se encontró un canal con el ID o nombre: **${input}**\n\nAsegúrate de que el canal existe y es un canal de texto.`, 
            ephemeral: true 
          });
        }

        if (channel.type !== ChannelType.GuildText) {
          return interaction.reply({ 
            content: '❌ El canal debe ser un canal de **TEXTO**, no de voz.', 
            ephemeral: true 
          });
        }

        // Configurar el canal de logs
        client.antiRaid.logChannel.set(interaction.guild.id, channel.id);

        const embed = new EmbedBuilder()
          .setTitle('✅ Canal de Logs Configurado')
          .setDescription(`Todos los eventos del servidor se registrarán en ${channel}\n\n📊 **Eventos que se registrarán:**\n• Mensajes eliminados/editados\n• Usuarios entran/salen\n• Bans/Unbans\n• Roles modificados\n• Tickets abiertos/cerrados\n• Acciones Anti-Raid`)
          .setColor(0x00FF00)
          .setTimestamp();

        // Enviar mensaje de confirmación al canal de logs
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('📋 Sistema de Logs Activado')
          .setDescription(`Este canal ha sido configurado como **canal de logs** del servidor.\n\nTodos los eventos importantes se registrarán aquí automáticamente.`)
          .setColor(0x5865F2)
          .setFooter({ text: `Configurado por ${interaction.user.tag}` })
          .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error configurando canal de logs:', error);
        return interaction.reply({ content: '❌ Error al configurar el canal de logs.', ephemeral: true });
      }
    }
  }

  if (interaction.isStringSelectMenu()) {
    // NUEVO: Manejo de selección de canal de logs desde el comando /logs
    if (interaction.customId === 'logs_select_channel') {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      
      if (!channel) {
        return interaction.reply({ content: '❌ No se pudo encontrar el canal seleccionado.', ephemeral: true });
      }

      // 1. Guardar en memoria (Anti-Raid)
      client.antiRaid.logChannel.set(interaction.guild.id, channelId);

      // 2. Sincronizar con logs-config.json para el panel web
      const logsConfigPath = path.join(__dirname, 'config', 'logs-config.json');
      let config = {};
      try {
        if (fs.existsSync(logsConfigPath)) {
          config = JSON.parse(fs.readFileSync(logsConfigPath, 'utf8'));
        }
      } catch (e) {}

      if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
      
      // Habilitar algunos logs básicos por defecto en este canal si no estaban configurados
      const basicEvents = ['messageDelete', 'messageUpdate', 'guildMemberAdd', 'guildMemberRemove', 'voiceStateUpdate'];
      basicEvents.forEach(ev => {
        if (!config[interaction.guild.id][ev]) {
          config[interaction.guild.id][ev] = { enabled: true, channel: channelId, color: '#5865f2' };
        } else {
          // Si ya existía, solo actualizamos el canal si el usuario lo cambió vía comando
          config[interaction.guild.id][ev].channel = channelId;
          config[interaction.guild.id][ev].enabled = true;
        }
      });

      fs.writeFileSync(logsConfigPath, JSON.stringify(config, null, 2));

      const embed = new EmbedBuilder()
        .setTitle('✅ Canal de Logs Configurado')
        .setDescription(`Se ha configurado ${channel} como el canal de registros.\n\nEste cambio se ha sincronizado con el **Panel Web**.`)
        .setColor(0x00FF00)
        .setTimestamp();

      return interaction.update({ embeds: [embed], components: [] });
    }

    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;

    // STAFF ROLES - Añadir rol seleccionado
    if (interaction.customId === 'staff_add') {
      const roleId = interaction.values[0];
      if (roleId === 'none_add') {
        return interaction.reply({ content: '❌ No hay roles disponibles para añadir.', ephemeral: true });
      }
      let role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        role = await interaction.guild.roles.fetch(roleId).catch(() => null);
      }
      
      if (!role) {
        return interaction.reply({ content: '❌ El rol no existe.', ephemeral: true });
      }
      
      const currentRoles = client.commandRoles.get(interaction.guild.id) || [];
      if (currentRoles.includes(roleId)) {
        return interaction.reply({ content: `❌ El rol ${role.name} ya está configurado.`, ephemeral: true });
      }
      
      currentRoles.push(roleId);
      client.commandRoles.set(interaction.guild.id, currentRoles);
      
      // Guardar en archivo
      let staffData = {};
      try {
        if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
          staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
        }
      } catch (e) {}
      if (!staffData[interaction.guild.id]) staffData[interaction.guild.id] = {};
      staffData[interaction.guild.id].commandRoles = currentRoles;
      fs.writeFileSync(path.join(__dirname, 'config', 'staff-roles.json'), JSON.stringify(staffData, null, 2));
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Rol Añadido')
        .setDescription(`El rol **${role.name}** ahora puede usar los comandos de moderación.`)
        .setColor(0x00FF00)
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // STAFF ROLES - Eliminar rol seleccionado
    if (interaction.customId === 'staff_remove') {
      const roleId = interaction.values[0];
      if (roleId === 'none_remove') {
        return interaction.reply({ content: '❌ No hay roles de staff configurados.', ephemeral: true });
      }
      let role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        role = await interaction.guild.roles.fetch(roleId).catch(() => null);
      }
      
      let currentRoles = client.commandRoles.get(interaction.guild.id) || [];
      currentRoles = currentRoles.filter(id => id !== roleId);
      client.commandRoles.set(interaction.guild.id, currentRoles);
      
      // Guardar en archivo
      let staffData = {};
      try {
        if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
          staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
        }
      } catch (e) {}
      if (!staffData[interaction.guild.id]) staffData[interaction.guild.id] = {};
      staffData[interaction.guild.id].commandRoles = currentRoles;
      fs.writeFileSync(path.join(__dirname, 'config', 'staff-roles.json'), JSON.stringify(staffData, null, 2));
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Rol Eliminado')
        .setDescription(`El rol **${role ? role.name : roleId}** ha sido eliminado de los roles de staff.`)
        .setColor(0xFF0000)
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // STAFF ROLES - Añadir/Eliminar rol seleccionado (legacy)
    if (interaction.customId === 'staff_action') {
      const value = interaction.values[0];
      const action = value.split('_')[0];
      const roleId = value.split('_')[1];
      
      if (action === 'add') {
        let role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        }
        if (!role) {
          return interaction.reply({ content: '❌ El rol no existe.', ephemeral: true });
        }
        
        const currentRoles = client.commandRoles.get(interaction.guild.id) || [];
        if (currentRoles.includes(roleId)) {
          return interaction.reply({ content: `❌ El rol ${role.name} ya está configurado.`, ephemeral: true });
        }
        
        currentRoles.push(roleId);
        client.commandRoles.set(interaction.guild.id, currentRoles);
        
        // Guardar en archivo
        let staffData = {};
        try {
          if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
            staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
          }
        } catch (e) {}
        if (!staffData[interaction.guild.id]) staffData[interaction.guild.id] = {};
        staffData[interaction.guild.id].commandRoles = currentRoles;
        fs.writeFileSync(path.join(__dirname, 'config', 'staff-roles.json'), JSON.stringify(staffData, null, 2));
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Rol Añadido')
          .setDescription(`El rol **${role.name}** ahora puede usar los comandos de moderación.`)
          .setColor(0x00FF00)
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (action === 'remove') {
        const role = interaction.guild.roles.cache.get(roleId);
        
        let currentRoles = client.commandRoles.get(interaction.guild.id) || [];
        currentRoles = currentRoles.filter(id => id !== roleId);
        client.commandRoles.set(interaction.guild.id, currentRoles);
        
        // Guardar en archivo
        let staffData = {};
        try {
          if (fs.existsSync(path.join(__dirname, 'config', 'staff-roles.json'))) {
            staffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'staff-roles.json'), 'utf8'));
          }
        } catch (e) {}
        if (!staffData[interaction.guild.id]) staffData[interaction.guild.id] = {};
        staffData[interaction.guild.id].commandRoles = currentRoles;
        fs.writeFileSync(path.join(__dirname, 'config', 'staff-roles.json'), JSON.stringify(staffData, null, 2));
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Rol Eliminado')
          .setDescription(`El rol **${role ? role.name : roleId}** ha sido eliminado de los roles de staff.`)
          .setColor(0xFF0000)
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // EXPULSAR - Selección de usuario
    if (interaction.customId === 'vi_kick_select') {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede expulsar usuarios.', ephemeral: true });
      }

      const selectedUserId = interaction.values[0];
      
      try {
        const targetMember = await interaction.guild.members.fetch(selectedUserId);
        
        if (!voiceChannel.members.has(targetMember.id)) {
          return interaction.reply({ content: 'Ese usuario ya no está en tu sala.', ephemeral: true });
        }

        // Expulsar al usuario del canal de voz
        await targetMember.voice.disconnect('Expulsado por el dueño de la sala');

        const embed = new EmbedBuilder()
          .setTitle('✅ Usuario Expulsado')
          .setDescription(`**${targetMember.user.tag}** ha sido expulsado de la sala 👢`)
          .setColor(0xFF0000);

        return interaction.update({ embeds: [embed], components: [] });
      } catch (e) {
        console.error('Error expulsando usuario:', e);
        return interaction.reply({ content: 'No pude expulsar al usuario. Inténtalo de nuevo.', ephemeral: true });
      }
    }

    // TRANSFERIR - Selección de usuario
    if (interaction.customId === 'vi_transfer_select') {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'Debes estar en un canal de voz para usar esto.', ephemeral: true });
      }
      const ownerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
      if (ownerId !== member.id) {
        return interaction.reply({ content: '❌ No eres el propietario de esta sala. Solo el líder puede transferir la propiedad.', ephemeral: true });
      }

      const selectedUserId = interaction.values[0];
      
      try {
        const targetMember = await interaction.guild.members.fetch(selectedUserId);
        
        // Quitar permisos de ManageChannels a los anteriores propietarios
        const previousOwnerId = client.tempVoiceChannelOwners.get(voiceChannel.id);
        if (previousOwnerId && previousOwnerId !== targetMember.id) {
          await voiceChannel.permissionOverwrites.edit(previousOwnerId, { ManageChannels: null }).catch(() => null);
        }
        for (const [overwriteId, overwrite] of voiceChannel.permissionOverwrites.cache) {
          if (overwrite.allow?.has(PermissionsBitField.Flags.ManageChannels) && overwriteId !== targetMember.id) {
            await voiceChannel.permissionOverwrites.edit(overwriteId, { ManageChannels: null }).catch(() => null);
          }
        }

        // Transferir permisos al nuevo usuario
        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
          ManageChannels: true,
          Connect: true,
          Speak: true
        });
        client.tempVoiceChannelOwners.set(voiceChannel.id, targetMember.id);

        const embed = new EmbedBuilder()
          .setTitle('✅ Propiedad Transferida')
          .setDescription(`El control de la sala ha sido transferido a **${targetMember.user.tag}** 👑`)
          .setColor(0x00FF00);

        return interaction.update({ embeds: [embed], components: [] });
      } catch (e) {
        console.error('Error transfiriendo propiedad:', e);
        return interaction.reply({ content: 'No pude transferir la propiedad. Inténtalo de nuevo.', ephemeral: true });
      }
    }

    // ADMIN - Selección de usuario para gestionar roles
    if (interaction.customId === 'admin_select_user_roles') {
      const selectedUserId = interaction.values[0];
      
      try {
        const targetMember = await interaction.guild.members.fetch(selectedUserId);
        const userRoles = targetMember.roles.cache
          .filter(role => role.id !== interaction.guild.roles.everyone.id)
          .sort((a, b) => b.position - a.position);
        
        const embed = new EmbedBuilder()
          .setTitle(`🎭 Gestión de Roles - ${targetMember.user.username}`)
          .setDescription(`Selecciona qué acción quieres realizar con los roles de **${targetMember.user.tag}**`)
          .addFields(
            { name: '✅ Roles Actuales', value: userRoles.size > 0 ? userRoles.map(r => r.name).join(', ') : 'Sin roles', inline: false }
          )
          .setColor(0x5865F2)
          .setThumbnail(targetMember.user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`remove_roles_from_${selectedUserId}`)
            .setLabel('❌ Quitar Roles')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`add_roles_to_${selectedUserId}`)
            .setLabel('➕ Dar Roles')
            .setStyle(ButtonStyle.Success)
        );

        return interaction.update({ embeds: [embed], components: [row] });
      } catch (e) {
        console.error('Error gestionando roles de usuario:', e);
        return interaction.reply({ content: 'No pude gestionar los roles. Inténtalo de nuevo.', ephemeral: true });
      }
    }

    // ADMIN - Confirmar QUITAR roles
    if (interaction.customId.startsWith('confirm_remove_role_')) {
      const userId = interaction.customId.replace('confirm_remove_role_', '');
      const selectedRoleIds = interaction.values;
      
      try {
        const targetMember = await interaction.guild.members.fetch(userId);
        let removedCount = 0;

        for (const roleId of selectedRoleIds) {
          try {
            await targetMember.roles.remove(roleId);
            removedCount++;
          } catch (e) {
            console.error(`Error quitando rol ${roleId}:`, e);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Roles Quitados')
          .setDescription(`Se quitaron **${removedCount}** roles de **${targetMember.user.tag}**`)
          .setColor(0x00FF00)
          .setTimestamp();

        return interaction.update({ embeds: [embed], components: [] });
      } catch (e) {
        console.error('Error quitando roles:', e);
        return interaction.reply({ content: 'Error al quitar roles.', ephemeral: true });
      }
    }

    // ADMIN - Confirmar DAR roles
    if (interaction.customId.startsWith('confirm_add_role_')) {
      const userId = interaction.customId.replace('confirm_add_role_', '');
      const selectedRoleIds = interaction.values;
      
      try {
        await interaction.deferUpdate();
        
        const targetMember = await interaction.guild.members.fetch(userId);
        let addedCount = 0;
        let errors = [];

        for (const roleId of selectedRoleIds) {
          try {
            const role = interaction.guild.roles.cache.get(roleId);
            await targetMember.roles.add(roleId);
            addedCount++;
            console.log(`✅ Rol ${role.name} asignado a ${targetMember.user.tag}`);
          } catch (e) {
            const role = interaction.guild.roles.cache.get(roleId);
            errors.push(role?.name || roleId);
            console.error(`❌ Error dando rol ${role?.name || roleId}:`, e.message);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(addedCount > 0 ? '✅ Roles Asignados' : '❌ Error')
          .setDescription(
            addedCount > 0 
              ? `Se asignaron **${addedCount}** roles a **${targetMember.user.tag}**` 
              : `No se pudo asignar ningún rol. ${errors.length > 0 ? `Errores: ${errors.join(', ')}` : ''}`
          )
          .setColor(addedCount > 0 ? 0x00FF00 : 0xFF0000)
          .setTimestamp();

        if (errors.length > 0 && addedCount > 0) {
          embed.addFields({ name: '⚠️ Errores', value: `No se pudieron asignar: ${errors.join(', ')}` });
        }

        return interaction.editReply({ embeds: [embed], components: [] });
      } catch (e) {
        console.error('❌ Error general asignando roles:', e);
        return interaction.editReply({ content: `Error: ${e.message}` }).catch(() => 
          interaction.followUp({ content: `Error al asignar roles: ${e.message}`, ephemeral: true })
        );
      }
    }

    // LOGS - Seleccionar canal de logs
    if (interaction.customId === 'logs_select_channel') {
      try {
        console.log(`📋 Usuario ${interaction.user.tag} seleccionó canal de logs`);
        
        const selectedChannelId = interaction.values[0];
        console.log(`📋 Canal seleccionado ID: ${selectedChannelId}`);
        
        const selectedChannel = interaction.guild.channels.cache.get(selectedChannelId);
        
        if (!selectedChannel) {
          console.log(`❌ Canal no encontrado: ${selectedChannelId}`);
          return interaction.reply({ content: '❌ Canal no encontrado.', ephemeral: true });
        }

        console.log(`📋 Canal encontrado: ${selectedChannel.name}`);

        // Configurar el canal de logs
        client.antiRaid.logChannel.set(interaction.guild.id, selectedChannelId);
        console.log(`✅ Canal de logs configurado para servidor ${interaction.guild.id}`);

        const embed = new EmbedBuilder()
          .setTitle('✅ Canal de Logs Configurado')
          .setDescription(`**Hola ${interaction.user.tag}!**\n\nEl canal ${selectedChannel} ha sido configurado como canal de logs.\n\n**Eventos que se registrarán:**\n• Mensajes eliminados/editados\n• Usuarios entran/salen\n• Bans/Unbans\n• Roles modificados\n• Tickets abiertos/cerrados\n• Acciones Anti-Raid`)
          .setColor(0x00FF00)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ text: 'Los logs se envían automáticamente al canal configurado' })
          .setTimestamp();

        // Enviar mensaje de bienvenida al canal de logs
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('📋 Sistema de Logs Activado')
          .setDescription(`Este canal ha sido configurado como **canal de logs** del servidor.\n\nTodos los eventos importantes se registrarán aquí automáticamente.`)
          .setColor(0x5865F2)
          .setFooter({ text: `Configurado por ${interaction.user.tag}` })
          .setTimestamp();

        try {
          await selectedChannel.send({ embeds: [welcomeEmbed] });
          console.log(`✅ Mensaje de bienvenida enviado a ${selectedChannel.name}`);
        } catch (e) {
          console.error('❌ Error enviando mensaje de bienvenida:', e);
        }

        console.log(`📋 Actualizando interacción con confirmación`);
        return interaction.update({ embeds: [embed], components: [] });
      } catch (error) {
        console.error('❌ Error en selección de canal de logs:', error);
        return interaction.reply({ content: '❌ Error al configurar el canal. Revisa la consola.', ephemeral: true });
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);