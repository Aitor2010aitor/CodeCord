// Archivo: src/events/interactionCreate.js

/**
 * @file interactionCreate.js
 * @description Evento principal 'interactionCreate' de Discord.js v14 para CodeCord.
 */

const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder  } = require('discord.js');
const { handleGiveawayInteraction } = require('../server.js');
const { closeTicketChannel, hasStaffPermission, generateTicketHTML } = require('../systems/ticketSystem.js');
const { buildVoiceInterfacePanel, canUseCommand, findWaitingRoom, findSupportChannels } = require('../systems/voiceSystem.js');
const { sendLogEmbed } = require('../systems/loggerSystem.js');
const configManager = require('../../scripts/config-manager.js');
const { getSanctionRecords, removeWarning } = require('../systems/sanctionSystem.js');

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
                    const now = new Date().toLocaleString('es-ES');
                    const guildName = interaction.guild?.name || 'DM';
                    const channelName = interaction.channel?.name || 'DM';
                    const options = interaction.options.data.map(o => `${o.name}:${o.value}`).join(', ') || 'sin opciones';
                    console.log(`✅ [CodeCord] Comando: /${interaction.commandName} ${options ? `[${options}]` : ''} | Usuario: ${interaction.user.tag} (${interaction.user.id}) | Servidor: ${guildName} | Canal: #${channelName} | ${now}`);
                    await command.execute(interaction, client);
                } else {
                    console.warn(`⚠️ [CodeCord] Comando no encontrado: /${interaction.commandName} | Usuario: ${interaction.user.tag} (${interaction.user.id}) | Servidor: ${interaction.guild?.name || 'DM'}`);
                    await interaction.reply({ content: '❌ Este comando no se encuentra registrado en CodeCord.', flags: MessageFlags.Ephemeral }).catch(() => {});
                }
                return;
            }

            // 2. Manejo de Botones y Formularios de Tickets
            if (interaction.isButton()) {
                const customId = interaction.customId;

                if (customId.startsWith('juegos_')) {
                    return handleGameMenuButtons(interaction);
                }

                // Crear Ticket
                if (customId.startsWith('create_ticket')) {
                    const guildConfig = configManager.loadGuildConfig(interaction.guild.id, 'tickets', {});
                    let question = null;
                    let btnIndex = null;
                    let categoryName = 'General';

                    if (customId.startsWith('create_ticket_q')) {
                        // Panel Web: botón con formulario (create_ticket_q{index}) -> pregunta en panelConfigs
                        btnIndex = parseInt(customId.replace('create_ticket_q', ''), 10);
                        const panelConfig = (guildConfig.panelConfigs || []).find(p => p.index === btnIndex);
                        question = (panelConfig && panelConfig.question) || null;
                        categoryName = (panelConfig && panelConfig.name) || `Botón ${btnIndex}`;
                    } else if (customId.startsWith('create_ticket_btn_')) {
                        // Panel por comando: botón con formulario (create_ticket_btn_{index}) -> pregunta en boton{i}/pregunta{i}
                        btnIndex = customId.replace('create_ticket_btn_', '');
                        question = guildConfig[`pregunta${btnIndex}`] || null;
                        categoryName = guildConfig[`boton${btnIndex}`] || `Botón ${btnIndex}`;
                    } else if (customId.startsWith('create_ticket_')) {
                        btnIndex = customId.replace('create_ticket_', '');
                        categoryName = guildConfig[`boton${btnIndex}`] || `Botón ${btnIndex}`;
                    }

                    if (question && question.trim()) {
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
                    await crearTicket(interaction, client, null, { categoryName, question });
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

                // Botones de Administración de Voz/Roles (/voiceadmin, /setup)
                if (customId === 'admin_disconnect_all' || customId === 'admin_delete_temp' ||
                    customId === 'admin_clean_all' || customId === 'admin_role_user' ||
                    customId === 'admin_stats' || customId.startsWith('admin_users_prev_') ||
                    customId.startsWith('admin_users_next_') || customId === 'admin_user_by_id' ||
                    customId.startsWith('remove_roles_from_') || customId.startsWith('add_roles_to_')) {
                    await handleAdminButtons(interaction, client);
                    return;
                }
            }

            // 3. Manejo de Modales Submit
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;

                if (customId.startsWith('ticket_modal_')) {
                    const userResponse = interaction.fields.getTextInputValue('ticket_question_input');
                    const guildConfig = configManager.loadGuildConfig(interaction.guild.id, 'tickets', {});
                    const btnIndex = customId.replace('ticket_modal_', '');
                    const panelConfig = (guildConfig.panelConfigs || []).find(p => p.index === Number(btnIndex));
                    const categoryName = (panelConfig && panelConfig.name) || guildConfig[`boton${btnIndex}`] || `Botón ${btnIndex}`;
                    const question = (panelConfig && panelConfig.question) || guildConfig[`pregunta${btnIndex}`] || 'Sin pregunta registrada';
                    await crearTicket(interaction, client, userResponse, { categoryName, question });
                    return;
                }

                if (customId.startsWith('vi_')) {
                    await handleVoiceInterfaceModals(interaction, client);
                    return;
                }

                if (customId === 'admin_user_id_modal') {
                    await handleAdminUserIdModal(interaction, client);
                    return;
                }
            }

            // 4. Manejo de Menús de Selección
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('vi_target_')) {
                    await handleVoiceTargetSelection(interaction, client);
                    return;
                }
                if (interaction.customId.startsWith('unwar_select_')) {
                    return handleUnwarSelection(interaction);
                }
                if (interaction.customId.startsWith('vi_') || interaction.customId.startsWith('staff_') ||
                    interaction.customId.startsWith('logs_') || interaction.customId === 'admin_select_user_roles' ||
                    interaction.customId.startsWith('confirm_remove_role_') || interaction.customId.startsWith('confirm_add_role_')) {
                    await handleSelectMenus(interaction, client);
                    return;
                }
            }

        } catch (error) {
            console.error('❌ Error en el manejador de interacciones:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Ocurrió un error procesando la solicitud.', flags: MessageFlags.Ephemeral }).catch(() => {});
            } else {
                await interaction.reply({ content: '❌ Ocurrió un error procesando la solicitud.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
};

async function handleVoiceTargetSelection(interaction, client) {
    const parts = interaction.customId.split('_');
    const action = parts[2];
    const channelId = parts[3];
    const channel = interaction.member.voice?.channel;
    const memberId = interaction.values[0];

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!channel || channel.id !== channelId || !client.tempVoiceChannels.has(channel.id)) {
        return interaction.editReply({ content: '❌ Ya no estás en esa sala temporal.' });
    }

    const ownerId = client.tempVoiceChannelOwners.get(channel.id);
    if (ownerId !== interaction.user.id) {
        return interaction.editReply({ content: '❌ Solo el dueño del canal puede usar esta acción.' });
    }

    if (action === 'unban') {
        const blockedOverwrite = channel.permissionOverwrites.cache.get(memberId);
        if (!blockedOverwrite?.deny.has(PermissionsBitField.Flags.Connect)) {
            return interaction.editReply({ content: '❌ Ese usuario ya no está bloqueado en esta sala.' });
        }
        await channel.permissionOverwrites.delete(memberId);
        return interaction.editReply({ content: `🔓 <@${memberId}> ya puede volver a entrar en la sala.` });
    }

    if (action === 'ban' && !interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.editReply({ content: '❌ Necesitas el permiso **Banear miembros** para usar esta acción.' });
    }

    const member = await interaction.guild.members.fetch(memberId).catch(() => null);
    if (!member) return interaction.editReply({ content: '❌ No encontré ese usuario en el servidor.' });

    if (action === 'invite') {
        await channel.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true });
        return interaction.editReply({ content: `✅ ${member} ha sido invitado a la sala.` });
    }

    if (action === 'kick') {
        if (member.voice.channelId !== channel.id) return interaction.editReply({ content: '❌ Ese usuario ya no está en la sala.' });
        await member.voice.setChannel(null, 'Expulsado de sala temporal');
        return interaction.editReply({ content: `👢 ${member} ha sido expulsado de la sala.` });
    }

    if (action === 'ban') {
        if (!member.bannable) {
            return interaction.editReply({ content: '❌ No puedo banear a ese usuario por permisos o jerarquía de roles.' });
        }
        await interaction.guild.members.ban(member.id, { reason: `Baneado desde la interfaz de voz por ${interaction.user.tag}` });
        return interaction.editReply({ content: `🔨 ${member.user.tag} ha sido baneado del servidor.` });
    }

    if (action === 'unban') {
        await channel.permissionOverwrites.delete(member.id);
        return interaction.editReply({ content: `✅ Se quitó el bloqueo de ${member}.` });
    }

    if (action === 'transfer') {
        if (member.voice.channelId !== channel.id) return interaction.editReply({ content: '❌ Ese usuario ya no está en la sala.' });
        await channel.permissionOverwrites.edit(member.id, { Connect: true, Speak: true, ManageChannels: true });
        await channel.permissionOverwrites.edit(ownerId, { ManageChannels: false });
        client.tempVoiceChannelOwners.set(channel.id, member.id);
        return interaction.editReply({ content: `🔁 ${member} ahora es el propietario de la sala.` });
    }

    return interaction.editReply({ content: '❌ Acción de voz no reconocida.' });
}

async function handleGameMenuButtons(interaction) {
    const menus = {
        juegos_azar: ['🎲 Juegos de Azar', '`!dado` - Tira un dado de 6 caras\n`!coinflip` - Lanza una moneda'],
        juegos_interactivos: ['🎯 Juegos Interactivos', '`!trivia` - Responde una pregunta\n`!rps piedra|papel|tijera` - Juega contra CodeCord'],
        juegos_diversion: ['😂 Diversión', '`!8ball [pregunta]` - Consulta la Bola 8\n`!ship @usuario1 @usuario2` - Calcula compatibilidad'],
        juegos_todo: ['🎮 Todos los juegos', '`!dado` · `!coinflip` · `!trivia` · `!rps piedra|papel|tijera` · `!8ball [pregunta]` · `!ship @usuario1 @usuario2`']
    };
    const menu = menus[interaction.customId];
    if (!menu) return;

    const embed = new EmbedBuilder()
        .setTitle(menu[0])
        .setDescription(menu[1])
        .setColor(0xFF6B6B)
        .setFooter({ text: 'Usa /juegos para volver a ver el menú' })
        .setTimestamp();

    await interaction.update({ embeds: [embed] });
}

/**
 * Función auxiliar para crear un canal de ticket.
 */
async function crearTicket(interaction, client, userResponse = null, ticketMeta = {}) {
    try {
        const guild = interaction.guild;
        const member = interaction.member;

        const existingTicket = guild.channels.cache.find(c => c.name === `ticket-${member.user.username.toLowerCase()}`);
        if (existingTicket) {
            return await interaction.reply({ content: `❌ Ya tienes un ticket abierto en ${existingTicket}.`, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const category = await findAvailableTicketCategory(guild);

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

        const categoryName = ticketMeta.categoryName || 'General';
        const questionText = (ticketMeta.question && ticketMeta.question.trim()) || 'No se ha indicado una pregunta.';
        const userAnswer = (userResponse && userResponse.trim()) || 'No se ha proporcionado respuesta.';

        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Abierto')
            .setDescription('Un miembro del staff te atenderá enseguida. Describe tu problema.')
            .setColor(0x5865F2)
            .setTimestamp();

        embed.addFields(
            { name: '📂 Categoría', value: categoryName, inline: false },
            { name: '❓ Pregunta', value: questionText, inline: false },
            { name: '💬 Respuesta', value: userAnswer, inline: false },
            { name: '👤 Solicitante', value: `${member}`, inline: false }
        );

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
        const content = '❌ Error creando el canal de ticket.';
        if (interaction.deferred) {
            await interaction.editReply({ content }).catch(() => {});
        } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
}

/**
 * Busca una categoría de tickets con espacio disponible (menos de 50 canales).
 * Si todas las categorías existentes están llenas, crea una nueva numerada.
 */
async function findAvailableTicketCategory(guild) {
    const MAX_CHANNELS_PER_CATEGORY = 50;
    const ticketCategories = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('ticket'))
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));

    const available = ticketCategories.find(c => c.children.cache.size < MAX_CHANNELS_PER_CATEGORY);
    if (available) return available;

    const existingCount = ticketCategories.size;
    const newName = existingCount === 0 ? '🎫 TICKETS' : `🎫 TICKETS ${existingCount + 1}`;
    return await guild.channels.create({ name: newName, type: ChannelType.GuildCategory });
}

/**
 * Manejador de botones de interfaz de voz.
 */
async function handleVoiceInterfaceButtons(interaction, client) {
    const customId = interaction.customId;
    const channel = interaction.member.voice?.channel;

    if (!channel || !client.tempVoiceChannels.has(channel.id)) {
        return await interaction.reply({ content: '❌ Debes estar en tu canal de voz temporal para usar estos botones.', flags: MessageFlags.Ephemeral });
    }

    const ownerId = client.tempVoiceChannelOwners.get(channel.id);
    const isOwner = ownerId === interaction.user.id;

    if (customId === 'vi_name') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede renombrarlo.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('vi_name_modal').setTitle('Renombrar Canal');
        const input = new TextInputBuilder().setCustomId('vi_name_input').setLabel('Nuevo Nombre').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    if (customId === 'vi_limit') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede cambiar el límite.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('vi_limit_modal').setTitle('Límite de Usuarios');
        const input = new TextInputBuilder().setCustomId('vi_limit_input').setLabel('Límite (0 = ilimitado, máx 99)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    if (customId === 'vi_privacy') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede cambiar la privacidad.', flags: MessageFlags.Ephemeral });
        const isPrivate = channel.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has(PermissionsBitField.Flags.Connect);
        if (isPrivate) {
            await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
            await interaction.reply({ content: '🔓 El canal ahora es público.', flags: MessageFlags.Ephemeral });
        } else {
            await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
            await interaction.reply({ content: '🔒 El canal ahora es privado.', flags: MessageFlags.Ephemeral });
        }
        return;
    }

    if (['vi_invite', 'vi_kick', 'vi_ban', 'vi_unban', 'vi_transfer'].includes(customId)) {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede usar esta acción.', flags: MessageFlags.Ephemeral });
        const members = customId === 'vi_unban'
            ? channel.permissionOverwrites.cache
                .filter(overwrite => overwrite.type === 1 && overwrite.deny.has(PermissionsBitField.Flags.Connect))
                .map(overwrite => interaction.guild.members.cache.get(overwrite.id))
                .filter(Boolean)
            : customId === 'vi_ban'
                ? [...interaction.guild.members.cache.values()].filter(member => !member.user.bot && member.id !== interaction.user.id && member.bannable)
            : customId === 'vi_invite'
                ? [...interaction.guild.members.cache.values()].filter(member => !member.user.bot && member.id !== interaction.user.id && member.voice.channelId !== channel.id)
                : [...channel.members.values()].filter(member => member.id !== interaction.user.id);

        if (members.length === 0) {
            const response = { content: customId === 'vi_unban'
                ? '❌ No hay usuarios bloqueados en esta sala.'
                : customId === 'vi_invite'
                    ? '❌ No hay usuarios disponibles para invitar.'
                    : customId === 'vi_ban'
                        ? '❌ No hay usuarios que pueda banear el bot.'
                    : '❌ No hay otros usuarios en tu sala para seleccionar.' };
            return interaction.reply({ ...response, flags: MessageFlags.Ephemeral });
        }

        const options = members.slice(0, 25).map(member => new StringSelectMenuOptionBuilder()
            .setLabel((member.displayName || member.username).slice(0, 100))
            .setDescription(`${member.user?.tag || member.tag}`.slice(0, 100))
            .setValue(member.id));
        const select = new StringSelectMenuBuilder()
            .setCustomId(`vi_target_${customId.slice(3)}_${channel.id}`)
            .setPlaceholder('Selecciona un usuario')
            .addOptions(options);
        const actionNames = { vi_invite: 'invitar', vi_kick: 'expulsar', vi_ban: 'banear', vi_unban: 'desbloquear', vi_transfer: 'transferir' };
        const response = {
            content: `Selecciona el usuario que quieres ${actionNames[customId] || 'gestionar'}:`,
            components: [new ActionRowBuilder().addComponents(select)],
        };
        return interaction.reply({ ...response, flags: MessageFlags.Ephemeral });
    }

    if (customId === 'vi_info') {
        const owner = interaction.guild.members.cache.get(ownerId);
        const isPrivate = channel.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has(PermissionsBitField.Flags.Connect);
        const embed = new EmbedBuilder()
            .setTitle(`ℹ️ ${channel.name}`)
            .setColor(0x00FFAA)
            .addFields(
                { name: 'Propietario', value: owner ? `${owner}` : `<@${ownerId}>`, inline: true },
                { name: 'Privacidad', value: isPrivate ? '🔒 Privado' : '🔓 Público', inline: true },
                { name: 'Usuarios', value: `${channel.members.size}${channel.userLimit ? `/${channel.userLimit}` : ''}`, inline: true }
            );
        return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (customId === 'vi_delete') {
        if (!isOwner) return interaction.reply({ content: '❌ Solo el dueño del canal puede eliminarlo.', flags: MessageFlags.Ephemeral });
        await interaction.reply({ content: '🗑️ Eliminando canal...', flags: MessageFlags.Ephemeral });
        client.tempVoiceChannels.delete(channel.id);
        client.tempVoiceChannelOwners.delete(channel.id);
        await channel.delete('Eliminado por el dueño');
        return;
    }

    if (customId === 'vi_claim') {
        if (isOwner) return interaction.reply({ content: '👑 Ya eres el propietario del canal.', flags: MessageFlags.Ephemeral });
        const ownerMember = interaction.guild.members.cache.get(ownerId);
        if (ownerMember && ownerMember.voice.channel?.id === channel.id) {
            return interaction.reply({ content: '❌ El propietario actual aún se encuentra en la sala.', flags: MessageFlags.Ephemeral });
        }
        client.tempVoiceChannelOwners.set(channel.id, interaction.user.id);
        await interaction.reply({ content: `👑 ¡Ahora eres el nuevo propietario de la sala <#${channel.id}>!`, flags: MessageFlags.Ephemeral });
        return;
    }
}

/**
 * Manejador de Modales de la interfaz de voz.
 */
async function handleVoiceInterfaceModals(interaction, client) {
    const customId = interaction.customId;
    const channel = interaction.member.voice?.channel;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!channel || !client.tempVoiceChannels.has(channel.id)) {
        return interaction.editReply({ content: '❌ Debes estar en tu canal de voz temporal para usar estos botones.' });
    }

    const ownerId = client.tempVoiceChannelOwners.get(channel.id);
    if (ownerId !== interaction.user.id) {
        return interaction.editReply({ content: '❌ Solo el dueño del canal puede usar esta acción.' });
    }

    if (customId === 'vi_name_modal') {
        const newName = interaction.fields.getTextInputValue('vi_name_input');
        await channel.setName(newName);
        await interaction.editReply({ content: `✅ Canal renombrado a **${newName}**` });
        return;
    }

    if (customId === 'vi_limit_modal') {
        const limitStr = interaction.fields.getTextInputValue('vi_limit_input');
        const limit = parseInt(limitStr);
        if (isNaN(limit) || limit < 0 || limit > 99) {
            return interaction.editReply({ content: '❌ Ingresa un número válido entre 0 y 99.' });
        }
        await channel.setUserLimit(limit);
        await interaction.editReply({ content: `✅ Límite de usuarios establecido en **${limit === 0 ? 'Ilimitado' : limit}**` });
        return;
    }

    if (['vi_invite_modal', 'vi_kick_modal', 'vi_ban_modal', 'vi_unban_modal', 'vi_transfer_modal'].includes(customId)) {
        const rawUserId = interaction.fields.getTextInputValue('vi_user_input').trim();
        const userId = rawUserId.match(/^(?:<@!?|@)?(\d{17,20})>?$/)?.[1];
        if (!userId) {
            return interaction.editReply({ content: '❌ Introduce una mención o un ID de usuario válido.' });
        }

        let member;
        try {
            member = await interaction.guild.members.fetch(userId);
        } catch {
            return interaction.editReply({ content: '❌ No encontré ese usuario en este servidor.' });
        }

        if (customId === 'vi_invite_modal') {
            await channel.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true });
            return interaction.editReply({ content: `✅ ${member} ya puede entrar en la sala.` });
        }

        if (customId === 'vi_kick_modal') {
            if (member.voice.channelId !== channel.id) {
                return interaction.editReply({ content: '❌ Ese usuario no está en tu sala.' });
            }
            await member.voice.setChannel(null, 'Expulsado de sala temporal');
            return interaction.editReply({ content: `👢 ${member} ha sido expulsado de la sala.` });
        }

        if (customId === 'vi_ban_modal') {
            await channel.permissionOverwrites.edit(member.id, { Connect: false });
            if (member.voice.channelId === channel.id) await member.voice.setChannel(null, 'Bloqueado de sala temporal');
            return interaction.editReply({ content: `🚫 ${member} ya no puede entrar en la sala.` });
        }

        if (customId === 'vi_unban_modal') {
            await channel.permissionOverwrites.delete(member.id);
            return interaction.editReply({ content: `✅ Se quitó el bloqueo de ${member}.` });
        }

        if (member.voice.channelId !== channel.id) {
            return interaction.editReply({ content: '❌ El nuevo propietario debe estar en tu sala.' });
        }
        await channel.permissionOverwrites.edit(member.id, { Connect: true, Speak: true, ManageChannels: true });
        await channel.permissionOverwrites.edit(ownerId, { ManageChannels: false });
        client.tempVoiceChannelOwners.set(channel.id, member.id);
        return interaction.editReply({ content: `🔁 ${member} ahora es el propietario de la sala.` });
    }
}

/**
 * Manejador de botones del comando /helpadmin.
 * Replicado desde VERSION-7.0.
 */
async function handleHelpButtons(interaction) {
    const customId = interaction.customId;

    if (customId === 'help_info') {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('ℹ️ Comandos de Información')
            .setDescription('Comandos para obtener información detallada:')
            .addFields(
                { name: '`/userinfo`', value: 'Información completa de un usuario', inline: true },
                { name: '`/channelinfo`', value: 'Información de un canal', inline: true },
                { name: '`/serverrole`', value: 'Información de un rol', inline: true },
                { name: '`/avatar`', value: 'Avatar de un usuario', inline: true },
                { name: '`/serverinfo`', value: 'Información del servidor', inline: true },
                { name: '`/membercount`', value: 'Contador de miembros', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }

    if (customId === 'help_mod') {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🛡️ Comandos de Moderación')
            .setDescription('Comandos para moderar el servidor:')
            .addFields(
                { name: '`/ban`', value: 'Banear a un usuario', inline: true },
                { name: '`/unban`', value: 'Desbanear a un usuario', inline: true },
                { name: '`/kick`', value: 'Expulsar a un usuario', inline: true },
                { name: '`/timeout`', value: 'Aislar temporalmente a un usuario', inline: true },
                { name: '`/warn`', value: 'Advertir a un usuario', inline: true },
                { name: '`/warnings`', value: 'Ver advertencias de un usuario', inline: true },
                { name: '`/baninfo`', value: 'Consultar estado de baneo', inline: true },
                { name: '`/clear`', value: 'Borrar mensajes en masa', inline: true },
                { name: '`/slowmode`', value: 'Modo lento en el canal', inline: true },
                { name: '`/logs`', value: 'Sistema de logs de actividad', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }

    if (customId === 'help_roles') {
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎭 Comandos de Roles')
            .setDescription('Comandos para gestionar roles:')
            .addFields(
                { name: '`/rol`', value: 'Asignar o quitar roles', inline: true },
                { name: '`/colorrole`', value: 'Crear roles de color automático', inline: true },
                { name: '`/stopcolor`', value: 'Detener cambios de color automático', inline: true },
                { name: '`/setroles`', value: 'Configurar roles permitidos para el bot', inline: true },
                { name: '`/nick`', value: 'Cambiar el apodo de un usuario', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }

    if (customId === 'help_voice') {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎙️ Comandos de Salas de Voz')
            .setDescription('Comandos para gestionar salas privadas:')
            .addFields(
                { name: '`/voiceinterface`', value: 'Interfaz de control de sala', inline: true },
                { name: '`/setup`', value: 'Configurar sistema de salas', inline: true },
                { name: '`/createcategory`', value: 'Crear categoría para salas', inline: true },
                { name: '`/rename`', value: 'Renombrar tu sala', inline: true },
                { name: '`/createsupportchannels`', value: 'Crear canales de soporte de voz', inline: true },
                { name: '`/addsupportrole`', value: 'Agregar roles a canales de soporte', inline: true },
                { name: '`/voicesupportnextrole`', value: 'Rol habilitado para !nex', inline: true },
                { name: '`/voicesanctionedrole`', value: 'Rol de sancionado en voz', inline: true },
                { name: '`/sanctionsupport`', value: 'Sancionar usuario en soporte', inline: true },
                { name: '`/sanctionhistory`', value: 'Historial de sanciones de voz', inline: true },
                { name: '`/voiceadmin`', value: 'Panel de administración de voz', inline: true },
                { name: '`!nex` / `!next`', value: 'Atender siguiente usuario en cola', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }

    if (customId === 'help_tickets') {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎫 Comandos de Tickets')
            .setDescription('Comandos para el sistema de tickets:')
            .addFields(
                { name: '`/ticketpanel`', value: 'Crear panel de tickets', inline: true },
                { name: '`/generatehtml`', value: 'Generar HTML de ticket', inline: true },
                { name: '`/ticketstaffrole`', value: 'Configurar rol de staff de tickets', inline: true },
                { name: '`/ticketlogchannel`', value: 'Configurar canal de logs de tickets', inline: true },
                { name: '`/ticketclose`', value: 'Cerrar ticket actual', inline: true },
                { name: '`/staffrole`', value: 'Rol de staff para menciones', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }

    if (customId === 'help_config') {
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('⚙️ Comandos de Configuración')
            .setDescription('Comandos para configurar el bot:')
            .addFields(
                { name: '`/logs`', value: 'Configurar sistema de logs', inline: true },
                { name: '`/staffrole`', value: 'Configurar rol de staff', inline: true },
                { name: '`/setroles`', value: 'Configurar roles permitidos', inline: true },
                { name: '`/voiceadmin`', value: 'Administración de voz', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }

    if (customId === 'help_utils') {
        const embed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('🔧 Comandos de Utilidades')
            .setDescription('Comandos útiles y de entretenimiento:')
            .addFields(
                { name: '`/ping`', value: 'Latencia del bot', inline: true },
                { name: '`/say`', value: 'Enviar mensaje como el bot', inline: true },
                { name: '`/anuncio`', value: 'Crear un anuncio con embed', inline: true },
                { name: '`/enviarmd`', value: 'Enviar mensaje privado a usuario', inline: true },
                { name: '`/poll`', value: 'Crear una encuesta', inline: true },
                { name: '`/sugerencia`', value: 'Enviar sugerencia a la comunidad', inline: true },
                { name: '`/userfolder`', value: 'Exportar lista de miembros', inline: true },
                { name: '`/juegos` / `!juegos`', value: 'Menú de minijuegos', inline: true },
                { name: '`/coinflip`', value: 'Lanzar una moneda', inline: true },
                { name: '`/dado`', value: 'Tirar un dado', inline: true },
                { name: '`/8ball`', value: 'Bola 8 mágica', inline: true },
                { name: '`/rps`', value: 'Piedra, Papel o Tijeras', inline: true },
                { name: '`/trivia`', value: 'Pregunta de trivia', inline: true },
                { name: '`/ship`', value: 'Compatibilidad entre 2 personas', inline: true },
                { name: '`/comandos`', value: 'Lista de comandos (texto)', inline: true },
                { name: '`/helpadmin`', value: 'Este menú interactivo', inline: true }
            )
            .setFooter({ text: 'Usa /helpadmin para volver al menú principal' })
            .setTimestamp();
        await interaction.update({ embeds: [embed] });
        return;
    }
}


/**
 * Manejador de menús de selección.
 */
async function handleSelectMenus(interaction, client) {
    const customId = interaction.customId;

    // Configurar canal de logs desde /logs
    if (customId === 'logs_select_channel') {
        const channelId = interaction.values[0];
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply({ content: '❌ No se pudo encontrar el canal seleccionado.', flags: MessageFlags.Ephemeral });
        }

        client.antiRaid.logChannel.set(interaction.guild.id, channelId);

        let config = configManager.loadGuildConfig(interaction.guild.id, 'logs', {});
        const basicEvents = ['messageDelete', 'messageUpdate', 'guildMemberAdd', 'guildMemberRemove', 'voiceStateUpdate'];
        basicEvents.forEach(ev => {
            if (!config[ev]) {
                config[ev] = { enabled: true, channel: channelId, color: '#5865f2' };
            } else {
                config[ev].channel = channelId;
                config[ev].enabled = true;
            }
        });
        configManager.saveGuildConfig(interaction.guild.id, 'logs', config);

        const embed = new EmbedBuilder()
            .setTitle('✅ Canal de Logs Configurado')
            .setDescription(`Se ha configurado ${channel} como el canal de registros.\n\nEste cambio se ha sincronizado con el **Panel Web**.`)
            .setColor(0x00FF00)
            .setTimestamp();

        return interaction.update({ embeds: [embed], components: [] });
    }

    // Añadir rol de staff
    if (customId === 'staff_add') {
        const roleId = interaction.values[0];
        if (roleId === 'none_add') {
            return interaction.reply({ content: '❌ No hay roles disponibles para añadir.', flags: MessageFlags.Ephemeral });
        }
        let role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        }
        if (!role) {
            return interaction.reply({ content: '❌ El rol no existe.', flags: MessageFlags.Ephemeral });
        }

        const currentRoles = client.commandRoles.get(interaction.guild.id) || [];
        if (currentRoles.includes(roleId)) {
            return interaction.reply({ content: `❌ El rol ${role.name} ya está configurado.`, flags: MessageFlags.Ephemeral });
        }

        currentRoles.push(roleId);
        client.commandRoles.set(interaction.guild.id, currentRoles);

        const staffData = configManager.loadGuildConfig(interaction.guild.id, 'staffroles', {});
        staffData.commandRoles = currentRoles;
        configManager.saveGuildConfig(interaction.guild.id, 'staffroles', staffData);

        const embed = new EmbedBuilder()
            .setTitle('✅ Rol Añadido')
            .setDescription(`El rol **${role.name}** ahora puede usar los comandos de moderación.`)
            .setColor(0x00FF00)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Eliminar rol de staff
    if (customId === 'staff_remove') {
        const roleId = interaction.values[0];
        if (roleId === 'none_remove') {
            return interaction.reply({ content: '❌ No hay roles de staff configurados.', flags: MessageFlags.Ephemeral });
        }
        let role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        }

        let currentRoles = client.commandRoles.get(interaction.guild.id) || [];
        currentRoles = currentRoles.filter(id => id !== roleId);
        client.commandRoles.set(interaction.guild.id, currentRoles);

        const staffData = configManager.loadGuildConfig(interaction.guild.id, 'staffroles', {});
        staffData.commandRoles = currentRoles;
        configManager.saveGuildConfig(interaction.guild.id, 'staffroles', staffData);

        const embed = new EmbedBuilder()
            .setTitle('✅ Rol Eliminado')
            .setDescription(`El rol **${role ? role.name : roleId}** ha sido eliminado de los roles de staff.`)
            .setColor(0xFF0000)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ADMIN: Selección de usuario para gestionar roles
    if (customId === 'admin_select_user_roles') {
        const selectedUserId = interaction.values[0];

        try {
            const targetMember = await interaction.guild.members.fetch(selectedUserId);
            const userRoles = targetMember.roles.cache
                .filter(role => role.id !== interaction.guild.roles.everyone.id)
                .sort((a, b) => b.position - a.position);

            const embed = new EmbedBuilder()
                .setTitle(`🎭 Gestión de Roles - ${targetMember.user.username}`)
                .setDescription(`Selecciona qué acción quieres realizar con los roles de **${targetMember.user.tag}**`)
                .addFields(
                    { name: '✅ Roles Actuales', value: userRoles.size > 0 ? userRoles.map(r => r.name).join(', ') : 'Sin roles', inline: false }
                )
                .setColor(0x5865F2)
                .setThumbnail(targetMember.user.displayAvatarURL());

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`remove_roles_from_${selectedUserId}`)
                    .setLabel('❌ Quitar Roles')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`add_roles_to_${selectedUserId}`)
                    .setLabel('➕ Dar Roles')
                    .setStyle(ButtonStyle.Success)
            );

            return interaction.update({ embeds: [embed], components: [row] });
        } catch (e) {
            console.error('Error gestionando roles de usuario:', e);
            return interaction.reply({ content: 'No pude gestionar los roles. Inténtalo de nuevo.', flags: MessageFlags.Ephemeral });
        }
    }

    // ADMIN: Confirmar QUITAR roles
    if (customId.startsWith('confirm_remove_role_')) {
        const userId = customId.replace('confirm_remove_role_', '');
        const selectedRoleIds = interaction.values;

        try {
            const targetMember = await interaction.guild.members.fetch(userId);
            let removedCount = 0;

            for (const roleId of selectedRoleIds) {
                try {
                    await targetMember.roles.remove(roleId);
                    removedCount++;
                } catch (e) {
                    console.error(`Error quitando rol ${roleId}:`, e);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Roles Quitados')
                .setDescription(`Se quitaron **${removedCount}** roles de **${targetMember.user.tag}**`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.update({ embeds: [embed], components: [] });
        } catch (e) {
            console.error('Error quitando roles:', e);
            return interaction.reply({ content: 'Error al quitar roles.', flags: MessageFlags.Ephemeral });
        }
    }

    // ADMIN: Confirmar DAR roles
    if (customId.startsWith('confirm_add_role_')) {
        const userId = customId.replace('confirm_add_role_', '');
        const selectedRoleIds = interaction.values;

        try {
            await interaction.deferUpdate();

            const targetMember = await interaction.guild.members.fetch(userId);
            let addedCount = 0;
            let errors = [];

            for (const roleId of selectedRoleIds) {
                try {
                    const role = interaction.guild.roles.cache.get(roleId);
                    await targetMember.roles.add(roleId);
                    addedCount++;
                } catch (e) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    errors.push(role?.name || roleId);
                    console.error(`❌ Error dando rol ${role?.name || roleId}:`, e.message);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(addedCount > 0 ? '✅ Roles Asignados' : '❌ Error')
                .setDescription(
                    addedCount > 0
                        ? `Se asignaron **${addedCount}** roles a **${targetMember.user.tag}**`
                        : `No se pudo asignar ningún rol. ${errors.length > 0 ? `Errores: ${errors.join(', ')}` : ''}`
                )
                .setColor(addedCount > 0 ? 0x00FF00 : 0xFF0000)
                .setTimestamp();

            if (errors.length > 0 && addedCount > 0) {
                embed.addFields({ name: '⚠️ Errores', value: `No se pudieron asignar: ${errors.join(', ')}` });
            }

            return interaction.editReply({ embeds: [embed], components: [] });
        } catch (e) {
            console.error('❌ Error general asignando roles:', e);
            return interaction.editReply({ content: `Error: ${e.message}` }).catch(() =>
                interaction.followUp({ content: `Error al asignar roles: ${e.message}`, flags: MessageFlags.Ephemeral })
            );
        }
    }

    await interaction.reply({ content: '✅ Selección procesada correctamente.', flags: MessageFlags.Ephemeral }).catch(() => {});
}

async function handleUnwarSelection(interaction) {
    const [, , targetUserId, moderatorId] = interaction.customId.split('_');
    if (interaction.user.id !== moderatorId) {
        return interaction.reply({ content: '❌ Solo el moderador que abrió este menú puede usarlo.', flags: MessageFlags.Ephemeral });
    }

    const warningIndex = Number(interaction.values[0]);
    const warnings = getSanctionRecords(interaction.guild.id, targetUserId).filter(record => record.type === 'WARN');
    const removedWarning = removeWarning(interaction.guild.id, targetUserId, warningIndex);
    if (!removedWarning || !warnings[warningIndex]) {
        return interaction.update({ content: '❌ Esa advertencia ya no existe o ya fue eliminada.', components: [] });
    }

    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
    let dmSent = false;
    if (targetUser && !targetUser.bot) {
        try {
            await targetUser.send({ embeds: [new EmbedBuilder()
                .setTitle('✅ Se ha retirado una advertencia')
                .setDescription(`Un moderador ha retirado una advertencia de tu historial en **${interaction.guild.name}**.`)
                .addFields({ name: '📄 Advertencia retirada', value: removedWarning.reason || 'Sin razón especificada' }, { name: '🛡️ Moderador', value: interaction.user.tag })
                .setColor(0x2ECC71)
                .setTimestamp()] });
            dmSent = true;
        } catch (error) {
            console.log(`⚠️ [CodeCord /unwar] No se pudo enviar MD a ${targetUserId}: ${error.message}`);
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Advertencia Retirada | CodeCord')
        .addFields(
            { name: '👤 Usuario', value: `<@${targetUserId}>`, inline: true },
            { name: '🛡️ Moderador', value: interaction.user.tag, inline: true },
            { name: '📬 Notificación MD', value: targetUser?.bot ? '🤖 Bot (no recibe MD)' : (dmSent ? '✅ Enviada por MD' : '⚠️ Falló (MD bloqueado/cerrado)'), inline: true },
            { name: '📄 Advertencia retirada', value: removedWarning.reason || 'Sin razón especificada' }
        )
        .setColor(0x2ECC71)
        .setTimestamp();

    await sendLogEmbed(interaction.guild, embed, 'guildMemberUnwarn').catch(() => {});
    return interaction.update({ content: null, embeds: [embed], components: [] });
}

/**
 * Manejador de botones de administración de voz y roles (/voiceadmin, /setup).
 */
async function handleAdminButtons(interaction, client) {
    const customId = interaction.customId;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
    }

    // ADMIN VOZ: Desconectar a todos de los canales de voz
    if (customId === 'admin_disconnect_all') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let disconnectedCount = 0;
            const voiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);

            for (const [, channel] of voiceChannels) {
                for (const [, member] of channel.members) {
                    try {
                        await member.voice.disconnect('Desconectado por administrador');
                        disconnectedCount++;
                    } catch (e) {
                        console.error(`Error desconectando a ${member.user.tag}:`, e);
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Desconexión Masiva Completada')
                .setDescription(`Se han desconectado **${disconnectedCount}** usuarios de todos los canales de voz.`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en desconexión masiva:', error);
            return interaction.editReply({ content: '❌ Error al desconectar usuarios.' });
        }
    }

    // ADMIN VOZ: Borrar todas las salas temporales
    if (customId === 'admin_delete_temp') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let deletedCount = 0;
            const voiceChannels = interaction.guild.channels.cache.filter(
                c => c.type === ChannelType.GuildVoice &&
                    (c.name.includes('Sala de ') || c.name.includes('🔊 Sala') || client.tempVoiceChannels?.has(c.id))
            );

            for (const [, channel] of voiceChannels) {
                try {
                    await channel.delete('Eliminado por administrador');
                    client.tempVoiceChannels?.delete(channel.id);
                    client.tempVoiceChannelOwners?.delete(channel.id);
                    deletedCount++;
                } catch (e) {
                    console.error(`Error eliminando ${channel.name}:`, e);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Salas Temporales Eliminadas')
                .setDescription(`Se han eliminado **${deletedCount}** salas temporales.`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error eliminando salas:', error);
            return interaction.editReply({ content: '❌ Error al eliminar salas temporales.' });
        }
    }

    // ADMIN VOZ: Limpiar todo (desconectar + borrar salas)
    if (customId === 'admin_clean_all') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let disconnectedCount = 0;
            let deletedCount = 0;

            const allVoiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
            for (const [, channel] of allVoiceChannels) {
                for (const [, member] of channel.members) {
                    try {
                        await member.voice.disconnect('Limpieza de voz por administrador');
                        disconnectedCount++;
                    } catch (e) {
                        console.error(`Error desconectando a ${member.user.tag}:`, e);
                    }
                }
            }

            const tempChannels = interaction.guild.channels.cache.filter(
                c => c.type === ChannelType.GuildVoice &&
                    (c.name.includes('Sala de ') || c.name.includes('🔊 Sala'))
            );

            for (const [, channel] of tempChannels) {
                try {
                    await channel.delete('Limpieza de voz por administrador');
                    client.tempVoiceChannels?.delete(channel.id);
                    client.tempVoiceChannelOwners?.delete(channel.id);
                    deletedCount++;
                } catch (e) {
                    console.error(`Error eliminando ${channel.name}:`, e);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Limpieza Total Completada')
                .setDescription(`**${disconnectedCount}** usuarios desconectados\n**${deletedCount}** salas temporales eliminadas`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en limpieza total:', error);
            return interaction.editReply({ content: '❌ Error en la limpieza total.' });
        }
    }

    // ADMIN ROLES: Menú para quitar roles de un usuario específico
    if (customId === 'admin_role_user') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await interaction.guild.members.fetch();

            const allMembers = Array.from(interaction.guild.members.cache.values())
                .filter(m => !m.user.bot)
                .sort((a, b) => a.user.username.localeCompare(b.user.username));

            if (allMembers.length === 0) {
                return interaction.editReply({ content: 'No hay usuarios en el servidor.' });
            }

            const page = 0;
            const membersPerPage = 25;
            const totalPages = Math.ceil(allMembers.length / membersPerPage);
            const members = allMembers.slice(page * membersPerPage, (page + 1) * membersPerPage);

            const options = members.map(member =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(member.user.username)
                    .setDescription(`${member.user.tag} - ${member.roles.cache.size - 1} roles`)
                    .setValue(member.id)
                    .setEmoji('👤')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_select_user_roles')
                .setPlaceholder('Selecciona un usuario de la lista')
                .addOptions(options);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);

            const navigationButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_users_prev_${page}`)
                    .setLabel('◀️ Anterior')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`admin_users_next_${page}`)
                    .setLabel('Siguiente ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('admin_user_by_id')
                    .setLabel('📝 Ingresar ID')
                    .setStyle(ButtonStyle.Secondary)
            );

            const embed = new EmbedBuilder()
                .setTitle('🧑 Gestionar Roles de Usuario')
                .setDescription(`**${allMembers.length}** usuarios en total\nMostrando página **${page + 1}** de **${totalPages}**\n\n🔍 Selecciona un usuario o ingresa su ID manualmente`)
                .setColor(0x5865F2)
                .setFooter({ text: `Usuarios ${page * membersPerPage + 1}-${Math.min((page + 1) * membersPerPage, allMembers.length)} de ${allMembers.length}` });

            return interaction.editReply({ embeds: [embed], components: [row1, navigationButtons] });
        } catch (error) {
            console.error('Error obteniendo miembros:', error);
            return interaction.editReply({ content: '❌ Error al obtener la lista de usuarios.' });
        }
    }

    // ADMIN STATS: Mostrar estadísticas del servidor
    if (customId === 'admin_stats') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guild = interaction.guild;
            const members = await guild.members.fetch();
            const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
            const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
            const tempChannels = voiceChannels.filter(c => c.name.includes('Sala de ') || c.name.includes('🔊 Sala'));

            let usersInVoice = 0;
            voiceChannels.forEach(channel => {
                usersInVoice += channel.members.size;
            });

            const embed = new EmbedBuilder()
                .setTitle(`📊 Estadísticas de ${guild.name}`)
                .setThumbnail(guild.iconURL())
                .addFields(
                    { name: '👥 Miembros', value: `Total: **${members.size}**\nHumanos: **${members.filter(m => !m.user.bot).size}**\nBots: **${members.filter(m => m.user.bot).size}**`, inline: true },
                    { name: '🔊 Canales de Voz', value: `Total: **${voiceChannels.size}**\nUsuarios en voz: **${usersInVoice}**\nSalas temporales: **${tempChannels.size}**`, inline: true },
                    { name: '💬 Canales de Texto', value: `**${textChannels.size}** canales`, inline: true },
                    { name: '🎭 Roles', value: `**${guild.roles.cache.size}** roles`, inline: true },
                    { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true }
                )
                .setColor(0x5865F2)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return interaction.editReply({ content: '❌ Error al obtener estadísticas.' });
        }
    }

    // ADMIN - Navegación de páginas de usuarios (ANTERIOR/SIGUIENTE)
    if (customId.startsWith('admin_users_prev_') || customId.startsWith('admin_users_next_')) {
        const isNext = customId.startsWith('admin_users_next_');
        const currentPage = parseInt(customId.split('_').pop());

        await interaction.deferUpdate();

        try {
            await interaction.guild.members.fetch();
            const allMembers = Array.from(interaction.guild.members.cache.values())
                .filter(m => !m.user.bot)
                .sort((a, b) => a.user.username.localeCompare(b.user.username));

            const membersPerPage = 25;
            const totalPages = Math.ceil(allMembers.length / membersPerPage);
            const newPage = isNext ? Math.min(totalPages - 1, currentPage + 1) : Math.max(0, currentPage - 1);
            const members = allMembers.slice(newPage * membersPerPage, (newPage + 1) * membersPerPage);

            const options = members.map(member =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(member.user.username)
                    .setDescription(`${member.user.tag} - ${member.roles.cache.size - 1} roles`)
                    .setValue(member.id)
                    .setEmoji('👤')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_select_user_roles')
                .setPlaceholder('Selecciona un usuario de la lista')
                .addOptions(options);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);

            const navigationButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_users_prev_${newPage}`)
                    .setLabel('◀️ Anterior')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(newPage === 0),
                new ButtonBuilder()
                    .setCustomId(`admin_users_next_${newPage}`)
                    .setLabel('Siguiente ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(newPage >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('admin_user_by_id')
                    .setLabel('📝 Ingresar ID')
                    .setStyle(ButtonStyle.Secondary)
            );

            const embed = new EmbedBuilder()
                .setTitle('🧑 Gestionar Roles de Usuario')
                .setDescription(`**${allMembers.length}** usuarios en total\nMostrando página **${newPage + 1}** de **${totalPages}**\n\n🔍 Selecciona un usuario o ingresa su ID manualmente`)
                .setColor(0x5865F2)
                .setFooter({ text: `Usuarios ${newPage * membersPerPage + 1}-${Math.min((newPage + 1) * membersPerPage, allMembers.length)} de ${allMembers.length}` });

            return interaction.editReply({ embeds: [embed], components: [row1, navigationButtons] });
        } catch (error) {
            console.error('Error en navegación:', error);
            return interaction.editReply({ content: '❌ Error al cambiar de página.' });
        }
    }

    // ADMIN - Ingresar ID manualmente
    if (customId === 'admin_user_by_id') {
        const modal = new ModalBuilder()
            .setCustomId('admin_user_id_modal')
            .setTitle('Ingresar ID de Usuario');

        const input = new TextInputBuilder()
            .setCustomId('user_id_input')
            .setLabel('ID del Usuario')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('123456789012345678')
            .setMinLength(17)
            .setMaxLength(20);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        return interaction.showModal(modal);
    }

    // ADMIN - Mostrar menú para QUITAR roles específicos (BOTÓN)
    if (customId.startsWith('remove_roles_from_')) {
        const userId = customId.replace('remove_roles_from_', '');

        try {
            const targetMember = await interaction.guild.members.fetch(userId);
            const userRoles = targetMember.roles.cache
                .filter(role =>
                    role.id !== interaction.guild.roles.everyone.id &&
                    role.position < interaction.guild.members.me.roles.highest.position
                )
                .sort((a, b) => b.position - a.position);

            if (userRoles.size === 0) {
                return interaction.update({ content: `${targetMember.user.tag} no tiene roles que pueda quitar.`, components: [] });
            }

            const options = userRoles.map(role =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(role.name)
                    .setDescription(`Posición: ${role.position}`)
                    .setValue(role.id)
                    .setEmoji('🎭')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`confirm_remove_role_${userId}`)
                .setPlaceholder('Selecciona los roles a QUITAR')
                .setMinValues(1)
                .setMaxValues(Math.min(userRoles.size, 25))
                .addOptions(options.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle(`❌ Quitar Roles de ${targetMember.user.username}`)
                .setDescription('Selecciona uno o varios roles para quitar')
                .setColor(0xFF0000);

            return interaction.update({ embeds: [embed], components: [row] });
        } catch (e) {
            console.error('Error mostrando roles para quitar:', e);
            return interaction.reply({ content: 'Error al cargar roles.', flags: MessageFlags.Ephemeral });
        }
    }

    // ADMIN - Mostrar menú para DAR roles específicos (BOTÓN)
    if (customId.startsWith('add_roles_to_')) {
        const userId = customId.replace('add_roles_to_', '');

        try {
            const targetMember = await interaction.guild.members.fetch(userId);
            const allRoles = interaction.guild.roles.cache
                .filter(role =>
                    role.id !== interaction.guild.roles.everyone.id &&
                    !targetMember.roles.cache.has(role.id) &&
                    role.position < interaction.guild.members.me.roles.highest.position
                )
                .sort((a, b) => b.position - a.position);

            if (allRoles.size === 0) {
                return interaction.update({ content: `${targetMember.user.tag} ya tiene todos los roles disponibles.`, components: [] });
            }

            const options = allRoles.map(role =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(role.name)
                    .setDescription(`Posición: ${role.position}`)
                    .setValue(role.id)
                    .setEmoji('✨')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`confirm_add_role_${userId}`)
                .setPlaceholder('Selecciona los roles a DAR')
                .setMinValues(1)
                .setMaxValues(Math.min(allRoles.size, 25))
                .addOptions(options.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle(`➕ Dar Roles a ${targetMember.user.username}`)
                .setDescription('Selecciona uno o varios roles para asignar')
                .setColor(0x00FF00);

            return interaction.update({ embeds: [embed], components: [row] });
        } catch (e) {
            console.error('Error mostrando roles para dar:', e);
            return interaction.reply({ content: 'Error al cargar roles.', flags: MessageFlags.Ephemeral });
        }
    }
}

/**
 * Manejador del modal para ingresar ID de usuario manualmente.
 */
async function handleAdminUserIdModal(interaction, client) {
    const userId = interaction.fields.getTextInputValue('user_id_input').trim();

    try {
        const targetMember = await interaction.guild.members.fetch(userId);
        const userRoles = targetMember.roles.cache
            .filter(role => role.id !== interaction.guild.roles.everyone.id)
            .sort((a, b) => b.position - a.position);

        const embed = new EmbedBuilder()
            .setTitle(`🎭 Gestión de Roles - ${targetMember.user.username}`)
            .setDescription(`Selecciona qué acción quieres realizar con los roles de **${targetMember.user.tag}**`)
            .addFields(
                { name: '✅ Roles Actuales', value: userRoles.size > 0 ? userRoles.map(r => r.name).join(', ') : 'Sin roles', inline: false }
            )
            .setColor(0x5865F2)
            .setThumbnail(targetMember.user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`remove_roles_from_${userId}`)
                .setLabel('❌ Quitar Roles')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`add_roles_to_${userId}`)
                .setLabel('➕ Dar Roles')
                .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    } catch (e) {
        console.error('Error buscando usuario por ID:', e);
        return interaction.reply({ content: `❌ No se encontró ningún usuario con el ID: ${userId}\n\nAsegúrate de copiar el ID correctamente.`, flags: MessageFlags.Ephemeral });
    }
}
