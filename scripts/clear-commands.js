require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🗑️ Limpiando todos los comandos registrados...');
    
    // Limpiar comandos del servidor específico
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] }
    );
    
    console.log('✅ Todos los comandos del servidor han sido eliminados.');
    
    // Limpiar comandos globales si existen
    try {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [] }
      );
      console.log('✅ Todos los comandos globales han sido eliminados.');
    } catch (err) {
      console.log('⚠️ No había comandos globales para eliminar.');
    }
    
    console.log('\n🔄 Ahora ejecuta: node deploy-commands.js');
    console.log('Para registrar los comandos nuevamente sin duplicados.');
    
  } catch (error) {
    console.error('❌ Error limpiando comandos:', error);
  }
})();


















