// Archivo: src/commands/administradores/createsupportchannels.js

/**
 * @file createsupportchannels.js
 * @description Comando /createsupportchannels para crear los canales de soporte de voz y configurar roles de staff.
 */

const { MessageFlags, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { saveStaffConfig } = require('../../systems/ticketSystem.js');

module.exports = {
    name: 'createsupportchannels',
    description: 'Crea los canales de soporte de voz y configura los roles de staff',
    /**
     * Ejecuta el comando createsupportchannels.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const member = interaction.member;

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden crear canales de soporte.', flags: MessageFlags.Ephemeral });
        }

        try {
            const mainRole = interaction.options.getRole('rol');
            const role2 = interaction.options.getRole('rol2');
            const role3 = interaction.options.getRole('rol3');
            const role4 = interaction.options.getRole('rol4');
            const role5 = interaction.options.getRole('rol5');

            client.voiceSupportStaffRole.set(interaction.guild.id, mainRole.id);

            const allRoles = [mainRole];
            if (role2) allRoles.push(role2);
            if (role3) allRoles.push(role3);
            if (role4) allRoles.push(role4);
            if (role5) allRoles.push(role5);

            const category = await interaction.guild.channels.create({
                name: '🎧 Soporte de Voz',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });

            const logChannel = await interaction.guild.channels.create({
                name: 'soporte-log-de-voz',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });

            const waitingRoom = await interaction.guild.channels.create({
                name: '⌛ sala-de-espera',
                type: ChannelType.GuildVoice,
                parent: category.id,
                userLimit: 0
            });

            const permissionOverwrites = [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.Connect]
                }
            ];

            for (const role of allRoles) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
                });
            }

            const support1 = await interaction.guild.channels.create({
                name: '🔧 soporte-1',
                type: ChannelType.GuildVoice,
                parent: category.id,
                userLimit: 2,
                permissionOverwrites: permissionOverwrites
            });

            const support2 = await interaction.guild.channels.create({
                name: '🔧 soporte-2',
                type: ChannelType.GuildVoice,
                parent: category.id,
                userLimit: 2,
                permissionOverwrites: permissionOverwrites
            });

            const rolesList = allRoles.map(r => `✅ ${r}`).join('\n');

            const guide = new EmbedBuilder()
                .setTitle('🎧 Sistema de Soporte de Voz')
                .setDescription('Sistema de soporte de voz configurado correctamente.')
                .addFields(
                    { name: '📋 Canales Creados', value: `✅ ${waitingRoom} - Sala de espera\n✅ ${support1} - Canal de soporte 1\n✅ ${support2} - Canal de soporte 2\n✅ ${logChannel} - Canal de logs`, inline: false },
                    { name: '👥 Roles de Staff Configurados', value: rolesList, inline: false },
                    { name: '🔧 Cómo Funciona', value: '1) Los usuarios se unen a la sala de espera\n2) El staff se une a soporte-1 o soporte-2\n3) El bot mueve automáticamente al siguiente usuario\n4) Usa `!nex` en el canal de log para mover manualmente', inline: false },
                    { name: '⚠️ Importante', value: 'Solo usuarios con los roles de staff configurados pueden entrar a los canales de soporte.', inline: false }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await logChannel.send({ embeds: [guide] });

            saveStaffConfig(client);

            const ok = new EmbedBuilder()
                .setTitle('✅ Sistema de Soporte de Voz Configurado')
                .setDescription(`Se creó la categoría **${category.name}** con:\n${waitingRoom}\n${support1}\n${support2}\n${logChannel}\n\n**Roles de Staff:**\n${rolesList}\n\n✅ Todo está listo para usar.`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.reply({ embeds: [ok], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error creando canales de soporte:', error);
            return interaction.reply({ content: '❌ Error al crear los canales. Revisa mis permisos para crear canales.', flags: MessageFlags.Ephemeral });
        }
    }
};