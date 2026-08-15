# ⚙️ Instalación y puesta en marcha

## 1. Requisitos

| Requisito | Versión recomendada |
|---|---|
| Node.js | 18 LTS o superior (el proyecto se desarrolla con Node 24) |
| npm | Incluido con Node |
| Aplicación de Discord | Bot creado en el [Portal de desarrolladores](https://discord.com/developers/applications) |
| Sistema operativo | Windows, Linux o macOS (los `.bat` incluidos son solo para Windows) |

En el portal de Discord, dentro de **Bot**, activa los tres *Privileged Gateway Intents*:

* `PRESENCE INTENT`
* `SERVER MEMBERS INTENT`
* `MESSAGE CONTENT INTENT`

El bot los solicita todos en `src/index.js`; si faltan, el login fallará con `Used disallowed intents`.

## 2. Clonado e instalación

```bash
git clone https://github.com/aitor1234567899/CodeCord.git
cd CodeCord
npm install
```

> `requirements.txt` es solo una lista informativa de dependencias. La fuente real es `package.json`.

## 3. Variables de entorno

```bash
cp .env.example .env
```

Rellena como mínimo `BOT_TOKEN` y `CLIENT_ID`. Detalle completo en **[[Configuracion]]**.

## 4. Registrar los slash commands

```bash
npm run deploy      # equivale a: node scripts/deploy-commands.js
```

El script registra los comandos en:

* los IDs de `GUILD_ID`, `GUILD_ID_1`, `GUILD_ID_2`, `GUILD_ID_3` del `.env`, y
* los IDs detectados automáticamente en los nombres de las carpetas de `servidores/` (formato `NombreServidor_1234567890`).

Registrar por servidor es instantáneo; el registro global de Discord puede tardar hasta 1 hora.

Scripts auxiliares en `scripts/`:

| Script | Uso |
|---|---|
| `deploy-commands.js` | Despliegue estándar (el de `npm run deploy`) |
| `deploy-commands-simple.js` / `-fixed.js` | Variantes simplificadas de despliegue |
| `clear-commands.js` | Borra los comandos registrados (útil si hay duplicados) |

## 5. Invitar el bot al servidor

Genera la URL OAuth2 con scopes `bot` + `applications.commands` y permisos de **Administrador** (o, como mínimo: gestionar roles, canales, mensajes, banear, expulsar, aislar y gestionar webhooks).

## 6. Arrancar

```bash
npm start           # node index.js
```

En Windows también puedes hacer doble clic en `INICIAR-BOT.bat`.

Al arrancar verás:

```
🚀 [CodeCord] Iniciando bot de Discord...
✅ CodeCord conectado con éxito como: TuBot#0001
📊 Servidores detectados (N): ...
🛡️ Sistema Anti-Raid activado
🌐 [CodeCord Backend] Arrancando servidor web desde /WEB...
```

El panel web queda disponible en `http://localhost:22550` (o el `PORT` que hayas definido).

## 7. Bloqueo de instancia única

`src/index.js` crea un fichero `bot.lock` con el PID del proceso. Si intentas arrancar una segunda instancia mientras la primera sigue viva, el arranque se aborta con:

```
❌ [CodeCord] Ya hay OTRA instancia del bot ejecutándose (PID xxxx).
```

Esto evita mensajes duplicados y conflictos de puerto. Si el bot se cerró de forma abrupta y el fichero quedó huérfano, se detecta que el PID ya no existe y se sobrescribe automáticamente.
