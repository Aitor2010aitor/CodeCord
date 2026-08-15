# 🩺 Solución de problemas

## El bot no arranca

**`❌ Error: BOT_TOKEN no definido en el archivo .env`**
No existe el `.env` o falta la variable. Copia `.env.example` a `.env` y pega tu token.

**`Used disallowed intents`**
Faltan los *Privileged Gateway Intents* en el portal de desarrolladores: activa `PRESENCE`, `SERVER MEMBERS` y `MESSAGE CONTENT`.

**`❌ [CodeCord] Ya hay OTRA instancia del bot ejecutándose (PID xxxx)`**
Hay otro proceso vivo. Ciérralo (`Administrador de tareas` en Windows, `kill <PID>` en Linux). Si estás seguro de que no hay ninguno, borra `bot.lock` y reinicia.

**`EADDRINUSE` al arrancar el panel**
El puerto del panel está ocupado. Cambia `PORT` en el `.env` (o el puerto de `PANEL_URL` / `config/panel-config.json`).

## Los comandos no aparecen en Discord

1. Ejecuta `npm run deploy`.
2. Comprueba que `CLIENT_ID` es correcto y que el bot se invitó con el scope `applications.commands`.
3. Los comandos por servidor aparecen al instante; los globales pueden tardar hasta 1 hora.
4. Si ves comandos duplicados o antiguos, ejecuta `node scripts/clear-commands.js` y vuelve a desplegar.

## El panel no carga o me redirige al login en bucle

* Verifica que las URLs de redirección `<PANEL_URL>/callback` y `<PANEL_URL>/verify-callback` están registradas **exactamente igual** (protocolo, dominio y puerto) en el portal de Discord.
* `PANEL_URL` debe coincidir con la URL con la que accedes al panel.
* Define un `SESSION_SECRET` estable: si cambia, todas las sesiones se invalidan.
* Para depurar en local, puedes poner temporalmente `LOGIN = false` en `WEB/admin-panel.js`.

## «No autorizado / 403» en el panel

Con `LOGIN = true` solo ves y gestionas los servidores donde tienes **Administrador** o **Gestionar servidor** y donde el bot está presente. Comprueba tus permisos en Discord y que el bot sigue en el servidor.

## El bot no borra mensajes / no banea / no crea canales

Es un problema de permisos o de **jerarquía de roles**: el rol del bot debe estar por **encima** del rol del usuario o del rol que quiere modificar, y necesita el permiso correspondiente (`Gestionar mensajes`, `Banear`, `Gestionar canales`, `Gestionar roles`, `Gestionar webhooks`).

Además, Discord no permite borrar en bloque mensajes de más de **14 días** (afecta a `/clear`).

## Los logs no se envían

Configura el canal con `/logs` o desde la sección **Logs** del panel, y asegúrate de que el bot puede escribir y **insertar enlaces/embeds** en ese canal.

## No se crean las salas de voz temporales

* Ejecuta `/setup` o `/createcategory` para crear la estructura.
* El canal generador debe llamarse de forma reconocible (por ejemplo «🔊 Crear sala»); las salas de espera se detectan por nombre (`espera`, `waiting`, `sala-de-espera`).
* El bot necesita `Gestionar canales` y `Mover miembros`.

## La tarjeta de bienvenida no se genera

Revisa que el sistema esté activado y con canal asignado, y que la imagen de fondo subida exista en `uploads/`. Usa el botón de prueba de la sección **Bienvenidas** para reproducir el fallo y mira la consola: los errores de Jimp se registran ahí.

## Se ha filtrado mi token

Regenera el token en el portal de desarrolladores **inmediatamente**, actualiza el `.env` y no vuelvas a subirlo al repositorio (`.env` está en `.gitignore`).

## ¿Sigues atascado?

Abre una incidencia en <https://github.com/aitor1234567899/CodeCord/issues> o pregunta en el [servidor de Discord](https://discord.gg/PzSNTqFCuW), indicando la versión, el sistema operativo, la versión de Node y el error completo de la consola.
