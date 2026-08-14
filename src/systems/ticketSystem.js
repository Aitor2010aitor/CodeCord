// Archivo: src/systems/ticketSystem.js

/**
 * @file ticketSystem.js
 * @description Sistema integral de tickets para CodeCord (HTML/PDF/ICO transcripts, permisos, cierre y embeds).
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { MessageFlags, EmbedBuilder, PermissionsBitField  } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');

/**
 * Obtiene la configuración de tickets de un servidor.
 * @param {string} guildId 
 * @returns {Object|null}
 */
function getTicketConfig(guildId) {
    return configManager.loadGuildConfig(guildId, 'tickets', null);
}

/**
 * Guarda o actualiza la configuración de tickets de un servidor.
 * @param {string} guildId 
 * @param {Object} config 
 */
function setTicketConfig(guildId, config) {
    configManager.saveGuildConfig(guildId, 'tickets', config);
}

/**
 * Verifica si un miembro tiene permisos de staff para gestionar tickets.
 * @param {GuildMember} member 
 * @param {Guild} guild 
 * @returns {boolean}
 */
function hasStaffPermission(member, guild) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

    const ticketStaffRoleId = guild.client.ticketStaffRole?.get(guild.id);
    const commandRoles = guild.client.commandRoles?.get(guild.id);
    const voiceStaffRoleId = guild.client.voiceSupportStaffRole?.get(guild.id);

    if (!ticketStaffRoleId && (!commandRoles || commandRoles.length === 0) && !voiceStaffRoleId) {
        return member.permissions.has(PermissionsBitField.Flags.Administrator);
    }

    if (ticketStaffRoleId && member.roles.cache.has(ticketStaffRoleId)) return true;

    if (commandRoles && commandRoles.length > 0) {
        for (const roleId of commandRoles) {
            if (member.roles.cache.has(roleId)) return true;
        }
    }

    if (voiceStaffRoleId && member.roles.cache.has(voiceStaffRoleId)) return true;

    return false;
}

/**
 * Determina si un canal es de tickets según su nombre.
 * @param {GuildChannel} channel 
 * @returns {boolean}
 */
function isTicketChannel(channel) {
    return channel && typeof channel.name === 'string' && channel.name.toLowerCase().startsWith('ticket-');
}

/**
 * Busca al creador/usuario del ticket mediante permisos de sobreescritura o nombre de canal.
 * @param {GuildChannel} ticketChannel 
 * @returns {GuildMember|null}
 */
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

/**
 * Genera un archivo ICO simple con metadata del ticket.
 * @param {GuildChannel} ticketChannel 
 * @param {string} ticketName 
 * @returns {Promise<string|null>} Ruta del archivo.
 */
async function generateTicketICO(ticketChannel, ticketName) {
    try {
        const ticketsDir = path.join(__dirname, '..', '..', 'tickets');
        if (!fs.existsSync(ticketsDir)) {
            fs.mkdirSync(ticketsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const icoFileName = `ticket_${ticketName}_${timestamp}.ico`;
        const icoPath = path.join(ticketsDir, icoFileName);

        const icoContent = `Ticket creado: ${ticketName}\nCanal: ${ticketChannel.name}\nID: ${ticketChannel.id}\nFecha: ${new Date().toLocaleString('es-ES')}\nEstado: Cerrado`;

        fs.writeFileSync(icoPath, icoContent, 'utf8');
        console.log(`✅ [CodeCord] ICO del ticket ${ticketName} generado: ${icoPath}`);
        return icoPath;
    } catch (error) {
        console.error('❌ Error generando ICO del ticket:', error);
        return null;
    }
}

/**
 * Genera un documento PDF del transcript del ticket.
 * @param {GuildChannel} ticketChannel 
 * @param {string} ticketName 
 * @param {string} closedBy 
 * @returns {Promise<string|null>} Ruta del PDF.
 */
async function generateTicketPDF(ticketChannel, ticketName, closedBy) {
    try {
        const ticketsDir = path.join(__dirname, '..', '..', 'tickets');
        if (!fs.existsSync(ticketsDir)) {
            fs.mkdirSync(ticketsDir, { recursive: true });
        }

        const messages = [];
        let lastMessageId = null;

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            const batch = await ticketChannel.messages.fetch(options);
            if (batch.size === 0) break;

            messages.push(...batch.values());
            lastMessageId = batch.last().id;
        }

        messages.reverse();

        const timestamp = Date.now();
        const pdfFileName = `ticket_${ticketName}_${timestamp}.pdf`;
        const pdfPath = path.join(ticketsDir, pdfFileName);

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            layout: 'portrait'
        });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1e1e1e');
        const headerHeight = 100;
        doc.rect(0, 0, doc.page.width, headerHeight).fill('#5865F2');

        doc.fillColor('#ffffff')
            .fontSize(28)
            .font('Helvetica-Bold')
            .text(`🎫 TICKET: ${ticketName}`, 50, 25, { align: 'center' });

        doc.fillColor('#ffffff')
            .fontSize(14)
            .font('Helvetica')
            .text('Generado por CodeCord Transcripts', 50, 60, { align: 'center' });

        doc.y = headerHeight + 30;

        const infoBoxY = doc.y;
        const infoBoxHeight = 160;

        doc.rect(50, infoBoxY, doc.page.width - 100, infoBoxHeight)
            .fill('#2d2d30')
            .stroke('#3e3e42');

        doc.fillColor('#4ec9b0')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('📋 Información del Ticket', 60, infoBoxY + 25);

        doc.fillColor('#d4d4d4')
            .fontSize(14)
            .font('Helvetica')
            .text(`Nombre del Canal: ${ticketChannel.name}`, 60, infoBoxY + 60)
            .text(`ID del Canal: ${ticketChannel.id}`, 60, infoBoxY + 90)
            .text(`Cerrado por: ${closedBy}`, 60, infoBoxY + 120)
            .text(`Fecha de Cierre: ${new Date().toLocaleString('es-ES')}`, 60, infoBoxY + 150);

        doc.y = infoBoxY + infoBoxHeight + 20;

        doc.fillColor('#4ec9b0')
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('💬 Historial de Mensajes', 50, doc.y);

        doc.moveDown();

        messages.forEach((msg) => {
            const msgTs = new Date(msg.createdTimestamp).toLocaleString('es-ES');
            const isBot = msg.author.bot;

            const bgColor = isBot ? '#1a3a1a' : '#1a1a2e';
            const borderColor = isBot ? '#00d166' : '#0078d4';
            const textColor = isBot ? '#4ec9b0' : '#d4d4d4';

            const messageY = doc.y;
            const messageHeight = 90;

            doc.rect(50, messageY, doc.page.width - 100, messageHeight)
                .fill(bgColor)
                .stroke(borderColor);

            doc.fillColor(textColor)
                .fontSize(16)
                .font('Helvetica-Bold')
                .text(`${isBot ? '🤖' : '👤'} ${msg.author.tag}`, 70, messageY + 20);

            doc.fillColor('#666666')
                .fontSize(12)
                .font('Helvetica')
                .text(msgTs, doc.page.width - 200, messageY + 20);

            const content = msg.content || '[Sin contenido de texto]';
            doc.fillColor('#333333')
                .fontSize(14)
                .font('Helvetica')
                .text(content, 70, messageY + 45, { width: doc.page.width - 140 });

            if (msg.attachments.size > 0) {
                msg.attachments.forEach(attachment => {
                    doc.fillColor('#5865F2')
                        .fontSize(12)
                        .text(`📎 ${attachment.name}`, 70, messageY + 70);
                });
            }

            doc.y = messageY + messageHeight + 25;

            if (doc.y > doc.page.height - 100) {
                doc.addPage();
                doc.y = 50;
            }
        });

        doc.moveDown(2);
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();

        const footerY = doc.y;
        const footerHeight = 50;

        doc.rect(50, footerY, doc.page.width - 100, footerHeight)
            .fill('#2d2d30')
            .stroke('#3e3e42');

        doc.fillColor('#4ec9b0')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('🤖 CodeCord - Transcripciones', 60, footerY + 15, { align: 'center' });

        doc.fillColor('#808080')
            .fontSize(10)
            .font('Helvetica')
            .text('Este archivo PDF fue generado automáticamente por CodeCord', 60, footerY + 30, { align: 'center' });

        doc.end();

        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        console.log(`✅ [CodeCord] PDF del ticket ${ticketName} generado: ${pdfPath}`);
        return pdfPath;
    } catch (error) {
        console.error('❌ Error generando PDF del ticket:', error);
        return null;
    }
}

/**
 * Parsea el marcado markdown de Discord a HTML sanitizado.
 * @param {string} text 
 * @param {Guild} guild 
 * @returns {string}
 */
function parseMarkdown(text, guild) {
    if (!text) return '';
    let s = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    s = s.replace(/```([^`]+)```/gs, (_, c) => `<pre class="code-block"><code>${c.trim()}</code></pre>`);
    s = s.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/gs, '<u>$1</u>');
    s = s.replace(/~~(.+?)~~/gs, '<del>$1</del>');
    s = s.replace(/&lt;@!?(\d+)&gt;/g, (_, id) => {
        let name = id;
        if (guild && guild.members && guild.members.cache) {
            const m = guild.members.cache.get(id);
            if (m) name = m.user.username;
        }
        return `<span class="mention">@${name}</span>`;
    });
    s = s.replace(/&lt;@&amp;(\d+)&gt;/g, (_, id) => {
        if (guild && guild.roles && guild.roles.cache) {
            const r = guild.roles.cache.get(id);
            if (r) return `<span class="mention">@${r.name}</span>`;
        }
        return `<span class="mention">@rol</span>`;
    });
    s = s.replace(/&lt;#(\d+)&gt;/g, (_, id) => {
        if (guild && guild.channels && guild.channels.cache) {
            const c2 = guild.channels.cache.get(id);
            if (c2) return `<span class="mention">#${c2.name}</span>`;
        }
        return `<span class="mention">#canal</span>`;
    });
    s = s.replace(/\n/g, '<br>');
    return s;
}

const SVG_LOCK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="btn-icon"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 9V7C17 4.243 14.757 2 12 2S7 4.243 7 7v2H5v13h14V9h-2ZM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v2H9V7Zm3 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/></svg>`;
const SVG_UNLOCK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="btn-icon"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 9H9V7a3 3 0 0 1 6 0V5h2V7c0-2.757-2.243-5-5-5S7 4.243 7 7v2H5v13h14V9h-2Zm-5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" opacity=".7"/></svg>`;
const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="btn-icon"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/></svg>`;

function buildButtonIcon(btn) {
    if (!btn.emoji) return '';
    const n = btn.emoji.name || '';
    if (n === '🔒' || n === 'lock') return SVG_LOCK;
    if (n === '🔓' || n === 'unlock') return SVG_UNLOCK;
    if (n === '✅' || n === 'check') return SVG_CHECK;
    return `<span class="btn-emoji">${n}</span>`;
}

function buildButtons(components) {
    if (!components || !components.length) return '';
    let html2 = '<div class="buttons-row">';
    components.forEach(row => {
        if (!row.components) return;
        row.components.forEach(btn => {
            const styleMap = { 1: 'btn-primary', 2: 'btn-secondary', 3: 'btn-success', 4: 'btn-danger', 5: 'btn-link' };
            const cls = styleMap[btn.style] || 'btn-secondary';
            html2 += `<button class="btn ${cls}">${buildButtonIcon(btn)}<span>${btn.label || ''}</span></button>`;
        });
    });
    html2 += '</div>';
    return html2;
}

function buildEmbeds(embeds, guild) {
    if (!embeds || !embeds.length) return '';
    return embeds.map(embed => {
        const color = embed.color ? '#' + embed.color.toString(16).padStart(6, '0') : '#5865f2';
        let fields = '';
        if (embed.fields && embed.fields.length) {
            fields = `<div class="embed-fields">${embed.fields.map(f =>
                `<div class="embed-field${f.inline ? ' inline' : ''}">
                    <div class="embed-field-name">${f.name}</div>
                    <div class="embed-field-value">${parseMarkdown(f.value, guild)}</div>
                </div>`
            ).join('')}</div>`;
        }
        return `
        <div class="embed" style="border-left-color:${color}">
            ${embed.author ? `<div class="embed-author">${embed.author.name || ''}</div>` : ''}
            ${embed.title ? `<div class="embed-title">${embed.title}</div>` : ''}
            ${embed.description ? `<div class="embed-description">${parseMarkdown(embed.description, guild)}</div>` : ''}
            ${fields}
            ${embed.image ? `<img src="${embed.image.url}" class="embed-img" alt="embed image">` : ''}
            ${embed.footer ? `<div class="embed-footer">${embed.footer.iconURL ? `<img src="${embed.footer.iconURL}" class="embed-footer-icon" alt="">` : ''}${embed.footer.text || ''}</div>` : ''}
        </div>`;
    }).join('');
}

/**
 * Genera un archivo HTML de transcripción moderno al estilo Discord Web UI.
 * @param {GuildChannel} ticketChannel 
 * @param {string} ticketName 
 * @param {string} closedBy 
 * @returns {Promise<string|null>} Ruta del archivo HTML.
 */
async function generateTicketHTML(ticketChannel, ticketName, closedBy) {
    try {
        const ticketsDir = path.join(__dirname, '..', '..', 'tickets');
        if (!fs.existsSync(ticketsDir)) {
            fs.mkdirSync(ticketsDir, { recursive: true });
        }

        const messages = [];
        let lastMessageId = null;

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            const batch = await ticketChannel.messages.fetch(options);
            if (batch.size === 0) break;

            messages.push(...batch.values());
            lastMessageId = batch.last().id;
        }

        messages.reverse();
        const guild = ticketChannel.guild || null;

        const messagesHtml = messages.map(msg => {
            const isBot = msg.author.bot;
            const avatarUrl = (typeof msg.author.displayAvatarURL === 'function')
                ? msg.author.displayAvatarURL({ size: 64, extension: 'png' })
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(msg.author.discriminator || '0') % 5}.png`;

            let nameColor = '#ffffff';
            if (guild && guild.members && guild.members.cache && msg.author.id) {
                const member = guild.members.cache.get(msg.author.id);
                if (member && member.displayHexColor && member.displayHexColor !== '#000000') {
                    nameColor = member.displayHexColor;
                }
            }

            const ts = new Date(msg.createdTimestamp);
            const tsStr = ts.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                + ' ' + ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            let body = '';
            if (msg.content && msg.content.trim()) {
                body += `<div class="msg-text">${parseMarkdown(msg.content, guild)}</div>`;
            }
            body += buildEmbeds(msg.embeds, guild);
            body += buildButtons(msg.components);

            if (msg.attachments && msg.attachments.size > 0) {
                msg.attachments.forEach(att => {
                    const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name || '');
                    body += isImg
                        ? `<img src="${att.url}" class="attachment-img" alt="${att.name}">`
                        : `<div class="attachment-file">📎 ${att.name} (${(att.size / 1024).toFixed(1)} KB)</div>`;
                });
            }

            return `
            <div class="message-group">
                <img class="avatar" src="${avatarUrl}" alt="">
                <div class="message-right">
                    <div class="message-meta">
                        <span class="author-name" style="color:${nameColor}">${msg.author.username}</span>
                        ${isBot ? `<span class="bot-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/></svg> APP</span>` : ''}
                        <span class="ts">${tsStr}</span>
                    </div>
                    ${body}
                </div>
            </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>#${ticketName} - Transcripción CodeCord</title>
<style>
  body { background-color: #313338; color: #dbdee1; font-family: 'gg sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
  .header { border-bottom: 1px solid #3f4147; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 5px 0; color: #f2f3f5; font-size: 20px; }
  .header p { margin: 0; color: #949ba4; font-size: 14px; }
  .message-group { display: flex; margin-bottom: 16px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 16px; }
  .message-right { flex: 1; }
  .message-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .author-name { font-weight: 600; font-size: 16px; }
  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 4px; border-radius: 3px; display: inline-flex; align-items: center; gap: 2px; }
  .ts { color: #949ba4; font-size: 12px; }
  .msg-text { font-size: 15px; line-height: 1.375; word-wrap: break-word; }
  .code-block { background: #2b2d31; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 14px; overflow-x: auto; }
  .inline-code { background: #2b2d31; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 14px; }
  .mention { background: rgba(88, 101, 242, 0.3); color: #c9cdfb; padding: 0 2px; border-radius: 3px; font-weight: 500; }
  .embed { background: #2b2d31; border-left: 4px solid #5865f2; border-radius: 4px; padding: 12px; margin-top: 8px; max-width: 520px; }
  .embed-title { font-weight: 600; color: #f2f3f5; margin-bottom: 6px; }
  .embed-description { font-size: 14px; line-height: 1.4; color: #dbdee1; }
  .embed-fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .embed-field { flex: 1 1 100%; }
  .embed-field.inline { flex: 1 1 45%; }
  .embed-field-name { font-weight: 600; font-size: 13px; color: #f2f3f5; margin-bottom: 2px; }
  .embed-field-value { font-size: 13px; color: #dbdee1; }
  .attachment-img { max-width: 400px; max-height: 300px; border-radius: 8px; margin-top: 8px; }
  .attachment-file { background: #2b2d31; border: 1px solid #3f4147; padding: 8px 12px; border-radius: 4px; margin-top: 8px; font-size: 14px; width: fit-content; }
  .buttons-row { display: flex; gap: 8px; margin-top: 8px; }
  .btn { border: none; padding: 6px 16px; border-radius: 3px; font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-primary { background: #5865f2; color: #fff; }
  .btn-secondary { background: #4e5058; color: #fff; }
  .btn-success { background: #248046; color: #fff; }
  .btn-danger { background: #da373c; color: #fff; }
</style>
</head>
<body>
  <div class="header">
    <h1>🎫 Transcripción de Ticket: #${ticketName}</h1>
    <p>Servidor: ${guild ? guild.name : 'Desconocido'} | Cerrado por: ${closedBy} | Fecha: ${new Date().toLocaleString('es-ES')}</p>
  </div>
  <div class="chat-container">
    ${messagesHtml || '<p style="color: #949ba4;">No hay mensajes registrados en este ticket.</p>'}
  </div>
</body>
</html>`;

        const timestamp = Date.now();
        const htmlFileName = `ticket_${ticketName}_${timestamp}.html`;
        const htmlPath = path.join(ticketsDir, htmlFileName);

        fs.writeFileSync(htmlPath, html, 'utf8');
        console.log(`✅ [CodeCord] HTML del ticket ${ticketName} generado: ${htmlPath}`);
        return htmlPath;
    } catch (error) {
        console.error('❌ Error generando HTML del ticket:', error);
        return null;
    }
}

/**
 * Cierra un canal de ticket, genera transcripciones y las envía por log y mensaje privado (DM).
 * @param {GuildChannel} ticketChannel 
 * @param {User|GuildMember} closedBy 
 * @param {Function|null} [replyCallback=null] 
 */
async function closeTicketChannel(ticketChannel, closedBy, replyCallback = null) {
    if (!ticketChannel || !isTicketChannel(ticketChannel)) return;

    const ticketName = ticketChannel.name;
    const closingEmbed = new EmbedBuilder()
        .setTitle('🔒 Cerrando ticket...')
        .setDescription('Este ticket se cerrará automáticamente en 5 segundos.')
        .setColor(0xFFA500);

    if (replyCallback) {
        try {
            await replyCallback({ content: '⚠️ Cerrando el ticket...', embeds: [closingEmbed], flags: MessageFlags.Ephemeral });
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
        const guildTicketConfig = configManager.loadGuildConfig(ticketChannel.guild.id, 'tickets', {});
        ticketLogChannelId = guildTicketConfig.ticketLogChannelId || null;
    } catch (error) {
        console.error('Error leyendo tickets config para cierre de ticket:', error);
    }

    const { sendLogEmbed } = require('./loggerSystem');
    await sendLogEmbed(ticketChannel.guild, logEmbed, 'TICKET_CLOSE');

    let ticketUser = findTicketUserByChannel(ticketChannel);
    if (!ticketUser) {
        const match = ticketChannel.name.match(/ticket-(\d+)/);
        if (match) {
            ticketUser = await ticketChannel.guild.members.fetch(match[1]).catch(() => null);
        }
    }

    if (ticketUser) {
        try {
            const userEmbed = new EmbedBuilder()
                .setTitle('🔒 Tu ticket ha sido cerrado')
                .setDescription(`Tu ticket **${ticketName}** ha sido cerrado por **${closedBy.user?.tag || closedBy.tag || String(closedBy)}**.`)
                .addFields({ name: '📄 Transcripción', value: htmlPath ? 'HTML generado y adjunto' : 'No disponible', inline: true })
                .setColor(0x00FF00)
                .setTimestamp();

            const userFiles = [];
            if (htmlPath && fs.existsSync(htmlPath)) {
                userFiles.push({ attachment: htmlPath, name: path.basename(htmlPath) });
            }

            await ticketUser.send({ embeds: [userEmbed], files: userFiles }).catch(() => { });
        } catch (dmError) {
            console.warn('No se pudo enviar DM al creador del ticket:', dmError.message);
        }
    }

    setTimeout(async () => {
        try {
            await ticketChannel.delete('Ticket cerrado por CodeCord');
        } catch (deleteError) {
            console.error('Error eliminando canal del ticket:', deleteError);
        }
    }, 5000);
}

/**
 * Carga la configuración de roles de staff desde los archivos por servidor.
 * @param {Client} client 
 */
function loadStaffConfig(client) {
    try {
        const parentDir = path.join(__dirname, '..', '..', 'servidores');
        if (!fs.existsSync(parentDir)) return;
        const folders = fs.readdirSync(parentDir);
        for (const folder of folders) {
            const match = folder.match(/_(\d+)$/);
            if (match) {
                const guildId = match[1];
                const data = configManager.loadGuildConfig(guildId, 'staffroles', {});
                if (data.ticketStaffRole) client.ticketStaffRole.set(guildId, data.ticketStaffRole);
                if (data.commandRoles) client.commandRoles.set(guildId, data.commandRoles);
                if (data.voiceSupportStaffRole) client.voiceSupportStaffRole.set(guildId, data.voiceSupportStaffRole);
                if (data.voiceSupportSanctionedRole) client.voiceSupportSanctionedRole.set(guildId, data.voiceSupportSanctionedRole);
                if (data.autoModAdminRole) client.antiRaid.adminRole.set(guildId, data.autoModAdminRole);
                if (data.autoModSettings) client.antiRaid.settings.set(guildId, data.autoModSettings);
            }
        }
    } catch (error) {
        console.error('Error cargando configuración de staff:', error);
    }
}

/**
 * Guarda la configuración de roles de staff en los archivos por servidor.
 * @param {Client} client 
 */
function saveStaffConfig(client) {
    const guildIds = new Set([
        ...client.commandRoles.keys(),
        ...client.ticketStaffRole.keys(),
        ...client.voiceSupportStaffRole.keys(),
        ...client.voiceSupportSanctionedRole.keys(),
        ...client.antiRaid.adminRole.keys(),
        ...client.antiRaid.settings.keys()
    ]);

    for (const guildId of guildIds) {
        const data = {};
        if (client.commandRoles.has(guildId)) data.commandRoles = client.commandRoles.get(guildId);
        if (client.ticketStaffRole.has(guildId)) data.ticketStaffRole = client.ticketStaffRole.get(guildId);
        if (client.voiceSupportStaffRole.has(guildId)) data.voiceSupportStaffRole = client.voiceSupportStaffRole.get(guildId);
        if (client.voiceSupportSanctionedRole.has(guildId)) data.voiceSupportSanctionedRole = client.voiceSupportSanctionedRole.get(guildId);
        if (client.antiRaid.adminRole.has(guildId)) data.autoModAdminRole = client.antiRaid.adminRole.get(guildId);
        if (client.antiRaid.settings.has(guildId)) data.autoModSettings = client.antiRaid.settings.get(guildId);

        configManager.saveGuildConfig(guildId, 'staffroles', data);
    }
}

module.exports = {
    getTicketConfig,
    setTicketConfig,
    hasStaffPermission,
    isTicketChannel,
    findTicketUserByChannel,
    generateTicketICO,
    generateTicketPDF,
    generateTicketHTML,
    closeTicketChannel,
    loadStaffConfig,
    saveStaffConfig,
    parseMarkdown,
    buildButtonIcon,
    buildButtons,
    buildEmbeds
};

