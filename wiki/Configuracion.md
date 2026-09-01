# 🔧 Configuración

## Variables de entorno (`.env`)

Plantilla oficial: `.env.example`.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `BOT_TOKEN` | ✅ | Token del bot de Discord. Sin él, el proceso termina con `❌ Error: BOT_TOKEN no definido` |
| `CLIENT_ID` | ✅ | ID de la aplicación; necesario para desplegar los slash commands |
| `CLIENT_SECRET` | Para OAuth2 | Secret de la aplicación; necesario para el login del panel y la verificación OAuth2 |
| `GUILD_ID` | Recomendada | Servidor principal donde registrar los comandos al instante |
| `GUILD_ID_1` … `GUILD_ID_3` | Opcional | Servidores adicionales para el despliegue de comandos |
| `SESSION_SECRET` | Recomendada | Clave de firma de las sesiones Express del panel |
| `PORT` | Opcional | Puerto del panel web (por defecto `22550`) |
| `PANEL_URL` | Para OAuth2 | URL pública del panel, usada en las redirecciones OAuth2 |
| `REQUIRE_DISCORD_AUTH` | Opcional | `true` fuerza autenticación de Discord en el panel |

> ⚠️ El fichero `.env` contiene credenciales: nunca lo subas a un repositorio público. Si se te ha escapado un token, regenéralo en el portal de desarrolladores de Discord.

## Opción `LOGIN` del panel

En `WEB/admin-panel.js` (parte superior del archivo) existe la constante:

```js
const LOGIN = false;   // true = pide login con Discord | false = abre directo
const loginRequired = LOGIN === true;   // calculado, no tocar
```

* `LOGIN = true` (**recomendado**): el panel exige iniciar sesión con Discord (OAuth2). Solo se muestran los servidores donde tienes **Administrador** o **Gestionar servidor**, y la API responde `403` si intentas tocar otro servidor.
* `LOGIN = false`: el panel se abre directamente, sin login. Úsalo solo en `localhost` o detrás de un cortafuegos.

## OAuth2 de Discord

En el portal de desarrolladores → **OAuth2 → Redirects**, añade las URLs de redirección:

```
<PANEL_URL>/callback           → login del panel
<PANEL_URL>/verify-callback    → verificación de usuarios por OAuth2
```

Por ejemplo, con `PANEL_URL=http://localhost:22550`:

```
http://localhost:22550/callback
http://localhost:22550/verify-callback
```

En Windows, el script `VER-URLS-DISCORD.bat` genera estas URLs automáticamente a partir de tu `.env`.

## `config/panel-config.json`

El panel también lee `config/panel-config.json`, que puede fijar `url`, `port` y `requireDiscordAuth`. Si `url` incluye un puerto (por ejemplo `http://mi-dominio.com:22550`), ese puerto tiene prioridad sobre `PORT`.

## Configuración por servidor

Todo lo demás (logs, tickets, bienvenidas, anti-raid, verificación, sorteos, auto-respuestas…) **no** se configura por fichero global, sino por servidor, desde el panel web o los comandos de administración. Se guarda en `servidores/<NombreServidor>_<GuildID>/configuracion/*.json`. Ver **[[Almacenamiento-de-Datos]]**.

Los ficheros `config/*.json.bak` son copias heredadas de la configuración antigua global; `configManager.migrateExistingConfigs()` se encarga de migrarlas al formato por servidor durante el arranque.
