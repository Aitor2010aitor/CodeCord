require('dotenv').config();
const { SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

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
    .setName('setup')
    .setDescription('Configura la estructura completa de salas privadas (solo administradores)')

    .toJSON(),
  new SlashCommandBuilder()
    .setName('createcategory')
    .setDescription('Crea la categoría "🍺 Salas privadas" con subcanales (solo administradores)')

    .toJSON(),
  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Publica el panel para abrir tickets (solo moderadores)')
    .addStringOption(opt => opt.setName('boton1').setDescription('Formato: nombre|pregunta (ej: Crear Ticket|¿Tipo de problema?)').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta1').setDescription('Pregunta para el botón 1 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton2').setDescription('Segundo botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta2').setDescription('Pregunta para el botón 2 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton3').setDescription('Tercer botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta3').setDescription('Pregunta para el botón 3 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton4').setDescription('Cuarto botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta4').setDescription('Pregunta para el botón 4 (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton5').setDescription('Quinto botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('pregunta5').setDescription('Pregunta para el botón 5 (opcional)').setRequired(false))
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

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del baneo').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanear a un usuario')

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a desbanear').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del desbaneo').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Renombrar tu sala de voz actual')

    .toJSON(),
  new SlashCommandBuilder()
    .setName('staffrole')
    .setDescription('Gestionar roles de staff (ver, añadir, eliminar)')
    .toJSON(),
  // Comandos de soporte de voz
  new SlashCommandBuilder()
    .setName('createsupportchannels')
    .setDescription('Crea los canales de soporte de voz y configura los roles de staff (solo administradores)')

    .addRoleOption(opt => opt.setName('rol').setDescription('Rol principal de staff (obligatorio)').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol4').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol5').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('addsupportrole')
    .setDescription('Agregar roles adicionales a canales de soporte existentes')

    .addRoleOption(opt => opt.setName('rol').setDescription('Primer rol a agregar (obligatorio)').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Segundo rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Tercer rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol4').setDescription('Cuarto rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol5').setDescription('Quinto rol a agregar (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voicesupportnextrole')
    .setDescription('Configurar rol que puede usar el comando !nex')

    .addRoleOption(opt => opt.setName('rol').setDescription('Rol que puede usar !nex').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voicesanctionedrole')
    .setDescription('Configurar rol de sancionado que será movido automáticamente a soporte-1')

    .addRoleOption(opt => opt.setName('rol').setDescription('Rol de sancionado').setRequired(true))
    .toJSON(),
  // Comandos de soporte de voz
  new SlashCommandBuilder()
    .setName('createsupportchannels')
    .setDescription('Crea los canales de soporte de voz y configura los roles de staff (solo administradores)')

    .addRoleOption(opt => opt.setName('rol').setDescription('Rol principal de staff (obligatorio)').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol4').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol5').setDescription('Rol adicional de staff (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('addsupportrole')
    .setDescription('Agregar roles adicionales a canales de soporte existentes')

    .addRoleOption(opt => opt.setName('rol').setDescription('Primer rol a agregar (obligatorio)').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Segundo rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Tercer rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol4').setDescription('Cuarto rol a agregar (opcional)').setRequired(false))
    .addRoleOption(opt => opt.setName('rol5').setDescription('Quinto rol a agregar (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voicesupportnextrole')
    .setDescription('Configurar rol que puede usar el comando !nex')

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

    .toJSON(),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Sistema de logs - Registra todo lo que pasa en el servidor')

    .toJSON(),
  // Comandos de música removidos
  // Comandos de roles de color
  new SlashCommandBuilder()
    .setName('colorrole')
    .setDescription('Hace que un rol existente cambie de color automáticamente')

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

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del cual mostrar información').setRequired(false))
    .toJSON(),
  // Comando de información de canal
  new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Muestra información detallada sobre un canal')

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

    .toJSON(),
  // Comando para enviar MD personalizado
  new SlashCommandBuilder()
    .setName('enviarmd')
    .setDescription('Envía un mensaje directo personalizado con embed a un usuario (por mención o ID)')

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

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Aislar temporalmente a un usuario')

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a aislar').setRequired(true))
    .addIntegerOption(opt => opt.setName('duracion').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del aislamiento').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Borrar mensajes en el canal')

    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de mensajes a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advertir a un usuario')

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a adverti').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón de la advertencia').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Ver las advertencias de un usuario')

    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del que ver advertencias').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Activar o desactivar el modo lento en un canal')

    .addIntegerOption(opt => opt.setName('segundos').setDescription('Segundos entre mensajes (0 para desactivar)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .toJSON(),
  // COMANDOS DE COMUNICACIÓN
  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Crear un anuncio con embed')

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
    .setName('ship')
    .setDescription('Calcula la compatibilidad entre dos personas')
    .addUserOption(opt => opt.setName('persona1').setDescription('Primera persona').setRequired(true))
    .addUserOption(opt => opt.setName('persona2').setDescription('Segunda persona').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Responde una pregunta de trivia')
    .addStringOption(opt => opt.setName('categoria')
      .setDescription('Categoría de la pregunta')
      .setRequired(false)
      .addChoices(
        { name: '🌍 Geografía', value: 'geografia' },
        { name: '📚 Historia', value: 'historia' },
        { name: '🔬 Ciencia', value: 'ciencia' },
        { name: '🎮 Videojuegos', value: 'videojuegos' },
        { name: '🎬 Cine y TV', value: 'cine' },
        { name: '🎵 Música', value: 'musica' },
        { name: '⚽ Deportes', value: 'deportes' },
        { name: '🎲 Random', value: 'random' }
      ))
    .toJSON(),
  // Comando para crear la carpeta con la lista de usuarios (slash)
  new SlashCommandBuilder()
    .setName('userfolder')
    .setDescription('Crea carpeta "user folder" y guarda un TXT con usuarios e IDs (solo administradores)')

    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registrando comandos slash...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Comandos registrados correctamente.');
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
})();
