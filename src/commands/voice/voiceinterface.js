// Archivo: src/commands/voice/voiceinterface.js

/**
 * @file voiceinterface.js
 * @description Comando /voiceinterface para publicar el panel interactivo de voz.
 */

const { buildVoiceInterfacePanel } = require('../../systems/voiceSystem.js');

module.exports = {
    name: 'voiceinterface',
    description: 'Interfaz para gestionar canales de voz temporales',
    /**
     * Ejecuta el comando voiceinterface.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const { embed, rows } = buildVoiceInterfacePanel();
        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
};
