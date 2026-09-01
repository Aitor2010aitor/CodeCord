# 🏗️ Arquitectura y estructura del proyecto

## Estructura de carpetas

```
CodeCord/
├── index.js                  # Punto de entrada: carga dotenv y require('./src/index.js')
├── package.json              # Dependencias y scripts (start, deploy)
├── .env / .env.example       # Credenciales y configuración
├── src/
│   ├── index.js              # Cliente de discord.js: intents, colecciones, lock, login
│   ├── server.js             # Puente hacia el panel web (initWebServer)
│   ├── handlers/
│   │   ├── commandHandler.js # Carga recursiva de comandos
│   │   └── eventHandler.js   # Carga automática de eventos
│   ├── commands/
│   │   ├── usuario/          # 19 comandos de usuario
│   │   └── administradores/  # 38 comandos de administración
│   ├── events/               # ready, messageCreate, interactionCreate, logEvents...
│   └── systems/              # Anti-raid, tickets, voz, logs, bienvenidas...
├── WEB/
│   ├── admin-panel.js        # Servidor Express + API del panel
│   └── admin.html            # Interfaz (SPA de un solo fichero)
├── scripts/
│   ├── deploy-commands*.js   # Registro de slash commands
│   ├── clear-commands.js     # Borrado de comandos
│   ├── config-manager.js     # Persistencia por servidor
│   ├── antiraid.js           # Anti-Raid V2
│   └── welcome-card.js       # Tarjetas de bienvenida (Jimp)
├── servidores/               # Configuración y datos por servidor
├── config/                   # Configuración global del panel y backups heredados
└── data/                     # Actividad del bot y sesiones
```

## Flujo de arranque

1. `index.js` carga `dotenv` y requiere `src/index.js`.
2. `src/index.js`:
   * registra manejadores globales de `uncaughtException` / `unhandledRejection`;
   * aplica el **bloqueo de instancia única** con `bot.lock`;
   * crea el `Client` con todos los intents y partials;
   * inicializa las colecciones en memoria (`commands`, salas temporales, cola de soporte, anti-raid…);
   * llama a `initAntiRaid(client)`, `loadCommands(client)` y `loadEvents(client)`;
   * hace `client.login(BOT_TOKEN)`.
3. El evento `ready` (`src/events/ready.js`):
   * inicializa `configManager` y migra configuraciones antiguas;
   * arranca el panel web (`initWebServer` → `startAdminPanel`);
   * carga la configuración de staff y del canal de logs;
   * restaura la rotación de colores de roles.

## Handlers

**`commandHandler.js`** recorre `src/commands/` de forma **recursiva**, limpia la caché de `require` y registra en `client.commands` todo módulo que exporte un `name` (o `data.name`) y una función `execute`. Los ficheros que no cumplen se avisan por consola y se ignoran.

**`eventHandler.js`** recorre `src/events/`, acepta tanto un objeto como un **array de eventos** por fichero (así `logEvents.js` registra muchos listeners de golpe) y usa `client.once` cuando el evento declara `once: true`.

Resultado: para añadir un comando o un evento **no hay que tocar ningún índice**; basta con crear el fichero.

## Eventos

| Fichero | Responsabilidad |
|---|---|
| `ready.js` | Arranque, panel web, restauración de configuración |
| `messageCreate.js` | Anti-spam, anti-links, censura, auto-respuestas, comandos por prefijo |
| `interactionCreate.js` | Slash commands, botones, menús y modales (tickets, voz, sorteos, verificación) |
| `guildMemberAdd.js` | Bienvenida, rol automático, verificación |
| `guildMemberRemove.js` | Salidas y limpieza de mensajes |
| `voiceStateUpdate.js` | Salas temporales y cola de soporte de voz |
| `reactionEvents.js` | Verificación por reacción y roles por reacción |
| `logEvents.js` | Registro de todos los eventos del servidor |

## Estado en memoria vs. disco

El bot mantiene mucho estado volátil en el `client` (colas de voz, intervalos de color, trackers anti-raid) y persiste la configuración en JSON por servidor mediante `scripts/config-manager.js`. Al reiniciar, el evento `ready` reconstruye lo que se puede desde disco. Ver **[[Almacenamiento-de-Datos]]**.
