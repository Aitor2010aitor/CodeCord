require('dotenv').config({ path: '.env' });
const { SlashCommandBuilder, REST, Routes } = require('discord.js');

const commands = [
  // Comandos básicos para todos los usuarios
  new SlashCommandBuilder()
    .setName('comandos')
    .setDescription('Muestra todos los comandos disponibles del bot')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('helpadmin')
    .setDescription('Menú interactivo con botones de todos los comandos')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Muestra el avatar de un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del que quieres ver el avatar').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Muestra información detallada sobre un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario del cual mostrar información').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Muestra información detallada sobre un canal')
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal del cual mostrar información').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('serverrole')
    .setDescription('Muestra información detallada sobre un rol')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol del cual mostrar información').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Renombrar tu sala de voz actual')
    .addStringOption(opt => opt.setName('nombre').setDescription('Nuevo nombre de la sala').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voiceinterface')
    .setDescription('Interfaz para gestionar canales de voz temporales')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Sistema de logs - Registra todo lo que pasa en el servidor')
    .toJSON(),
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
  new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Asigna o quita un rol a un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario al que dar/quitar el rol').setRequired(true))
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol a asignar/quitar').setRequired(true))
    .toJSON(),
  // Comandos de moderación (solo para moderadores)
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
  // Comandos de administración (solo para administradores)
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
    .addStringOption(opt => opt.setName('boton2').setDescription('Segundo botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton3').setDescription('Tercer botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton4').setDescription('Cuarto botón (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('boton5').setDescription('Quinto botón (opcional)').setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('staffrole')
    .setDescription('Configurar rol de staff para mencionar en tickets')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol de staff').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('voiceadmin')
    .setDescription('Panel de administración de voz - Gestionar todos los canales de voz del servidor')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setroles')
    .setDescription('Configurar roles permitidos para usar comandos del bot')
    .addRoleOption(opt => opt.setName('rol1').setDescription('Primer rol permitido').setRequired(true))
    .addRoleOption(opt => opt.setName('rol2').setDescription('Segundo rol permitido').setRequired(false))
    .addRoleOption(opt => opt.setName('rol3').setDescription('Tercer rol permitido').setRequired(false))
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
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registrando comandos slash para todos los usuarios...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Comandos registrados correctamente para todos los usuarios.');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
})();
