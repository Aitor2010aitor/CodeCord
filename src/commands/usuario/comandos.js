// Archivo: src/commands/usuario/comandos.js

/**
 * @file comandos.js
 * @description Comando /comandos para mostrar la lista de comandos disponibles del bot.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'comandos',
    description: 'Muestra la lista de comandos disponibles del bot',
    /**
     * Ejecuta el comando comandos.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Comandos del Bot')
            .setDescription('Aquí tienes todos los comandos disponibles del bot. Usa `/helpadmin` para un menú interactivo con botones.')
            .addFields(
                {
                    name: '👤 Información',
                    value: '`/userinfo` - Información de usuarios\n`/channelinfo` - Información de canales\n`/serverrole` - Información de roles\n`/serverinfo` - Información del servidor\n`/membercount` - Contador de miembros\n`/avatar` - Avatar de usuarios',
                    inline: false
                },
                {
                    name: '🛡️ Moderación',
                    value: '`/ban` - Banear usuarios\n`/baninfo` - Ver ban/expulsión de un usuario\n`/kick` - Expulsar usuarios\n`/timeout` - Silenciar usuarios\n`/unban` - Desbanear usuarios\n`/clear` - Eliminar mensajes\n`/warn` - Advertir usuario\n`/warnings` - Ver advertencias\n`/slowmode` - Modo lento\n`/automod` - Moderación automática',
                    inline: false
                },
                {
                    name: '🎭 Roles y Colores',
                    value: '`/rol` - Asignar/quitar roles\n`/colorrole` - Roles de color automático\n`/stopcolor` - Detener colores automáticos\n`/setroles` - Configurar roles permitidos\n`/staffrole` - Configurar rol staff\n`/nick` - Cambiar apodo de un usuario',
                    inline: false
                },
                {
                    name: '🏠 Salas Privadas',
                    value: '`/voiceinterface` - Interfaz de salas\n`/setup` - Configurar salas\n`/createcategory` - Crear categoría\n`/rename` - Renombrar sala',
                    inline: false
                },
                {
                    name: '🎫 Tickets',
                    value: '`/ticketpanel` - Panel de tickets\n`/ticketstaffrole` - Configurar rol de staff para tickets\n`/ticketlogchannel` - Canal de logs de tickets\n`/ticketclose` - Cerrar ticket actual',
                    inline: false
                },
                {
                    name: '🎧 Soporte de Voz',
                    value: '`/createsupportchannels` - Crear canales soporte\n`/addsupportrole` - Agregar roles soporte\n`/voicesupportnextrole` - Rol para !nex\n`/voicesanctionedrole` - Rol sancionado\n`/sanctionsupport` - Sancionar usuario\n`/sanctionhistory` - Ver historial de sanciones',
                    inline: false
                },
                {
                    name: '📋 Logs y Configuración',
                    value: '`/logs` - Configurar logs\n`/voiceadmin` - Administración de voz\n`/say` - Enviar mensaje como el bot\n`/anuncio` - Crear anuncio\n`/poll` - Crear encuesta',
                    inline: false
                },
                {
                    name: '🧪 Utilidades y Diversión',
                    value: '`/comandos` - Este menú de ayuda\n`/helpadmin` - Menú con botones\n`/ship` - Compatibilidad entre 2 personas\n`/trivia` - Pregunta de trivia\n`/ping` - Latencia del bot',
                    inline: false
                }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};