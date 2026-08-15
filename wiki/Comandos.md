# 💬 Comandos

CodeCord registra **57 slash commands**, organizados en dos carpetas: `src/commands/usuario/` y `src/commands/administradores/`.

Dentro de Discord tienes dos menús de ayuda:

* `/comandos` — lista completa de comandos.
* `/helpadmin` — menú interactivo con botones (solo administradores).

---

## 👤 Comandos de usuario

| Comando | Descripción |
|---|---|
| `/8ball` | Hazle una pregunta a la Bola 8 Mágica |
| `/avatar` | Muestra el avatar de un usuario |
| `/channelinfo` | Información detallada de un canal |
| `/coinflip` | Lanza una moneda (cara o cruz) |
| `/comandos` | Lista de comandos disponibles |
| `/dado` | Tira un dado de 6 caras |
| `/juegos` | Menú interactivo de mini-juegos |
| `/membercount` | Contador de miembros (total, humanos, bots) |
| `/nick` | Cambia el apodo de un usuario |
| `/ping` | Latencia del bot y de la API de Discord |
| `/rename` | Renombra tu sala de voz temporal |
| `/rps` | Piedra, papel o tijera |
| `/serverinfo` | Información del servidor |
| `/serverrole` | Información detallada de un rol |
| `/ship` | Calcula la compatibilidad entre dos personas |
| `/sugerencia` | Envía una sugerencia al canal configurado |
| `/trivia` | Ronda de trivia con preguntas aleatorias |
| `/userinfo` | Información detallada de un usuario |
| `/voiceinterface` | Panel privado (efímero) de gestión de tu sala de voz |

### `/voiceinterface` en detalle

Publica un panel **efímero** (solo lo ve quien lo ejecuta) con botones para tu sala temporal:

`NOMBRE` · `LÍMITE` · `PRIVACIDAD` · `INVITAR` · `EXPULSAR` · `BAN` · `UNBAN` · `REIVINDICAR` · `TRANSFERIR` · `ELIMINAR` · `INFO`

---

## 🛡️ Comandos de administración

### Moderación

| Comando | Descripción |
|---|---|
| `/ban` | Banea a un usuario del servidor |
| `/unban` | Desbanea a un usuario |
| `/kick` | Expulsa a un usuario |
| `/timeout` | Aísla temporalmente a un usuario (minutos) |
| `/warn` | Aplica una advertencia formal |
| `/warnings` | Muestra las advertencias de un usuario |
| `/sanctionhistory` | Historial de sanciones y advertencias del servidor |
| `/baninfo` | Consulta si un usuario fue baneado o expulsado |
| `/clear` | Elimina N mensajes del canal actual |
| `/slowmode` | Activa o desactiva el modo lento |
| `/automod` | Configura la moderación automática |

### Roles y permisos

| Comando | Descripción |
|---|---|
| `/rol` | Asigna o quita un rol a un usuario |
| `/setroles` | Define qué roles pueden usar los comandos del bot |
| `/staffrole` | Gestiona los roles de staff mediante menús |
| `/colorrole` | Hace que un rol cambie de color automáticamente |
| `/stopcolor` | Detiene la rotación automática de color |

### Tickets

| Comando | Descripción |
|---|---|
| `/ticketpanel` | Publica el panel interactivo para abrir tickets |
| `/ticketclose` | Cierra el ticket actual |
| `/ticketstaffrole` | Rol de staff que puede ver y atender tickets |
| `/ticketlogchannel` | Canal de logs de los tickets |
| `/generatehtml` | Genera manualmente la transcripción HTML del canal |

### Voz

| Comando | Descripción |
|---|---|
| `/setup` | Crea la estructura completa de salas privadas |
| `/createcategory` | Crea la categoría «🍺 Salas privadas» con sus subcanales |
| `/voiceadmin` | Panel de administración de todos los canales de voz |
| `/createsupportchannels` | Crea los canales de soporte de voz y configura los roles de staff |
| `/addsupportrole` | Añade roles a los canales de soporte existentes |
| `/nex` | Pasa al siguiente usuario en la cola de soporte de voz |
| `/voicesupportnextrole` | Rol autorizado a usar `nex` |
| `/voicesanctionedrole` | Rol de sancionado del soporte de voz |
| `/sanctionsupport` | Sanciona a un usuario del soporte de voz |

### Comunicación

| Comando | Descripción |
|---|---|
| `/say` | El bot envía un mensaje en este u otro canal |
| `/anuncio` | Publica un anuncio en formato embed |
| `/enviarmd` | Envía un DM en formato embed a un usuario (staff) |
| `/poll` | Crea una encuesta con opciones |

### Utilidades

| Comando | Descripción |
|---|---|
| `/logs` | Configura el canal de logs del servidor |
| `/helpadmin` | Menú interactivo de todos los comandos |
| `/userfolder` | Genera un TXT con la lista de usuarios del servidor |

---

## Permisos

Cada comando comprueba sus propios permisos con `PermissionsBitField` (por ejemplo `/ban` exige `BanMembers`). Además, `/setroles` permite autorizar roles concretos para usar los comandos del bot, y `/staffrole` define los roles de staff que usan los sistemas de tickets y soporte.

## Añadir un comando nuevo

Ver **[[Contribuir]]**: basta con crear un fichero en `src/commands/<categoría>/` que exporte `{ name, description, execute }` y volver a ejecutar `npm run deploy`.
