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

Además, `scripts/antiraid.js` inicializa la versión 2 del anti-raid (`initAntiRaid(client)`) y `scripts/welcome-card.js` genera la imagen de bienvenida con **Jimp**.

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

Configurable desde `/automod` y desde la sección **Anti-Raid** del panel.

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

## 👋 Bienvenidas

`processWelcomeMember(member)` lee la configuración `welcome` del servidor y, si está habilitada, envía al canal configurado el mensaje personalizado y una tarjeta gráfica generada por `scripts/welcome-card.js` (fondo e imágenes configurables desde el panel; botón de prueba en `POST /api/guilds/:guildId/welcome-test`).

Relacionado: **rol automático al entrar** (`POST /api/guilds/:guildId/autorol`).

## 🤖 Auto-respuestas

Responde automáticamente cuando un mensaje coincide con una palabra clave. Cada regla admite respuesta en texto o embed, y filtros por canales y roles. Gestión completa vía CRUD en `/api/guilds/:guildId/auto-responses`.

## ⚖️ Sanciones

`sanctionSystem.js` guarda advertencias y sanciones por servidor y usuario; se consultan con `/warnings` y `/sanctionhistory` y desde la sección de miembros del panel.

## 🎨 Rotación de color

`/colorrole` inicia un intervalo que cambia el color del rol indicado periódicamente; `/stopcolor` lo detiene. La rotación se **restaura automáticamente al arrancar** el bot leyendo la configuración `colorroles` de cada servidor.

## ✅ Verificación

Dos modalidades, configurables desde la sección **Verificación** del panel:

* **Por reacción**: el usuario reacciona a un mensaje publicado por el bot.
* **Por OAuth2**: el usuario pulsa un enlace, autoriza en Discord y vuelve a `/verify-callback`.

Opciones adicionales: rol otorgado al verificarse y **rol a retirar** (típicamente el de «no verificado»). Los usuarios verificados quedan registrados en `verified-users.json` dentro de la carpeta del servidor.

## 🎉 Sorteos

Gestionados desde el panel (`/api/guilds/:guildId/giveaways`): creación, edición, participación, finalización, cancelación, re-roll y re-verificación de sorteos pendientes. Las interacciones de botón se procesan con `handleGiveawayInteraction`.
