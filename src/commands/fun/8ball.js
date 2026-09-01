// Archivo: src/commands/fun/8ball.js

/**
 * @file 8ball.js
 * @description Comando /8ball para obtener respuestas místicas de la bola 8 mágica.
 */

const { EmbedBuilder } = require('discord.js');

const responses = [
    'En mi opinión, sí.',
    'Es cierto.',
    'Es decididamente así.',
    'Sin duda.',
    'Sí, definitivamente.',
    'Debes confiar en ello.',
    'Como yo lo veo, sí.',
    'Mostly probable.',
    'Perspectiva buena.',
    'Sí.',
    'Las señales apuntan a que sí.',
    'Respuesta confusa, intenta de nuevo.',
    'Pregunta de nuevo más tarde.',
    'Mejor no decirte ahora.',
    'No puedo predecirlo ahora.',
    'Concéntrate y pregunta naciendo de nuevo.',
    'No cuentes con ello.',
    'Mi respuesta es no.',
    'Mis fuentes dicen que no.',
    'Las perspectivas no son buenas.',
    'Muy dudoso.'
];

module.exports = {
    name: '8ball',
    description: 'Hazle una pregunta a la Bola 8 Mágica de CodeCord',
    /**
     * Ejecuta el comando 8ball.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const question = interaction.options.getString('pregunta') || '¿CodeCord es el mejor bot?';
        const randomResp = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setTitle('🎱 Bola 8 Mágica | CodeCord')
            .addFields(
                { name: '❓ Pregunta', value: question, inline: false },
                { name: '🔮 Respuesta', value: randomResp, inline: false }
            )
            .setColor(0x9B59B6)
            .setFooter({ text: `Consultado por ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
