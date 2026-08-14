// Archivo: src/commands/administradores/enviarmd.js

/**
 * @file enviarmd.js
 * @description Comando /enviarmd para enviar mensajes privados en formato Embed desde el bot.
 */

const { MessageFlags, EmbedBuilder  } = require('discord.js');
const { hasStaffPermission } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'enviarmd',
    description: 'Envía un mensaje privado (DM) en formato Embed a un usuario (solo staff)',
    /**
     * Ejecuta el comando enviarmd.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!hasStaffPermission(interaction.member, interaction.guild)) {
            return await interaction.editReply({ content: '❌ No tienes permisos de staff para usar este comando.' });
        }

        let targetUser = interaction.options.getUser('usuario');
        const userId = interaction.options.getString('id');

        if (!targetUser && userId) {
            targetUser = await client.users.fetch(userId).catch(() => null);
        }

        if (!targetUser) {
            return await interaction.editReply({ content: '❌ Debes proporcionar un usuario válido (mención o ID).' });
        }

        const titulo = interaction.options.getString('titulo') || 'Mensaje de CodeCord Staff';
        const descripcion = interaction.options.getString('descripcion') || '';
        const subtitulo = interaction.options.getString('subtitulo') || null;
        const color = interaction.options.getString('color') || '#0099FF';

        let embedColor = 0x0099FF;
        if (color.match(/^#[0-9A-F]{6}$/i)) {
            embedColor = parseInt(color.replace('#', ''), 16);
        }

        const dmEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(embedColor)
            .setFooter({ text: `Mensaje enviado desde ${interaction.guild.name} vía CodeCord` })
            .setTimestamp();

        if (subtitulo) {
            dmEmbed.addFields({ name: '📌 Información adicional', value: subtitulo, inline: false });
        }

        try {
            await targetUser.send({ embeds: [dmEmbed] });
            await interaction.editReply({ content: `✅ Mensaje privado enviado exitosamente a **${targetUser.tag}**.` });
        } catch (err) {
            console.error('Error enviando DM:', err);
            await interaction.editReply({ content: `❌ No se pudo enviar el mensaje privado a **${targetUser.tag}**. Probablemente tiene los mensajes bloqueados.` });
        }
    }
};
