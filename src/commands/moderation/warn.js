// Archivo: src/commands/moderation/warn.js

/**
 * @file warn.js
 * @description Comando /warn para advertir a un miembro del servidor.
 */

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { addSanctionRecord } = require('../../systems/sanctionSystem.js');

module.exports = {
    name: 'warn',
    description: 'Aplica una advertencia formal a un usuario',
    /**
     * Ejecuta el comando warn.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos de moderación.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!targetUser) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario.', ephemeral: true });
        }

        addSanctionRecord(interaction.guild.id, {
            userId: targetUser.id,
            userTag: targetUser.tag,
            reason,
            timestamp: Date.now(),
            moderatorTag: interaction.user.tag,
            moderatorId: interaction.user.id,
            type: 'WARN'
        });

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Advertencia Aplicada | CodeCord')
            .addFields(
                { name: 'Usuario', value: `${targetUser.tag}`, inline: true },
                { name: 'Moderador', value: interaction.user.tag, inline: true },
                { name: 'Razón', value: reason, inline: false }
            )
            .setColor(0xFFA500)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
