require('dotenv').config();
const { SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

const fs = require('fs');
const path = require('path');

// Asegurar valores limpios
const DEPLOY_CLIENT_ID = (process.env.CLIENT_ID || '').toString().trim();

const envGuilds = [
  process.env.GUILD_ID_1?.toString().trim(),
  process.env.GUILD_ID_2?.toString().trim(),
  process.env.GUILD_ID_3?.toString().trim(),
  process.env.GUILD_ID?.toString().trim()
].filter(Boolean);

const GUILD_IDS = [...new Set(envGuilds)];


const commands = [
  new SlashCommandBuilder()
    .setName('voiceinterface')
    .setDescription('Interfaz para gestionar canales de voz temporales')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura la estructura completa de salas privadas (solo administradores)')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('createcategory')
    .setDescription('Crea la categoría "🍺 Salas privadas" con subcanales (solo administradores)')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('userfolder')
    .setDescription('Genera un archivo TXT con la lista de usuarios del servidor (solo administradores)')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Publica el panel para abrir tickets (solo moderadores)')
    .addStringOption(opt => opt.setName('pregunta3').setDescription('Pregunta del formulario para el botón 3 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton4').setDescription('Etiqueta del botón 4').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta4').setDescription('Pregunta del formulario para el botón 4 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton5').setDescription('Etiqueta del botón 5').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta5').setDescription('Pregunta del formulario para el botón 5 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('mensaje').setDescription('Mensaje que se mostrará en el panel de tickets').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ticketstaffrole')
    .setDescription('Configurar el rol de staff que puede ver y atender tickets')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol de staff para tickets').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ticketlogchannel')
    .setDescription('Configurar el canal de logs para tickets')
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal de texto para logs de tickets').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ticketclose')
    .setDescription('Cerrar el ticket actual desde slash command')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banear a un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del baneo').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanear a un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a desbanear').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del desbaneo').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('baninfo')
    .setDescription('Ver si un usuario fue baneado o expulsado')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    .addStringOption(opt => opt.setName('id').setDescription('ID del usuario si no está en el servidor').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Renombrar tu sala de voz actual')
    .addStringOption(opt => opt.setName('nombre').setDescription('Nuevo nombre de la sala').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Cambiar el apodo de un usuario del servidor')
    .addStringOption(opt => opt.setName('nuevo_nick').setDescription('Nuevo apodo').setRequired(true))
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario cuyo apodo cambiar').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('staffrole')
    .setDescription('Configurar rol de staff para mencionar en tickets')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol de staff').setRequired(true))
    .toJSON(),
  // Comandos de soporte de voz
  new SlashCommandBuilder()
    .setName('createsupportchannels')
    .setDescription('Crea los canales de soporte de voz y configura los roles de staff (solo administradores)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol principal de staff (obligatorio)').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol4').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol5').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('addsupportrole')
    .setDescription('Agregar roles adicionales a canales de soporte existentes')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addRoleOption(opt => opt.setName('rol').setDescription('Primer rol a agregar (obligatorio)').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Segundo rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Tercer rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol4').setDescription('Cuarto rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol5').setDescription('Quinto rol a agregar (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voicesupportnextrole')
    .setDescription('Configurar rol que puede usar el comando !nex')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol que puede usar !nex').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voicesanctionedrole')
    .setDescription('Configurar rol de sancionado que será movido automáticamente a soporte-1')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol de sancionado').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('sanctionsupport')
    .setDescription('Sancionar un usuario de soporte de voz')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo de la sanción').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('sanctionhistory')
    .setDescription('Ver historial de sanciones de soporte de voz')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario para ver historial').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voiceadmin')
    .setDescription('Panel de administración de voz - Gestionar todos los canales de voz del servidor')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Sistema de logs - Registra todo lo que pasa en el servidor')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .toJSON(),
  // Comandos de música removidos
  // Comandos de roles de color
  new SlashCommandBuilder()
    .setName('colorrole')
    .setDescription('Hace que un rol existente cambie de color automáticamente')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol que cambiará de color').setRequired(true))
    .addIntegerOption(opt => opt.setName('velocidad').setDescription('Velocidad en segundos (1-60)').setRequired(false).setMinValue(1).setMaxValue(60))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('stopcolor')
    .setDescription('Detiene el cambio automático de colores del rol')
    .toJSON(),
  // Comando de roles
  new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Asigna o quita un rol a un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario al que dar/quitar el rol').setRequired(true))
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol a asignar/quitar').setRequired(true))
    .toJSON(),
  // Comandos de configuración de roles
  new SlashCommandBuilder()
    .setName('setroles')
    .setDescription('Configurar roles permitidos para usar comandos del bot')
    .addRoleOption(opt => opt.setName('rol1').setDescription('Primer rol permitido').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Segundo rol permitido').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Tercer rol permitido').setRequired(false))
    .toJSON(),
  // Comando de avatar
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Muestra el avatar de un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del que quieres ver el avatar').setRequired(false))
    .toJSON(),
  // Comando de información de usuario
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Muestra información detallada sobre un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del cual mostrar información').setRequired(false))
    .toJSON(),
  // Comando de información de canal
  new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Muestra información detallada sobre un canal')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal del cual mostrar información').setRequired(false))
    .toJSON(),
  // Comando de información de rol
  new SlashCommandBuilder()
    .setName('serverrole')
    .setDescription('Muestra información detallada sobre un rol')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol del cual mostrar información').setRequired(false))
    .toJSON(),
  // Comando de ayuda/comandos
  new SlashCommandBuilder()
    .setName('comandos')
    .setDescription('Muestra todos los comandos disponibles del bot')
    .toJSON(),
  // Comando de ayuda con botones
  new SlashCommandBuilder()
    .setName('helpadmin')
    .setDescription('Menú interactivo con botones de todos los comandos')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .toJSON(),
  // Comando para enviar MD personalizado
  new SlashCommandBuilder()
    .setName('enviarmd')
    .setDescription('Envía un mensaje directo personalizado con embed a un usuario (por mención o ID)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addStringOption(opt => opt.setName('titulo').setDescription('Título del mensaje').setRequired(true))
    .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción/contenido del mensaje').setRequired(true))
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario que recibirá el MD (mención)').setRequired(false))
    .addStringOption(opt => opt.setName('id').setDescription('ID del usuario (si no está en el servidor)').setRequired(false))
    .addStringOption(opt => opt.setName('subtitulo').setDescription('Subtítulo o información adicional (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('color').setDescription('Color HEX del embed (ej: #00FF00, #FF0000)').setRequired(false))
    .addStringOption(opt => opt.setName('imagen').setDescription('URL de imagen a incluir (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('footer').setDescription('Texto del footer (opcional)').setRequired(false))
    .toJSON(),
  // COMANDOS DE MODERACIÓN
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar a un usuario del servidor')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Aislar temporalmente a un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a aislar').setRequired(true))
    .addIntegerOption(opt => opt.setName('duracion').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del aislamiento').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Borrar mensajes en el canal')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de mensajes a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advertir a un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón de la advertencia').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unwar')
    .setDescription('Elige y retira una advertencia de un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario al que retirar la advertencia').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Ver las advertencias de un usuario')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del que ver advertencias').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Activar o desactivar el modo lento en un canal')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addIntegerOption(opt => opt.setName('segundos').setDescription('Segundos entre mensajes (0 para desactivar)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('generatehtml')
    .setDescription('Genera manualmente la transcripción HTML del canal actual (solo staff)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('nex')
    .setDescription('Mueve al siguiente usuario en la cola de soporte de voz')
    .toJSON(),
  // COMANDOS DE COMUNICACIÓN
  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Crear un anuncio con embed')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addStringOption(opt => opt.setName('titulo').setDescription('Título del anuncio').setRequired(true))
    .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del anuncio').setRequired(true))
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal donde enviar el anuncio').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Color HEX del embed (ej: #FF0000)').setRequired(false))
    .addStringOption(opt => opt.setName('imagen').setDescription('URL de imagen a incluir').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crear una encuesta')
    .addStringOption(opt => opt.setName('pregunta').setDescription('Pregunta de la encuesta').setRequired(true))
    .addStringOption(opt => opt.setName('opciones').setDescription('Opciones separadas por comas (ej: Opción 1, Opción 2)').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Hacer que el bot diga algo')
    .addStringOption(opt => opt.setName('mensaje').setDescription('Mensaje a enviar').setRequired(true))
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal donde enviar (opcional)').setRequired(false))
    .toJSON(),
  // COMANDOS DE INFORMACIÓN
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ver la latencia del bot')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Ver información del servidor')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Ver el contador de miembros del servidor')
    .toJSON(),
  // COMANDOS DE DIVERSIÓN (Solo /trivia y /ship - Los demás usan !)
  new SlashCommandBuilder()
    .setName('juegos')
    .setDescription('Abre el menú interactivo de mini-juegos de CodeCord')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('sugerencia')
    .setDescription('Enviar una sugerencia a la comunidad')
    .addStringOption(opt => opt.setName('texto').setDescription('Tu sugerencia').setRequired(true))
    .toJSON(),
].filter(command => command.name !== 'automod');


const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`🚀 [CodeCord Deploy] Registrando ${commands.length} comandos Slash en Discord API...`);

    for (const guildId of GUILD_IDS) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(DEPLOY_CLIENT_ID, guildId),
          { body: [] }
        );
        console.log(`🧹 Comandos antiguos eliminados del servidor: ${guildId}`);
      } catch (error) {
        if (error.code === 50001 || error.code === 10004) {
          console.warn(`⚠️ No se pudo limpiar el servidor ${guildId}; se continúa con el despliegue global.`);
          continue;
        }
        throw error;
      }
    }

    await rest.put(
      Routes.applicationCommands(DEPLOY_CLIENT_ID),
      { body: commands }
    );
    console.log(`✅ ${commands.length} comandos Slash registrados globalmente.`);
    console.log('ℹ️ Discord puede tardar hasta una hora en mostrar los cambios globales.');
  } catch (error) {
    console.error('❌ Error registrando comandos Slash:', error);
  }
})();