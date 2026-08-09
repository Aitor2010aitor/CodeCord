// Archivo: src/events/interactionCreate.js

/**
 * @file interactionCreate.js
 * @description Evento principal 'interactionCreate' de Discord.js v14 para CodeCord.
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { handleGiveawayInteraction } = require('../server.js');
const { closeTicketChannel, hasStaffPermission, generateTicketHTML } = require('../systems/ticketSystem.js');
const { buildVoiceInterfacePanel, canUseCommand, findWaitingRoom, findSupportChannels } = require('../systems/voiceSystem.js');
const { sendLogEmbed } = require('../systems/loggerSystem.js');
const configManager = require('../../scripts/config-manager.js');

module.exports = {
    name: 'interactionCreate',
    once: false,
    /**
     * Ejecuta el manejador de interacciones.
     * @param {Interaction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        try {
            // Interacciones de Sorteos del Panel Web
            if (interaction.customId && interaction.customId.startsWith('giveaway_join_')) {
                return handleGiveawayInteraction(interaction);
            }

            // 1. Manejo de Slash Commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (command) {
                    console.log(`🔍 [CodeCord] Slash Command: /${interaction.commandName} ejecutado por ${interaction.user.tag}`);
                    await command.execute(interaction, client);
                } else {
                    console.warn(`⚠️ [CodeCord] Comando no encontrado: /${interaction.commandName}`);
                    await interaction.reply({ content: '❌ Este comando no se encuentra registrado en CodeCord.', ephemeral: true }).catch(() => {});
                }
                return;
            }

            // 2. Manejo de Botones y Formularios de Tickets
            if (interaction.isButton()) {
                const customId = interaction.customId;

                // Crear Ticket
                if (customId.startsWith('create_ticket')) {
                    const guildConfig = configManager.loadGuildConfig(interaction.guild.id, 'tickets', {});
                    let question = null;

                    if (customId.startsWith('create_ticket_btn_')) {
                        const btnIndex = customId.replace('create_ticket_btn_', '');
                        question = guildConfig[`pregunta${btnIndex}`] || null;
                    }

                    if (question && question.trim()) {
                        const btnIndex = customId.replace('create_ticket_btn_', '');
                        const modal = new ModalBuilder()
                            .setCustomId(`ticket_modal_${btnIndex}`)
                            .setTitle('Formulario de Ticket');

                        const questionInput = new TextInputBuilder()
                            .setCustomId('ticket_question_input')
                            .setLabel(question.length > 45 ? question.slice(0, 42) + '...' : question)
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true);

                        const row = new ActionRowBuilder().addComponents(questionInput);
                        modal.addComponents(row);
                        return await interaction.showModal(modal);
                    }

                    // Crear canal de ticket directamente
                    await createTicketChannel(interaction, client, null);
                    return;
                }

                // Cerrar Ticket
                if (customId === 'close_ticket') {
                    await closeTicketChannel(interaction.channel, interaction.user, (opts) => interaction.reply(opts));
                    return;
                }

                // Interfaz de Voz Temporales (Botones)
                if (customId.startsWith('vi_')) {
                    await handleVoiceInterfaceButtons(interaction, client);
                    return;
                }

                // Menús de Ayuda (/helpadmin)
                if (customId.startsWith('help_')) {
                    await handleHelpButtons(interaction);
                    return;
                }
            }

            // 3. Manejo de Modales Submit
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;

                if (customId.startsWith('ticket_modal_')) {
                    const userResponse = interaction.fields.getTextInputValue('ticket_question_input');
                    await createTicketChannel(interaction, client, userResponse);
                    return;
                }

                if (customId.startsWith('vi_')) {
                    await handleVoiceInterfaceModals(interaction, client);
                    return;
                }
            }

            // 4. Manejo de Menús de Selección
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('vi_') || interaction.customId.startsWith('staff_') || interaction.customId.startsWith('logs_')) {
                    await handleSelectMenus(interaction, client);
                    return;
                }
            }

        } catch (error) {
            console.error('❌ Error en el manejador de interacciones:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Ocurrió un error procesando la solicitud.', ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: '❌ Ocurrió un error procesando la solicitud.', ephemeral: true }).catch(() => {});
            }
        }
    }
};

/**
 * Función auxiliar para crear un canal de ticket.
 */
async function createTicketChannel(interaction, client, userResponse = null) {
    try {
        const guild = interaction.guild;
        const member = interaction.member;

        const existingTicket = guild.channels.cache.find(c => c.name === `ticket-${member.user.username.toLowerCase()}`);
        if (existingTicket) {
            return await interaction.reply({ content: `❌ Ya tienes un ticket abierto en ${existingTicket}.`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('tickets'));
        if (!category) {
            category = await guild.channels.create({ name: '🎫 TICKETS', type: ChannelType.GuildCategory });
        }

        const ticketStaffRoleId = client.ticketStaffRole.get(guild.id);
        const permissionOverwrites = [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
        ];

        if (ticketStaffRoleId) {
            permissionOverwrites.push({ id: ticketStaffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        }

        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket de ${member.user.username}`)
            .setDescription('Bienvenido a tu ticket. Explica detalladamente tu solicitud y un miembro del staff te atenderá pronto.')
            .setColor(0x5865F2)
            .setTimestamp();

        if (userResponse) {
            embed.addFields({ name: '📝 Respuesta del formulario:', value: userResponse });
        }

        const closeBtn = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Cerrar Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const row = new ActionRowBuilder().addComponents(closeBtn);

        await ticketChannel.send({ content: `${member} ${ticketStaffRoleId ? `<@&${ticketStaffRoleId}>` : ''}`, embeds: [embed], components: [row] });
        await interaction.editReply({ content: `✅ Tu ticket ha sido creado en ${ticketChannel}` });

    } catch (err) {
        console.error('Error creando canal de ticket:', err);
        await interaction.editReply({ content: '❌ Error creando el canal de ticket.' }).catch(() => {});
    }
}

/**
 * Manejador de botones de interfaz de voz.
 */
async function handleVoiceInterfaceButtons(interaction, client) {
    const customId = interaction.customId;
    const channel = interaction.member.voice?.channel;

    if (!channel || !client.tempVoiceChannels.has(channel.id)) {
        return await interaction.reply({ content: '❌ Debes estar en tu canal de voz temporal para usar estos botones.', ephemeral: true });
    }

    const ownerId = client.tempVoiceChannelOwners.get(channel.id);
    const isOwner = ownerId === interaction.user.id;

    if (customId === 'vi_name') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede renombrarlo.', ephemeral: true });
        const modal = new ModalBuilder().setCustomId('vi_name_modal').setTitle('Renombrar Canal');
        const input = new TextInputBuilder().setCustomId('vi_name_input').setLabel('Nuevo Nombre').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    if (customId === 'vi_limit') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede cambiar el límite.', ephemeral: true });
        const modal = new ModalBuilder().setCustomId('vi_limit_modal').setTitle('Límite de Usuarios');
        const input = new TextInputBuilder().setCustomId('vi_limit_input').setLabel('Límite (0 = ilimitado, máx 99)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    if (customId === 'vi_privacy') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede cambiar la privacidad.', ephemeral: true });
        const isPrivate = channel.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has(PermissionsBitField.Flags.Connect);
        if (isPrivate) {
            await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
            await interaction.reply({ content: '🔓 El canal ahora es público.', ephemeral: true });
        } else {
            await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
            await interaction.reply({ content: '🔒 El canal ahora es privado.', ephemeral: true });
        }
        return;
    }

    if (customId === 'vi_delete') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede eliminarlo.', ephemeral: true });
        await interaction.reply({ content: '🗑️ Eliminando canal...', ephemeral: true });
        client.tempVoiceChannels.delete(channel.id);
        client.tempVoiceChannelOwners.delete(channel.id);
        await channel.delete('Eliminado por el dueño');
        return;
    }

    if (customId === 'vi_claim') {
        if (isOwner) return interaction.reply({ content: '👑 Ya eres el propietario del canal.', ephemeral: true });
        const ownerMember = interaction.guild.members.cache.get(ownerId);
        if (ownerMember && ownerMember.voice.channel?.id === channel.id) {
            return interaction.reply({ content: '❌ El propietario actual aún se encuentra en la sala.', ephemeral: true });
        }
        client.tempVoiceChannelOwners.set(channel.id, interaction.user.id);
        await interaction.reply({ content: `👑 ¡Ahora eres el nuevo propietario de la sala <#${channel.id}>!`, ephemeral: true });
        return;
    }
}

/**
 * Manejador de Modales de la interfaz de voz.
 */
async function handleVoiceInterfaceModals(interaction, client) {
    const customId = interaction.customId;
    const channel = interaction.member.voice?.channel;

    if (!channel) return interaction.reply({ content: '❌ No estás en ningún canal de voz.', ephemeral: true });

    if (customId === 'vi_name_modal') {
        const newName = interaction.fields.getTextInputValue('vi_name_input');
        await channel.setName(newName);
        await interaction.reply({ content: `✅ Canal renombrado a **${newName}**`, ephemeral: true });
        return;
    }

    if (customId === 'vi_limit_modal') {
        const limitStr = interaction.fields.getTextInputValue('vi_limit_input');
        const limit = parseInt(limitStr);
        if (isNaN(limit) || limit < 0 || limit > 99) {
            return interaction.reply({ content: '❌ Ingresa un número válido entre 0 y 99.', ephemeral: true });
        }
        await channel.setUserLimit(limit);
        await interaction.reply({ content: `✅ Límite de usuarios establecido en **${limit === 0 ? 'Ilimitado' : limit}**`, ephemeral: true });
        return;
    }
}

/**
 * Manejador de botones del comando /helpadmin.
 */
async function handleHelpButtons(interaction) {
    const customId = interaction.customId;
    let title = 'Ayuda';
    let desc = '';

    if (customId === 'help_mod') {
        title = '🛡️ Comandos de Moderación';
        desc = '`/ban` - Banear usuario\n`/unban` - Desbanear usuario\n`/kick` - Expulsar usuario\n`/timeout` - Aclarar/Aislar usuario\n`/clear` - Borrar mensajes\n`/warn` - Advertir usuario';
    } else if (customId === 'help_tickets') {
        title = '🎫 Comandos de Tickets';
        desc = '`/ticketpanel` - Publicar panel de tickets\n`/ticketstaffrole` - Rol staff para tickets\n`/ticketlogchannel` - Canal de logs para tickets\n`/ticketclose` - Cerrar ticket';
    } else if (customId === 'help_voice') {
        title = '🎙️ Comandos de Voz';
        desc = '`/voiceinterface` - Interfaz de salas temporales\n`/setup` - Configuración de salas de voz\n`/createsupportchannels` - Crear canales de soporte';
    } else {
        title = 'ℹ️ Información General';
        desc = 'Usa la botonera para navegar por las diferentes categorías de ayuda de CodeCord.';
    }

    const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x5865F2).setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Manejador de menús de selección.
 */
async function handleSelectMenus(interaction, client) {
    await interaction.reply({ content: '✅ Selección procesada correctamente.', ephemeral: true }).catch(() => {});
}
