// Archivo: src/commands/usuario/avatar.js

/**
 * @file avatar.js
 * @description Comando /avatar para ver el avatar de un usuario.
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Muestra el avatar de un usuario',
    /**
     * Ejecuta el comando avatar.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        try {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;

            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar de ${targetUser.username}`)
                .setImage(targetUser.displayAvatarURL({ size: 4096, dynamic: true }))
                .setColor(0x0099FF)
                .setFooter({ text: `Solicitado por ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener el avatar:', error);
            await interaction.reply({ content: '❌ Error al obtener el avatar.', flags: require('discord.js').MessageFlags.Ephemeral });
        }
    }
};