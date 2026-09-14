// Archivo: src/systems/welcomeSystem.js

/**
 * @file welcomeSystem.js
 * @description Sistema de bienvenidas y tarjetas para CodeCord.
 */

const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const configManager = require('../../scripts/config-manager.js');
const { generateWelcomeCard } = require('../../scripts/welcome-card.js');

/**
 * Procesa la bienvenida de un nuevo miembro enviando el mensaje y la tarjeta gráfica.
 * @param {GuildMember} member - Instancia del miembro que ingresó.
 */
async function processWelcomeMember(member) {
    try {
        const guildConfig = configManager.loadGuildConfig(member.guild.id, 'welcome', null);
        if (!guildConfig || !guildConfig.enabled || !guildConfig.channel) return;

        let welcomeChannel = member.guild.channels.cache.get(guildConfig.channel);
        if (!welcomeChannel) {
            welcomeChannel = await member.guild.channels.fetch(guildConfig.channel).catch(() => null);
        }

        if (!welcomeChannel) {
            console.log(`[CodeCord WELCOME] No se encontró el canal ${guildConfig.channel}`);
            return;
        }

        const title = (guildConfig.title || '¡Bienvenido {user}!')
            .replace(/{user}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);

        const welcomeMsg = (guildConfig.message || '¡Bienvenido {user} a {server}!')
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);

        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });

        let bgPath = null;
        if (guildConfig.background) {
            if (guildConfig.background.startsWith('/uploads/') || guildConfig.background.includes('/uploads/')) {
                const fileName = path.basename(guildConfig.background);
                const candidate = path.join(__dirname, '..', '..', 'uploads', fileName);
                if (fs.existsSync(candidate)) bgPath = candidate;
            } else if (guildConfig.background.startsWith('http')) {
                bgPath = guildConfig.background;
            }
        }

        let cardBuffer = null;
        try {
            cardBuffer = await generateWelcomeCard({
                bgPath,
                avatarUrl,
                username: member.user.username,
                title,
                memberCount: member.guild.memberCount,
                color: guildConfig.color || '#5865f2'
            });
        } catch (err) {
            console.error('[CodeCord WELCOME] Error generando tarjeta Jimp:', err.message);
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor(guildConfig.color || '#5865f2')
            .setAuthor({ name: member.user.username, iconURL: avatarUrl })
            .setTitle(title)
            .setDescription(`**Miembro #${member.guild.memberCount}**`)
            .setTimestamp()
            .setFooter({ text: '¡Bienvenido al servidor con CodeCord!' });

        const msgOptions = { content: welcomeMsg, embeds: [welcomeEmbed] };

        if (cardBuffer) {
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome.png' });
            welcomeEmbed.setImage('attachment://welcome.png');
            msgOptions.files = [attachment];
        } else {
            welcomeEmbed.setThumbnail(avatarUrl);
        }

        await welcomeChannel.send(msgOptions);
        console.log(`✅ [CodeCord WELCOME] Tarjeta enviada con éxito para ${member.user.tag}`);
    } catch (error) {
        console.error('❌ Error en processWelcomeMember:', error);
    }
}

module.exports = {
    processWelcomeMember
};
