# 💾 Almacenamiento de datos

CodeCord no usa base de datos: todo se guarda en **ficheros JSON**, con una carpeta por servidor de Discord.

## Carpeta `servidores/`

```
servidores/
└── <NombreDelServidor>_<GuildID>/
    ├── configuracion/
    │   ├── giveaways.json      # Sorteos
    │   ├── logs.json           # Canal y color por evento
    │   ├── moderation.json     # Automod, censura, autorol, limpieza
    │   ├── staffroles.json     # Roles de staff
    │   └── verification.json   # Configuración de verificación
    ├── backups/                # Copias de seguridad del servidor (v11.0)
    │   └── <backup_id>.json    # Canales, categorías, roles y permisos completos
    ├── verification.json       # Estado de la verificación
    └── verified-users.json     # Usuarios verificados
```

Se añaden otros ficheros (tickets, bienvenidas, auto-respuestas, colores, sanciones…) a medida que configuras cada sistema desde el panel o los comandos.

## `scripts/config-manager.js`

Es la capa de acceso a esos ficheros:

* `setClient(client)` — le da acceso al cliente de Discord para resolver nombres de servidor.
* `getGuildFolder(guildId)` — busca la carpeta que termine en `_<guildId>`; si el servidor se ha renombrado en Discord, **renombra la carpeta** automáticamente; si no existe, la crea junto a `configuracion/`.
* `loadGuildConfig(guildId, tipo, valorPorDefecto)` / `saveGuildConfig(...)` — leen y escriben cada fichero de configuración.
* `migrateExistingConfigs()` — migra la configuración global antigua (`config/*.json`) al formato por servidor; se ejecuta en el arranque.

Los caracteres no válidos para rutas (`\ / : * ? " < > |`) se eliminan del nombre del servidor, por lo que emojis y símbolos sí se conservan en el nombre de la carpeta.

## Otras carpetas

| Ruta | Contenido |
|---|---|
| `config/panel-config.json` | URL, puerto y autenticación del panel |
| `config/*.json.bak` | Copias de la configuración global heredada (pre-migración) |
| `data/bot-activity.json` | Historial de actividad mostrado en el panel |
| `data/sessions.json` | Sesiones del panel web |
| `uploads/` | Imágenes subidas desde el panel (se crea sola) |
| `bot.lock` | PID de la instancia en ejecución |
| `debug-ready.txt` | Marca de la última vez que el bot quedó listo |

## Copias de seguridad

* **Copias automáticas del servidor (v11.0)**: Desde la sección **Copias de Seguridad** (`#backups`) del panel web puedes crear respaldos completos de la arquitectura del servidor Discord (categorías, canales, roles y matriz de permisos por rol) con versionado personalizado y restauración automatizada con protección anti-rate-limit.
* **Respaldo global de ficheros**: Para respaldar toda la configuración del bot basta con copiar las carpetas `servidores/`, `config/`, `data/` y `uploads/`. Para migrar el bot a otra máquina, copia esas carpetas más tu fichero `.env`.

> ⚠️ No edites los JSON con el bot en ejecución: el proceso mantiene parte del estado en memoria y podría sobrescribir tus cambios. Detén el bot, edita y vuelve a arrancar.
