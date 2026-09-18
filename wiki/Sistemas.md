# 🧩 Sistemas internos

Cada sistema vive en `src/systems/` y es consumido por los eventos (`src/events/`), los comandos y la API del panel.

| Fichero | Sistema |
|---|---|
| `antiRaidSystem.js` | Anti-Raid y automoderación |
| `ticketSystem.js` | Tickets y transcripciones |
| `voiceSystem.js` | Salas de voz temporales y cola de soporte |
| `loggerSystem.js` | Registro de eventos |
| `welcomeSystem.js` | Bienvenidas y tarjetas |
| `autoResponseSystem.js` | Auto-respuestas |
| `sanctionSystem.js` | Sanciones y advertencias |
| `colorSystem.js` | Rotación automática de color de un rol |
| `backupSystem.js` | Copias de seguridad de servidores |
| `src/systems/youtube/index.js` | Anuncios de YouTube (RSS polling) |
| `src/systems/tiktok/index.js` | Anuncios de TikTok (Beta, @ssut/tiktok-api) |

Además, `scripts/antiraid.js` inicializa la versión 2 del anti-raid (`initAntiRaid(client)`) y `scripts/welcome-card.js` genera la imagen de bienvenida con **Jimp**.

## 📺 Anuncios de YouTube

Sistema de detección de nuevos vídeos mediante **RSS Feed** (sin necesidad de API key).

* **Almacenamiento**: `servidores/<NombreDelServidor>_<GuildID>/configuracion/youtube.json`
* **Tracking**: `data/youtube-tracked.json` almacena el último `videoId` por canal y servidor
* **Polling**: cada 30 segundos comprueba todos los canales configurados
* **Detección**: compara el último vídeo conocido con el feed RSS actual
* **Notificación**: embed automático con título, miniatura y enlace al vídeo
* **Primer run**: guarda estado sin notificar (evita spam al reiniciar)

Configurable desde la sección **Redes → Anuncios YouTube** del panel web.

## 🎵 Anuncios de TikTok (Beta)

Sistema de detección de nuevos vídeos mediante **`@ssut/tiktok-api`** (gratis, sin API key).

* **Almacenamiento**: `servidores/<NombreDelServidor>_<GuildID>/configuracion/tiktok.json`
* **Tracking**: `data/tiktok-tracked.json` almacena el `videoCount` por perfil y servidor
* **Polling**: cada 30 segundos comprueba todos los perfiles configurados
* **Detección**: compara el conteo de vídeos con el valor anterior
* **Notificación**: embed con avatar, seguidores, vídeos, likes y enlace al perfil
* **Vídeos eliminados**: si baja el conteo, resetea sin notificar
* **Limitación**: TikTok bloquea acceso a vídeos de cuentas pequeñas; el enlace lleva al perfil, no al vídeo

Configurable desde la sección **Redes → Anuncios TikTok (Beta)** del panel web.

---

## 🛡️ Anti-Raid y automoderación

Estado en memoria bajo `client.antiRaid` (`messageTracker`, `channelActions`, `whitelist`, `logChannel`, `settings`, `adminRole`, `infractions`).

Valores por defecto de `getAntiRaidSettings()`:

```js
{
  antiSpam: true,          maxMessages: 5,        timeWindow: 5000,
  antiChannelSpam: true,   maxChannelActions: 3,  channelTimeWindow: 60000,
  antiLinks: true,         antiBots: true
}
```

* **12 módulos vigilados**: crear/borrar/editar canales, crear/borrar/editar roles, crear/borrar emojis, expulsar/banear/desbanear usuarios y editar webhooks.
* **Ventana deslizante de 60 s** para detectar abusos masivos.
* **Respuesta automática**: aislamiento (retirada de todos los roles) + ban o kick, según configuración.
* **Lista blanca** por servidor para excluir administradores y bots de confianza.
* Todo lo detectado se envía al canal de logs configurado.

Configurable desde las secciones **Moderación / AutoMod** y **Anti-Raid** del panel web.

## 🎫 Tickets

* `/ticketpanel` publica un panel con hasta **5 botones**, cada uno con su propio formulario (modal).
* Al pulsar, se crea un canal privado visible para el autor y para el rol de staff (`/ticketstaffrole`).
* `/ticketclose` o el botón de cierre generan una **transcripción HTML** del canal (también manualmente con `/generatehtml`).
* Los tickets activos se ven en el panel, con botón «Abrir en Discord», y las transcripciones se listan en `GET /api/tickets`.
* El canal de logs de tickets se define con `/ticketlogchannel`.

## 🎧 Voz: salas temporales y soporte

**Salas temporales** — `/setup` o `/createcategory` crean la categoría «🍺 Salas privadas» con un canal generador («🔊 Crear sala»). Al entrar en él, el bot crea una sala propia para el usuario y le da el control mediante `/voiceinterface`: nombre, límite, privacidad, invitar, expulsar, ban/unban, reivindicar, transferir, eliminar e info. La sala se borra al quedarse vacía.

**Soporte de voz por cola** — `/createsupportchannels` genera la sala de espera, los canales de atención, el canal de logs y los roles de staff. El staff usa `/nex` para atender al siguiente de la cola; `/voicesupportnextrole` define quién puede usarlo, `/sanctionsupport` y `/voicesanctionedrole` gestionan las sanciones.

El estado se mantiene en memoria: `client.tempVoiceChannels`, `client.tempVoiceChannelOwners`, `client.voiceSupportQueue`, `client.voiceSupportWaitingTime`, etc.

## 📝 Logs

`sendLogEmbed()` (en `loggerSystem.js`) es el punto único de registro que usan comandos y sistemas. `src/events/logEvents.js` escucha los eventos de Discord y envía el embed correspondiente.

Eventos cubiertos: mensajes eliminados (**incluyendo el contenido del mensaje borrado**, quién lo borró y en qué canal), mensajes editados y fijados, entradas y salidas de usuarios, bots añadidos/eliminados, bans y unbans, roles y canales creados/editados/eliminados, invitaciones, webhooks, cambios del servidor, eventos de voz y acciones de moderación/anti-raid.

En el panel, cada evento puede tener **su propio canal y su propio color**, y la sección *Actividad Reciente* muestra los embeds completos filtrados por servidor.

## 🏠 Bienvenidas

`processWelcomeMember(member)` lee la configuración `welcome` del servidor y, si está habilitada, envía al canal configurado el mensaje personalizado y una tarjeta gráfica generada por `scripts/welcome-card.js` (fondo e imágenes configurables desde el panel; botón de prueba en `POST /api/guilds/:guildId/welcome-test`).

Relacionado: **rol automático al entrar** (`POST /api/guilds/:guildId/autorol`).

### 🎭 Auto-Rol — Mejoras (Panel Web)

* **Emojis del servidor**: el endpoint `GET /api/guilds/:guildId/emojis` usa `await guild.emojis.fetch()` para obtener emojis en tiempo real (no solo caché). Devuelve `{ id, name, animated, url }` con la URL de imagen de Discord.
* **Selector visual de emojis**: modal con búsqueda en tiempo real que muestra emojis del servidor como `<img>` y los más usados en unicode.
* **Paleta de color de embed**: input `type="color"` sincronizado con presets rápidos (Blurple `#5865F2`, Verde, Amarillo, Rosa, Rojo, Cyan, Blanco, Oscuro).
* Las tarjetas activas muestran la imagen real del emoji personalizado en lugar del código de texto.

## 🤖 Auto-respuestas

Responde automáticamente cuando un mensaje coincide con una palabra clave. Cada regla admite respuesta en texto o embed, y filtros por canales y roles. Gestión completa vía CRUD en `/api/guilds/:guildId/auto-responses`.

## ⚖️ Sanciones

`sanctionSystem.js` gestiona el registro persistente e independiente de sanciones y advertencias:
* **Advertencias (`/warn`)**: Aplica una advertencia formal, almacena el registro en `servidores/<NombreDelServidor>_<GuildID>/sanciones/` y envía automáticamente un **mensaje directo (MD)** privado al usuario con el motivo y moderador responsable. Además, emite un registro a `sendLogEmbed` para auditoría.
* **Consultas**: Las sanciones se consultan mediante `/warnings` (advertencias de un usuario) y `/sanctionhistory` (historial global de sanciones del servidor), así como desde la sección de miembros del panel web.

## 🎨 Rotación de color

`/colorrole` inicia un intervalo que cambia el color del rol indicado periódicamente; `/stopcolor` lo detiene. La rotación se **restaura automáticamente al arrancar** el bot leyendo la configuración `colorroles` de cada servidor.

## ✅ Verificación

Dos modalidades, configurables desde la sección **Verificación** del panel:

* **Por reacción**: el usuario reacciona a un mensaje publicado por el bot.
* **Por OAuth2**: el usuario pulsa un enlace, autoriza en Discord y vuelve a `/verify-callback`.

Opciones adicionales: rol otorgado al verificarse y **rol a retirar** (típicamente el de «no verificado»). Los usuarios verificados quedan registrados en `verified-users.json` dentro de la carpeta del servidor.

> **Bug arreglado**: el bloque `#verify-tab-settings` tenía un `</div>` prematuro que lo dejaba fuera del `<div id="verification" class="section">`. Esto hacía que los "Ajustes Avanzados de Verificación" se mostraran en cualquier otra sección del panel. Corregido anidando correctamente el HTML.

## 🎉 Sorteos

Gestionados desde el panel (`/api/guilds/:guildId/giveaways`): creación, edición, participación, finalización, cancelación, re-roll y re-verificación de sorteos pendientes. Las interacciones de botón se procesan con `handleGiveawayInteraction`.

## 👥 Lista de Miembros — Paginación corregida

El endpoint `GET /api/guilds/:guildId/members` fue reescrito para funcionar correctamente con la paginación por cursor:

* Se llama a `guild.members.fetch({ limit: 1000 })` para obtener todos los miembros frescos (sin depender del caché).
* Los miembros se ordenan alfanuméricamente por ID (snowflake, equivalente a orden cronológico).
* El parámetro `after` se aplica manualmente: se busca el índice del miembro con ese ID y se toma el slice siguiente.
* Se retornan `{ members, hasMore, nextAfter }` correctamente.

En el frontend, el `afterStack` (pila de cursores) fue corregido:
* `goMembersNext()` empuja el cursor **antes** de cargar y hace rollback si el fetch falla.
* `goMembersPrev()` usa `afterStack[afterStack.length - 1]` (en lugar del índice `page - 1` desincronizado) para recuperar el cursor anterior.

---

## 💾 Copias de Seguridad (Backups)

`backupSystem.js` gestiona el ciclo de vida completo de copias de seguridad de servidores de Discord.

### Almacenamiento

Cada backup se guarda como un fichero JSON en:
```
servidores/<NombreDelServidor>_<GuildID>/backups/<backup_id>.json
```

### Contenido de un backup

* **Metadatos**: ID único, versión personalizada, fecha de creación.
* **Servidor**: nombre, icono (URL).
* **Roles**: nombre, color, posición, hoist, mentionable, bitfield de permisos y array legible de flags (`permissionsList`).
* **Categorías**: nombre, posición, y array de `permissionOverwrites` por rol (con `id`, `type`, `allow`, `deny`, `allowFlags`, `denyFlags`).
* **Canales**: nombre, tipo (`GUILD_TEXT`, `GUILD_VOICE`, `GUILD_ANNOUNCEMENT`), posición, topic, NSFW, bitrate, userLimit, slowmode, categoría padre, y `permissionOverwrites` completos.

### Funciones principales

| Función | Descripción |
|---|---|
| `createBackup(guild, versionName)` | Captura el estado completo del servidor y lo guarda |
| `listBackups(guild)` | Devuelve la lista de backups (metadatos) |
| `getBackup(guild, backupId)` | Devuelve un backup completo por ID |
| `deleteBackup(guild, backupId)` | Elimina un fichero de backup |
| `restoreBackup(guild, backupId)` | Restaura el servidor desde un backup |
| `getRestoreStatus(guildId)` | Devuelve el progreso en tiempo real de una restauración |

### Motor de restauración

La restauración es un proceso destructivo y regulado:

1. **Eliminación**: borra todos los canales y roles existentes (excepto `@everyone` y roles gestionados por integraciones).
2. **Recreación de roles**: crea los roles con su nombre, color, permisos y posición original. Construye un `roleIdMap` para remapear IDs antiguos a los nuevos.
3. **Recreación de categorías**: crea las categorías con sus `permissionOverwrites` remapeados.
4. **Recreación de canales**: crea los canales dentro de su categoría padre, con topic, permisos, bitrate, slowmode, etc.

### Protección Anti-Rate-Limit

* **Retardo regulado**: `SAFE_RESTORE_DELAY = 850ms` entre cada operación de la API de Discord.
* **Gestión de 429**: si Discord devuelve un error `429 Too Many Requests`, se espera el tiempo indicado en `retry-after` + margen de 1 segundo, y se reintenta la operación.
* **Progreso en tiempo real**: `restoreStatuses[guildId]` almacena el paso actual, total de pasos, porcentaje y mensaje descriptivo, consultable desde el frontend.

