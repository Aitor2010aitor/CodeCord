// Archivo: src/commands/usuario/trivia.js

/**
 * @file trivia.js
 * @description Comando /trivia para jugar una ronda de trivia con preguntas aleatorias.
 */

const { EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const TRIVIA_QUESTIONS = [
    {
        pregunta: '¿Cuál es el planeta más grande del sistema solar?',
        respuestas: ['Tierra', 'Marte', 'Júpiter', 'Saturno'],
        correcta: 2
    },
    {
        pregunta: '¿Quién pintó la Mona Lisa?',
        respuestas: ['Vincent van Gogh', 'Leonardo da Vinci', 'Pablo Picasso', 'Miguel Ángel'],
        correcta: 1
    },
    {
        pregunta: '¿Cuál es el río más largo del mundo?',
        respuestas: ['Amazonas', 'Nilo', 'Yangtsé', 'Misisipi'],
        correcta: 0
    },
    {
        pregunta: '¿En qué año llegó el hombre a la Luna?',
        respuestas: ['1965', '1967', '1969', '1971'],
        correcta: 2
    },
    {
        pregunta: '¿Cuál es el país con más habitantes del mundo?',
        respuestas: ['Estados Unidos', 'India', 'China', 'Rusia'],
        correcta: 2
    },
    {
        pregunta: '¿Cuál es el océano más grande?',
        respuestas: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'],
        correcta: 3
    },
    {
        pregunta: '¿Cuántos huesos tiene el cuerpo humano adulto?',
        respuestas: ['206', '198', '215', '224'],
        correcta: 0
    },
    {
        pregunta: '¿Cuál es el metal más abundante en la Tierra?',
        respuestas: ['Hierro', 'Aluminio', 'Oro', 'Cobre'],
        correcta: 1
    },
    {
        pregunta: '¿En qué continente está Egipto?',
        respuestas: ['Asia', 'Europa', 'África', 'Oceanía'],
        correcta: 2
    },
    {
        pregunta: '¿Quién escribió "Cien años de soledad"?',
        respuestas: ['Jorge Luis Borges', 'Gabriel García Márquez', 'Julio Cortázar', 'Pablo Neruda'],
        correcta: 1
    }
];

module.exports = {
    name: 'trivia',
    description: 'Juega una ronda de trivia con preguntas aleatorias',
    /**
     * Ejecuta el comando trivia.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const question = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];

        const row = new ActionRowBuilder().addComponents(
            ...question.respuestas.map((respuesta, index) =>
                new ButtonBuilder()
                    .setCustomId(`trivia_${index}`)
                    .setLabel(respuesta)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const embed = new EmbedBuilder()
            .setTitle('🧠 ¡Trivia!')
            .setDescription(question.pregunta)
            .setColor(0x0099FF)
            .setFooter({ text: 'Tienes 15 segundos para responder' });

        await interaction.reply({ embeds: [embed], components: [row] });

        const filter = (btnInteraction) =>
            btnInteraction.user.id === interaction.user.id && btnInteraction.customId.startsWith('trivia_');

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 15000,
            max: 1,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (btnInteraction) => {
            const selected = parseInt(btnInteraction.customId.split('_')[1]);
            const isCorrect = selected === question.correcta;

            const resultEmbed = new EmbedBuilder()
                .setTitle(isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto')
                .setDescription(
                    isCorrect
                        ? `¡Muy bien ${interaction.user.username}! La respuesta correcta era **${question.respuestas[question.correcta]}**.`
                        : `La respuesta correcta era **${question.respuestas[question.correcta]}**.`
                )
                .setColor(isCorrect ? 0x00FF00 : 0xFF0000);

            await btnInteraction.update({ embeds: [resultEmbed], components: [] });
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ ¡Tiempo agotado!')
                    .setDescription(`La respuesta correcta era **${question.respuestas[question.correcta]}**.`)
                    .setColor(0xFFA500);

                await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};