// Comando /unwar para retirar la advertencia más reciente de un usuario.

const { MessageFlags, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { getSanctionRecords } = require('../../systems/sanctionSystem.js');
const { sendLogEmbed } = require('../../systems/loggerSystem.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unwar',
    description: 'Elige y retira una advertencia de un usuario',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tienes permisos de moderación para retirar advertencias.', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('usuario');
        if (!targetUser) {
            return interaction.reply({ content: '❌ Debes proporcionar un usuario válido.', flags: MessageFlags.Ephemeral });
        }

        const warnings = getSanctionRecords(interaction.guild.id, targetUser.id).filter(record => record.type === 'WARN');
        if (warnings.length === 0) {
            return interaction.reply({ content: `✅ ${targetUser.tag} no tiene advertencias para retirar.`, flags: MessageFlags.Ephemeral });
        }

        const options = warnings.slice(0, 25).map((warning, index) => new StringSelectMenuOptionBuilder()
            .setLabel(`${index + 1}. ${(warning.reason || 'Sin razón').slice(0, 90)}`)
            .setDescription(new Date(warning.timestamp).toLocaleString('es-ES').slice(0, 100))
            .setValue(String(index)));
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`unwar_select_${targetUser.id}_${interaction.user.id}`)
                .setPlaceholder('Selecciona la advertencia que quieres eliminar')
                .addOptions(options)
        );

        return interaction.reply({
            content: `Selecciona la advertencia de **${targetUser.tag}** que quieres eliminar:`,
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
};
