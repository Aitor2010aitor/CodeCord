// Archivo: src/commands/administradores/anuncio.js

/**
 * @file anuncio.js
 * @description Comando /anuncio para publicar un anuncio con embed en un canal.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'anuncio',
    description: 'Publica un anuncio con embed en el canal indicado',
    /**
     * Ejecuta el comando anuncio.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ No tienes permiso para crear anuncios.', flags: MessageFlags.Ephemeral });
        }

        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const canal = interaction.options.getChannel('canal');
        const color = interaction.options.getString('color') || '#0099FF';
        const imagen = interaction.options.getString('imagen');

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

            return interaction.reply({ content: `✅ Anuncio enviado a ${canal}`, flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error al crear anuncio:', e);
            return interaction.reply({ content: '❌ No pude crear el anuncio.', flags: MessageFlags.Ephemeral });
        }
    }
};