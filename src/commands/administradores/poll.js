// Archivo: src/commands/administradores/poll.js

/**
 * @file poll.js
 * @description Comando /poll para crear encuestas con reacciones.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { hasStaffPermission } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'poll',
    description: 'Crea una encuesta con opciones',
    /**
     * Ejecuta el comando poll.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!hasStaffPermission(interaction.member, interaction.guild)) {
            return interaction.reply({ content: '❌ No tienes permisos de staff para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        const pregunta = interaction.options.getString('pregunta');
        const opcionesString = interaction.options.getString('opciones');

        try {
            const opciones = opcionesString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

            if (opciones.length < 2) {
                return interaction.reply({ content: '❌ Debes proporcionar al menos 2 opciones separadas por comas.', flags: MessageFlags.Ephemeral });
            }

            if (opciones.length > 10) {
                return interaction.reply({ content: '❌ Máximo 10 opciones permitidas.', flags: MessageFlags.Ephemeral });
            }

            const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            const opcionesText = opciones.map((opt, index) => `${emojis[index]} ${opt}`).join('\n');

            const pollEmbed = new EmbedBuilder()
                .setTitle(`📊 ${pregunta}`)
                .setDescription(opcionesText)
                .setColor(0x00FF00)
                .setFooter({ text: `Encuesta creada por ${interaction.user.tag}` })
                .setTimestamp();

            const mensaje = await interaction.channel.send({ embeds: [pollEmbed] });

            for (let i = 0; i < opciones.length; i++) {
                await mensaje.react(emojis[i]);
            }

            return interaction.reply({ content: '✅ Encuesta creada exitosamente!', flags: MessageFlags.Ephemeral });
        } catch (e) {
            console.error('Error al crear encuesta:', e);
            return interaction.reply({ content: '❌ No pude crear la encuesta.', flags: MessageFlags.Ephemeral });
        }
    }
};