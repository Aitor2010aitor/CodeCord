# 🔌 API del panel

Todas las rutas las sirve `WEB/admin-panel.js` en el mismo puerto que el panel. Salvo las rutas públicas de login, requieren sesión válida cuando `LOGIN = true`, y devuelven **403** si el usuario autenticado no tiene `Administrador` o `Gestionar servidor` en el `:guildId` solicitado.

`:guildId` es siempre el ID numérico del servidor de Discord.

## Autenticación y sesión

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/login` | Redirige al OAuth2 de Discord |
| GET | `/callback` | Callback OAuth2 del login del panel |
| GET | `/verify-callback` | Callback OAuth2 de la verificación de usuarios |
| GET | `/logout` | Cierra la sesión |

## Estado general

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/status` | Estado del bot, uptime y estadísticas |
| GET | `/api/commands` | Lista de comandos cargados |
| GET | `/api/guilds` | Servidores visibles para el usuario |
| GET | `/api/logs` | Historial de eventos (Actividad Reciente) |
| POST | `/api/logs/clear` | Vacía el historial de logs |
| GET | `/api/list-uploads` | Imágenes disponibles en `uploads/` |
| POST | `/api/upload` | Sube una imagen (multipart, vía multer) |

## Información del servidor

| Método | Ruta |
|---|---|
| GET | `/api/guilds/:guildId/info` |
| GET | `/api/guilds/:guildId/channels` |
| GET | `/api/guilds/:guildId/roles` |
| GET | `/api/guilds/:guildId/roles/:roleId` |
| GET | `/api/guilds/:guildId/emojis` |
| GET | `/api/guilds/:guildId/members` |
| GET | `/api/guilds/:guildId/members/:memberId` |

## Mensajes y embeds

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/guilds/:guildId/send` | Envía un mensaje como el bot |
| POST | `/api/guilds/:guildId/send-as-server` | Envía un mensaje por webhook con identidad del servidor |
| GET | `/api/guilds/:guildId/send-as-server/:channelId/:messageId` | Carga un mensaje existente (texto o embed, servidor o bot) |
| PUT | `/api/guilds/:guildId/send-as-server/:channelId/:messageId` | Edita un mensaje existente enviado por el servidor (webhook) o bot |
| GET | `/api/guilds/:guildId/message/:channelId/:messageId` | Carga cualquier mensaje de Discord |
| PUT | `/api/guilds/:guildId/message/:channelId/:messageId` | Edita un mensaje de Discord (servidor o bot) |
| POST | `/api/guilds/:guildId/embed` | Publica un embed |
| GET | `/api/guilds/:guildId/embed/:channelId/:messageId` | Carga un embed existente |
| PUT | `/api/guilds/:guildId/embed/:channelId/:messageId` | Edita un embed existente |

## Moderación, anti-raid y logs

| Método | Ruta |
|---|---|
| GET / POST | `/api/guilds/:guildId/moderation-config` |
| GET / POST | `/api/guilds/:guildId/antiraid-config` |
| GET / POST | `/api/guilds/:guildId/logs-config` |
| POST | `/api/guilds/:guildId/autorol` |

## Tickets

| Método | Ruta |
|---|---|
| GET / PUT | `/api/guilds/:guildId/ticket-config` |
| GET | `/api/guilds/:guildId/ticket-panels` |
| POST | `/api/guilds/:guildId/send-ticket-panel` |
| POST | `/api/guilds/:guildId/update-ticket-panel/:messageId` |
| GET | `/api/guilds/:guildId/active-tickets` |
| POST | `/api/guilds/:guildId/close-ticket` |
| GET | `/api/tickets` |
| GET | `/api/tickets/:filename` (transcripción HTML) |

## Sorteos

| Método | Ruta |
|---|---|
| GET / POST | `/api/guilds/:guildId/giveaways` |
| PUT | `/api/guilds/:guildId/giveaways/:giveawayId` |
| POST | `/api/guilds/:guildId/giveaways/:giveawayId/join` |
| POST | `/api/guilds/:guildId/giveaways/:giveawayId/end` |
| POST | `/api/guilds/:guildId/giveaways/:giveawayId/cancel` |
| POST | `/api/guilds/:guildId/giveaways/:giveawayId/reroll` |
| POST | `/api/guilds/:guildId/giveaways/recheck` |
| POST | `/api/guilds/:guildId/giveaways-permissions` |

## Auto-respuestas

| Método | Ruta |
|---|---|
| GET / POST | `/api/guilds/:guildId/auto-responses` |
| PUT / DELETE | `/api/guilds/:guildId/auto-responses/:responseId` |

## Sugerencias

| Método | Ruta |
|---|---|
| GET | `/api/guilds/:guildId/suggestions` |
| PUT / DELETE | `/api/guilds/:guildId/suggestions/:suggestionId` |
| POST | `/api/guilds/:guildId/suggestions/:suggestionId/comment` |
| POST | `/api/guilds/:guildId/suggestions-channel` |

## Verificación

| Método | Ruta |
|---|---|
| GET / POST | `/api/guilds/:guildId/verification` |
| POST | `/api/guilds/:guildId/verification/settings` |
| POST | `/api/guilds/:guildId/verification/send-reaction` |
| POST | `/api/guilds/:guildId/verification/send-oauth` |
| GET | `/api/guilds/:guildId/verification/users` |
| POST | `/api/guilds/:guildId/verification/users/:userId/rejoin` |
| DELETE | `/api/guilds/:guildId/verification/users/:userId` |

## Bienvenidas

| Método | Ruta |
|---|---|
| GET / POST | `/api/guilds/:guildId/welcome-config` |
| POST | `/api/guilds/:guildId/welcome-test` |

## Copias de Seguridad (Backups)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/guilds/:guildId/backups` | Lista todos los backups del servidor (metadatos: id, versión, fecha, conteos) |
| POST | `/api/guilds/:guildId/backups/create` | Crea un backup. Body: `{ "versionName": "v1.0 - Mi backup" }` |
| GET | `/api/guilds/:guildId/backups/:backupId` | Devuelve un backup completo (roles, categorías, canales, permisos) |
| DELETE | `/api/guilds/:guildId/backups/:backupId` | Elimina un backup |
| POST | `/api/guilds/:guildId/backups/:backupId/restore` | Inicia la restauración destructiva del servidor desde un backup |
| GET | `/api/guilds/:guildId/backups/restore-status` | Estado en tiempo real de la restauración en curso (paso, total, porcentaje, mensaje) |

## Anuncios de YouTube

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/youtube/search?q=...` | Busca canales de YouTube |
| GET | `/api/guilds/:guildId/youtube-config` | Obtiene la configuración de YouTube |
| POST | `/api/guilds/:guildId/youtube-config` | Guarda la configuración completa de YouTube |
| POST | `/api/guilds/:guildId/youtube-channels` | Añade un canal de YouTube |
| PUT | `/api/guilds/:guildId/youtube-channels/:channelConfigId` | Actualiza un canal de YouTube |
| DELETE | `/api/guilds/:guildId/youtube-channels/:channelConfigId` | Elimina un canal de YouTube |
| POST | `/api/guilds/:guildId/youtube-global-toggle` | Activa/desactiva todos los anuncios de YouTube |

## Anuncios de TikTok (Beta)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tiktok/search?q=...` | Busca perfiles de TikTok |
| GET | `/api/guilds/:guildId/tiktok-config` | Obtiene la configuración de TikTok |
| POST | `/api/guilds/:guildId/tiktok-profiles` | Añade un perfil de TikTok |
| PUT | `/api/guilds/:guildId/tiktok-profiles/:profileId` | Actualiza un perfil de TikTok |
| DELETE | `/api/guilds/:guildId/tiktok-profiles/:profileId` | Elimina un perfil de TikTok |
| POST | `/api/guilds/:guildId/tiktok-global-toggle` | Activa/desactiva todos los anuncios de TikTok |
