// Archivo: src/commands/moderation/sanctionhistory.js

/**
 * @file sanctionhistory.js
 * @description Comando /sanctionhistory para consultar el historial de sanciones del servidor.
 */

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getSanctionRecords } = require('../../systems/sanctionSystem.js');

module.exports = {
    name: 'sanctionhistory',
    description: 'Consulta el historial de sanciones y advertencias del servidor',
    /**
     * Ejecuta el comando sanctionhistory.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos para ver las sanciones.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('usuario');
        const records = getSanctionRecords(interaction.guild.id, targetUser?.id);

        if (records.length === 0) {
            return interaction.reply({ content: '📜 No se encontraron sanciones registradas.', ephemeral: true });
        }

        const historyText = records.slice(-10).map((r, i) =>
            `**${i + 1}.** [${new Date(r.timestamp).toLocaleDateString('es-ES')}] **${r.type || 'SANCION'}** - User: ${r.userTag} | Mod: ${r.moderatorTag} | Razón: ${r.reason}`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`📜 Historial de Sanciones CodeCord ${targetUser ? `para ${targetUser.username}` : ''}`)
            .setDescription(historyText)
            .setColor(0x5865F2)
            .setFooter({ text: `Mostrando últimas ${Math.min(records.length, 10)} de ${records.length} sanciones.` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
