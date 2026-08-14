// Archivo: src/commands/usuario/sugerencia.js

/**
 * @file sugerencia.js
 * @description Comando /sugerencia para enviar sugerencias al canal configurado del servidor.
 */

const { MessageFlags, EmbedBuilder, ChannelType  } = require('discord.js');
const configManager = require('../../../scripts/config-manager.js');

module.exports = {
    name: 'sugerencia',
    description: 'Envía una sugerencia al canal oficial del servidor',
    /**
     * Ejecuta el comando sugerencia.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const suggestionText = interaction.options.getString('texto');
        let guildSuggestionsConfig = configManager.loadGuildConfig(interaction.guild.id, 'suggestions', { suggestionsChannelId: '', suggestions: [] });
        if (!guildSuggestionsConfig.suggestions) guildSuggestionsConfig.suggestions = [];

        let suggestionsChannel = null;
        if (guildSuggestionsConfig.suggestionsChannelId) {
            suggestionsChannel = interaction.guild.channels.cache.get(guildSuggestionsConfig.suggestionsChannelId);
        }

        if (!suggestionsChannel) {
            suggestionsChannel = await interaction.guild.channels.create({
                name: '╰📝 ・sugerencias',
                type: ChannelType.GuildText
            }).catch(() => null);

            if (suggestionsChannel) {
                guildSuggestionsConfig.suggestionsChannelId = suggestionsChannel.id;
                configManager.saveGuildConfig(interaction.guild.id, 'suggestions', guildSuggestionsConfig);
            }
        }

        if (!suggestionsChannel) {
            return await interaction.editReply({ content: '❌ No se pudo encontrar ni crear el canal de sugerencias.' });
        }

        const embed = new EmbedBuilder()
            .setTitle('💡 Nueva Sugerencia | CodeCord')
            .setDescription(suggestionText)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setColor(0xFFA500)
            .setFooter({ text: 'Reacciona con 👍 o 👎 para votar' })
            .setTimestamp();

        const msg = await suggestionsChannel.send({ embeds: [embed] });
        await msg.react('👍');
        await msg.react('👎');

        await interaction.editReply({ content: `✅ Tu sugerencia ha sido publicada en ${suggestionsChannel}.` });
    }
};
