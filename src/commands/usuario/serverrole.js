// Archivo: src/commands/usuario/serverrole.js

/**
 * @file serverrole.js
 * @description Comando /serverrole para mostrar información detallada de un rol.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'serverrole',
    description: 'Muestra información detallada de un rol',
    /**
     * Ejecuta el comando serverrole.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        try {
            const role = interaction.options.getRole('rol');

            if (!role) {
                return interaction.reply({ content: '❌ No se ha proporcionado un rol válido.', flags: MessageFlags.Ephemeral });
            }

            let baseMentionable = role.mentionable ? "Sí" : "No";
            let color = parseInt(role.color);

            if (isNaN(color)) {
                color = "ORANGE";
            }

            let creatorInfo = "Desconocido";

            try {
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
                    const roleAge = Date.now() - role.createdTimestamp;
                    const daysOld = Math.floor(roleAge / (1000 * 60 * 60 * 24));
                    creatorInfo = daysOld > 30 ? "Creado hace mucho tiempo" : "Creado recientemente";
                }
            } catch (error) {
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

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('❌ Error en serverrole:', error);
            await interaction.reply({ content: '❌ Se ha producido un error al ejecutar el comando.', flags: MessageFlags.Ephemeral });
        }
    }
};