# 🤖 Bot de Discord + Panel Web Administrativo (CodeCord)

Este repositorio contiene un bot de Discord multifuncional de alto rendimiento integrado con un **Panel Web de Administración** interactivo que permite gestionar el bot y el servidor cómodamente a través de una interfaz gráfica moderna, rápida y segura.

---

## 🖥️ ¿Qué es y qué hace el Panel Web de Administración?

El panel web te permite controlar la configuración del bot en tiempo real desde tu navegador web, evitando tener que configurar archivos JSON a mano o usar engorrosos comandos de texto en Discord. Está organizado en las siguientes secciones clave:

### 1. 📊 Panel de Control (Dashboard)
- **Estadísticas en Tiempo Real**: Muestra el total de servidores conectados, número de miembros que el bot asiste, número de canales y el tiempo activo del bot (Uptime).
- **Consola del Sistema**: Permite ver si el bot está conectado y sincronizado con Discord.

### 2. 🎫 Gestión de Tickets
Se divide en tres pestañas diseñadas para el control total del soporte técnico del servidor:
- **Lista**: Muestra el historial de tickets creados. Permite ver y descargar transcripciones de tickets anteriores directamente en formato **PDF profesional** generado al instante.
- **Crear Panel**: Permite escribir el mensaje informativo para el canal de soporte, seleccionar el canal de destino del panel y el canal donde irán los logs de tickets. Puedes añadir hasta **5 botones interactivos** y decidir si cada botón abrirá un formulario de pregunta para el usuario. La configuración se guarda de forma persistente.
- **Configuración (Roles de Staff)**: Permite asignar qué rol de staff será el principal (mencionado al abrir un soporte) y qué roles adicionales tendrán permisos automáticos de lectura y escritura en los canales de tickets.

### 3. 🤖 Sistema de Auto-Respuestas
- Permite crear disparadores (triggers) inteligentes para que el bot responda automáticamente cuando un usuario escriba una palabra o frase concreta.
- **Soporte de Texto o Embed**: Puedes elegir si el bot responderá con un mensaje de texto simple (con soporte para múltiples respuestas aleatorias) o con un **Embed de Discord** completamente estructurado (título, descripción, color de borde, miniaturas, imágenes y pie de página).
- **Vista Previa en Tiempo Real (Discord Live Preview)**: Recreación interactiva exacta del cliente de Discord para visualizar en tiempo real cómo lucirá tu respuesta (texto o embed) mientras la configuras.
- **Filtros**: Permite restringir en qué canales de Discord funcionará cada auto-respuesta y qué roles tienen permitido (o denegado) activarla. Seleccionables mediante una interfaz multitarea mejorada (haciendo clic simple para marcar/desmarcar elementos).

### 4. 📢 Constructor de Embeds (Embed Builder)
- Diseña mensajes de anuncios con formato avanzado (Embeds) directamente desde la web.
- Configura título, descripción, colores del borde, imágenes y el canal exacto donde se enviará el anuncio en tu servidor.

### 5. ⚙️ Configuración de Logs
- Activa o desactiva de forma granular el registro de eventos del servidor (Mensajes eliminados, mensajes editados, cambios en roles de usuarios, ingresos o salidas de miembros).
- Selecciona el canal exacto donde el bot reportará estas acciones.

### 6. 👋 Configuración de Bienvenidas
- Personaliza el canal y mensaje con el que el bot recibe a los nuevos miembros.
- Activa o desactiva la **Tarjeta de Bienvenida gráfica**, la cual genera una imagen dinámica con el avatar del usuario, su nombre y un fondo estético configurable.

### 7. 👥 Lista de Miembros y Auditoría
- **Miembros**: Muestra un listado de los usuarios del servidor con opciones para ver su perfil, roles, fecha de ingreso y avisos acumulados.
- **Historial de Actividad**: Registra cada cambio o acción que realizas en el panel web para mantener un control de seguridad del personal que tiene acceso a la administración del bot.

---

## ⚡ Instalación y Configuración Rápida

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar las variables de entorno:**
   Crea o edita el archivo `.env` en la raíz del proyecto con la siguiente estructura:
   ```env
   BOT_TOKEN=tu_token_secreto_del_bot
   CLIENT_ID=id_de_la_aplicacion_discord
   CLIENT_SECRET=secret_client_de_discord
   REDIRECT_URI=http://tu-dominio-o-ip:puerto/callback
   GUILD_ID=id_del_servidor_principal
   ```

3. **Registrar Comandos Slash (/) en Discord:**
   Ejecuta el script para sincronizar los comandos del bot con los servidores:
   ```bash
   node deploy-commands-simple-fixed.js
   ```

4. **Iniciar el Servidor y el Bot:**
   Puedes usar el ejecutable automatizado `INICIAR-BOT.bat` o iniciar directamente desde consola:
   ```bash
   npm start
   ```

---

## ⚙️ Configuración del Panel Web y Hosting

El panel web viene preconfigurado para ejecutarse de forma predeterminada en el puerto de tu hosting o en el asignado localmente.

### 🔄 Cambiar URL y Requisito de Login del Panel
Si cambias de hosting, IP o puerto, o si quieres activar/desactivar la pantalla de inicio de sesión de Discord por completo, edita el archivo **`panel-config.json`** en la raíz del proyecto:
1. Abre el archivo **`panel-config.json`**.
2. Modifica sus propiedades:
   ```json
   {
     "url": "",
     "port": 22300,
     "requireDiscordAuth": false
   }
   ```
   *(Si dejas la `url` vacía `""`, el servidor se iniciará automáticamente en `localhost` y extraerá el puerto de forma dinámica, siendo ideal para despliegues locales o hostings con asignación aleatoria de puertos mediante la variable `process.env.PORT`).*
3. Guarda el archivo y reinicia el bot. El panel web aplicará la URL y extraerá automáticamente el puerto para ejecutarse correctamente.

### 🔑 Bypass de Iniciar Sesión Manual
Si el login de Discord está configurado en `true` pero quieres saltarlo temporalmente:
- En la pantalla de login, haz clic en **`🔑 Acceso de Administrador (Sin Discord)`** o accede directamente a `/login/bypass`.
- Esto iniciará sesión automáticamente con un usuario Administrador simulado (`Admin Local`), permitiendo configurar el bot de inmediato sin necesidad de validar credenciales online ni configurar redirecciones complejas.

---

## 🛠️ Tecnologías y Librerías Utilizadas

El proyecto está construido sobre el ecosistema de **Node.js** con las siguientes librerías principales (`package.json`):
- **Core Bot**: `discord.js` (v14.23.2) - Interfaz oficial para interactuar con la API de Discord.
- **Panel Web**: `express` (v4.22.2) y `express-session` - Servidor HTTP para la interfaz web.
- **Base de Datos y Almacenamiento**: Persistencia mediante archivos JSON nativos (`fs`).
- **Generación de Reportes**: `pdfkit` (v0.17.2) - Exportación automática de transcripciones de tickets a formato PDF profesional.
- **Audio y Voz**: `distube`, `@discordjs/voice`, `opusscript`, `prism-media` y `ffmpeg-static`.
- **Utilidades adicionales**: `dotenv` (variables de entorno), `multer` (subida de imágenes al panel web) y `jimp` (procesamiento gráfico).

---

## 📜 Estructura de Archivos del Proyecto

- `index.js` - Núcleo del bot de Discord y gestor de eventos del servidor.
- `admin-panel.js` - Servidor Express y endpoints API que alimentan el panel web.
- `admin.html` - Interfaz visual del panel administrativo (construida con Bootstrap, FontAwesome y micro-animaciones premium).
- `panel-config.json` - Configuración de la red y login del panel web.
- `auto-responses.json` - Reglas persistentes de auto-respuestas.
- `tickets-config.json` - Estado guardado de los paneles de tickets.
- `staff-roles.json` - Roles autorizados a gestionar soporte.
