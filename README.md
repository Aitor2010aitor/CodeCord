# 🤖 Bot de Discord + Panel Web Administrativo (CodeCord)

---

## 🔧 Versión 3.0

### 🆕 Novedades de esta versión

#### 🎉 Nueva Zona de Sorteos

Hemos añadido un completo sistema de sorteos integrado tanto en Discord como en el Panel Web Administrativo.

#### 👥 Lista de Miembros Mejorada

* Se solucionó un problema en la paginación de la lista de miembros del panel web.
* Antes, al pasar a la siguiente página, aparecían repetidos los mismos usuarios.
* Ahora cada página carga correctamente los miembros correspondientes sin duplicados y con una navegación más estable y optimizada.


---

Este repositorio contiene un bot de Discord multifuncional de alto rendimiento integrado con un **Panel Web de Administración** interactivo que permite gestionar el bot y el servidor cómodamente a través de una interfaz gráfica moderna, rápida y segura.

---

## 🖥️ ¿Qué es y qué hace el Panel Web de Administración?

El panel web te permite controlar la configuración del bot en tiempo real desde tu navegador web, evitando tener que configurar archivos JSON a mano o usar engorrosos comandos de texto en Discord. Está organizado en las siguientes secciones clave:

### 1. 📊 Panel de Control (Dashboard)

* **Estadísticas en Tiempo Real**: Muestra el total de servidores conectados, número de miembros que el bot asiste, número de canales y el tiempo activo del bot (Uptime).
* **Consola del Sistema**: Permite ver si el bot está conectado y sincronizado con Discord.

### 2. 🎫 Gestión de Tickets

Se divide en tres pestañas diseñadas para el control total del soporte técnico del servidor:

* **Lista**: Muestra el historial de tickets creados. Permite ver y descargar transcripciones de tickets anteriores directamente en formato **PDF profesional** generado al instante.
* **Crear Panel**: Permite escribir el mensaje informativo para el canal de soporte, seleccionar el canal de destino del panel y el canal donde irán los logs de tickets. Puedes añadir hasta **5 botones interactivos** y decidir si cada botón abrirá un formulario de pregunta para el usuario. La configuración se guarda de forma persistente.
* **Configuración (Roles de Staff)**: Permite asignar qué rol de staff será el principal (mencionado al abrir un soporte) y qué roles adicionales tendrán permisos automáticos de lectura y escritura en los canales de tickets.

### 3. 🎉 Sistema de Sorteos

Nueva sección dedicada a la gestión avanzada de giveaways y eventos del servidor:

* Crear sorteos personalizados desde el panel web.
* Configurar premios, tiempo y cantidad de ganadores.
* Publicación automática en el canal seleccionado.
* Participación mediante botones interactivos.
* Selección automática de ganadores.
* Re-roll de ganadores desde el panel.
* Registro automático de resultados y participantes.

### 4. 🤖 Sistema de Auto-Respuestas

* Permite crear disparadores (triggers) inteligentes para que el bot responda automáticamente cuando un usuario escriba una palabra o frase concreta.
* **Soporte de Texto o Embed**: Puedes elegir si el bot responderá con un mensaje de texto simple (con soporte para múltiples respuestas aleatorias) o con un **Embed de Discord** completamente estructurado (título, descripción, color de borde, miniaturas, imágenes y pie de página).
* **Vista Previa en Tiempo Real (Discord Live Preview)**: Recreación interactiva exacta del cliente de Discord para visualizar en tiempo real cómo lucirá tu respuesta (texto o embed) mientras la configuras.
* **Filtros**: Permite restringir en qué canales de Discord funcionará cada auto-respuesta y qué roles tienen permitido (o denegado) activarla. Seleccionables mediante una interfaz multitarea mejorada (haciendo clic simple para marcar/desmarcar elementos).

### 5. 📢 Constructor de Embeds (Embed Builder)

* Diseña mensajes de anuncios con formato avanzado (Embeds) directamente desde la web.
* Configura título, descripción, colores del borde, imágenes y el canal exacto donde se enviará el anuncio en tu servidor.

### 6. ⚙️ Configuración de Logs

* Activa o desactiva de forma granular el registro de eventos del servidor (Mensajes eliminados, mensajes editados, cambios en roles de usuarios, ingresos o salidas de miembros).
* Selecciona el canal exacto donde el bot reportará estas acciones.

### 7. 👋 Configuración de Bienvenidas

* Personaliza el canal y mensaje con el que el bot recibe a los nuevos miembros.
* Activa o desactiva la **Tarjeta de Bienvenida gráfica**, la cual genera una imagen dinámica con el avatar del usuario, su nombre y un fondo estético configurable.

### 8. 👥 Lista de Miembros y Auditoría

* **Miembros**: Muestra un listado de los usuarios del servidor con opciones para ver su perfil, roles, fecha de ingreso y avisos acumulados.
* **Historial de Actividad**: Registra cada cambio o acción que realizas en el panel web para mantener un control de seguridad del personal que tiene acceso a la administración del bot.

---

## ⚡ Instalación y Despliegue en Hosting (bot-hosting.net / Pterodactyl)

Para subir y ejecutar este bot en hostings especializados como **Bot-Hosting.net**, sigue estos sencillos pasos:

1. **Subir los Archivos:**
   Sube todos los archivos del proyecto al explorador de archivos del panel de tu hosting (se recomienda usar SFTP o subir en un archivo `.zip` / `.rar` y descomprimirlo allí). **No subas la carpeta `node_modules`**, el hosting las instalará automáticamente al iniciar.

2. **Configurar las Variables de Entorno:**
   Tienes dos opciones para definir las credenciales:

   **Opción A (Recomendada)**:
   Ve a la pestaña **"Startup" (Configuración de Inicio)** de tu panel en Bot-Hosting.net y rellena las variables de entorno allí.

   **Opción B**:
   Crea un archivo llamado `.env` en la raíz de los archivos de tu hosting con esta estructura:

   ```env
   BOT_TOKEN=tu_token_secreto_del_bot
   CLIENT_ID=id_de_la_aplicacion_discord
   CLIENT_SECRET=secret_client_de_discord
   REDIRECT_URI=http://tu-dominio-o-ip:puerto/callback
   GUILD_ID=id_del_servidor_principal
   ```

3. **Registrar los Comandos Slash (/) en Discord:**
   La primera vez que subas el bot (o cuando agregues comandos nuevos), ejecuta en la **Consola** de tu panel de hosting:

   ```bash
   node scripts/deploy-commands-simple-fixed.js
   ```

4. **Iniciar el Bot:**
   Presiona el botón **"Start" (Iniciar)** en la consola de Bot-Hosting.net. El panel descargará e instalará todas las dependencias necesarias de manera automática y encenderá el bot y el panel administrativo.

---

## 💻 Despliegue Local (Opcional - En tu PC)

Si prefieres ejecutar el bot en tu ordenador local para hacer pruebas:

1. Instala las dependencias ejecutando:

   ```bash
   npm install
   ```

2. Configura el archivo `.env` en la raíz con tus credenciales.

3. Ejecuta:

   ```bash
   node scripts/deploy-commands-simple-fixed.js
   ```

4. Inicia el proyecto:

   ```bash
   npm start
   ```

---

## ⚙️ Configuración del Panel Web y Hosting

El panel web viene preconfigurado para ejecutarse de forma predeterminada en el puerto de tu hosting o en el asignado localmente.

### 🔄 Cambiar URL y Requisito de Login del Panel

Si cambias de hosting, IP o puerto, o si quieres activar/desactivar la pantalla de inicio de sesión de Discord por completo, edita el archivo **`panel-config.json`** en la raíz del proyecto:

```json
{
  "url": "",
  "port": 22300,
  "requireDiscordAuth": false
}
```

---

## 🛠️ Tecnologías y Librerías Utilizadas

El proyecto está construido sobre el ecosistema de **Node.js** con las siguientes librerías principales (`package.json`):

* **Core Bot**: `discord.js` (v14.23.2)
* **Panel Web**: `express` (v4.22.2) y `express-session`
* **Base de Datos y Almacenamiento**: Persistencia mediante archivos JSON nativos (`fs`)
* **Generación de Reportes**: `pdfkit` (v0.17.2)
* **Audio y Voz**: `distube`, `@discordjs/voice`, `opusscript`, `prism-media` y `ffmpeg-static`
* **Utilidades adicionales**: `dotenv`, `multer` y `jimp`

---

## 📜 Estructura de Archivos del Proyecto

* `index.js` → Núcleo principal del bot y eventos.
* `WEB/` → Archivos del panel administrativo.

  * `admin-panel.js`
  * `admin.html`
* `config/` → Configuraciones JSON persistentes.
* `scripts/` → Scripts auxiliares y utilidades del sistema.

---
