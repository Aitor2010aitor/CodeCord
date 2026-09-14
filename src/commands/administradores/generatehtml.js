// Archivo: src/commands/administradores/generatehtml.js

/**
 * @file generatehtml.js
 * @description Comando /generatehtml para exportar manualmente un transcript HTML de cualquier canal de texto.
 */

const fs = require('fs');
const path = require('path');
const { MessageFlags, PermissionsBitField  } = require('discord.js');
const { generateTicketHTML, hasStaffPermission } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'generatehtml',
    description: 'Genera manualmente la transcripción HTML del canal actual (solo staff)',
    /**
     * Ejecuta el comando generatehtml.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!hasStaffPermission(interaction.member, interaction.guild)) {
            return interaction.reply({ content: '❌ No tienes permisos de staff para generar transcripciones.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const htmlPath = await generateTicketHTML(interaction.channel, interaction.channel.name, interaction.user.tag);

            if (htmlPath && fs.existsSync(htmlPath)) {
                await interaction.editReply({
                    content: `✅ Transcripción HTML generada con éxito por CodeCord:`,
                    files: [{ attachment: htmlPath, name: path.basename(htmlPath) }]
                });
            } else {
                await interaction.editReply({ content: '❌ Ocurrió un error al generar la transcripción HTML.' });
            }
        } catch (error) {
            console.error('Error generando HTML manual:', error);
            await interaction.editReply({ content: '❌ Error procesando el archivo de transcripción.' });
        }
    }
};
