// Archivo: src/commands/administradores/warnings.js

/**
 * @file warnings.js
 * @description Comando /warnings para ver las advertencias de un usuario.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getSanctionRecords } = require('../../systems/sanctionSystem.js');

module.exports = {
    name: 'warnings',
    description: 'Muestra las advertencias de un usuario',
    /**
     * Ejecuta el comando warnings.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tienes permiso para ver advertencias.', flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('usuario');

        if (!user) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario.', flags: MessageFlags.Ephemeral });
        }

        try {
            const allRecords = getSanctionRecords(interaction.guild.id, user.id);
            const warnList = allRecords.filter(r => r.type === 'WARN');

            if (warnList.length === 0) {
                return interaction.reply({ content: `✅ ${user.tag} no tiene ninguna advertencia.`, flags: MessageFlags.Ephemeral });
            }

            const warningsText = warnList.map((warn, index) => {
                const date = new Date(warn.timestamp);
                return `**${index + 1}.** ${warn.reason}\n   *Por: ${warn.moderatorTag}*\n   *Fecha: ${date.toLocaleDateString('es-ES')} a las ${date.toLocaleTimeString('es-ES')}*`;
            }).join('\n\n');

            const warningsEmbed = new EmbedBuilder()
                .setTitle(`⚠️ Advertencias de ${user.tag}`)
                .setDescription(warningsText)
                .setThumbnail(user.displayAvatarURL())
                .setColor(0xFFCC00)
                .setFooter({ text: `Total: ${warnList.length} advertencia(s)` })
                .setTimestamp();

            return interaction.reply({ embeds: [warningsEmbed], flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error al ver advertencias:', e);
            return interaction.reply({ content: '❌ No pude obtener las advertencias.', flags: MessageFlags.Ephemeral });
        }
    }
};
