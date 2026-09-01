// Archivo: src/commands/administradores/createcategory.js

/**
 * @file createcategory.js
 * @description Comando /createcategory para crear la categoría "🍺 Salas privadas"
 *              con canal de texto de interfaz y canal de voz lobby (solo administradores).
 *              Replicado desde VERSION-7.0.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { buildVoiceInterfacePanel } = require('../../systems/voiceSystem.js');

module.exports = {
    name: 'createcategory',
    description: 'Crea la categoría "🍺 Salas privadas" con subcanales (solo administradores)',
    /**
     * Ejecuta el comando createcategory.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden crear categorías.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Crear categoría base
            const category = await interaction.guild.channels.create({
                name: '🍺 Salas privadas',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });

            // Crear canal de texto de interfaz
            const interfaceChannel = await interaction.guild.channels.create({
                name: '🧮 interface',
                type: ChannelType.GuildText,
                parent: category.id
            });

            // Crear canal de voz lobby para disparar la creación de salas temporales
            const lobbyChannel = await interaction.guild.channels.create({
                name: '🔊 Crear sala',
                type: ChannelType.GuildVoice,
                parent: category.id
            });

            // Publicar guía en el canal de interfaz
            const guide = new EmbedBuilder()
                .setTitle('🎙️ Sistema de Salas Privadas')
                .setDescription('Conéctate a **🔊 Crear sala** para generar tu sala privada automáticamente.')
                .addFields(
                    {
                        name: 'Cómo funciona',
                        value: '1) Entra a "🔊 Crear sala"\n2) Se crea tu sala privada y te movemos\n3) Usa `/voiceinterface` para gestionarla\n4) La sala se elimina cuando te desconectas'
                    }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await interfaceChannel.send({ embeds: [guide] });

            // Publicar el panel de control de voz en el canal de interfaz
            const panel = buildVoiceInterfacePanel();
            await interfaceChannel.send({ embeds: [panel.embed], components: panel.rows });

            const ok = new EmbedBuilder()
                .setTitle('✅ Estructura creada')
                .setDescription(`Se creó **${category.name}** con ${interfaceChannel} y ${lobbyChannel}.`)
                .setColor(0x00FF00)
                .setFooter({ text: 'CodeCord • Sistema de Salas Privadas' })
                .setTimestamp();

            return interaction.editReply({ embeds: [ok] });

        } catch (error) {
            console.error('❌ Error creando estructura de salas privadas:', error);
            return interaction.editReply({ content: '❌ Error al crear la estructura. Revisa mis permisos para crear canales.' });
        }
    }
};
