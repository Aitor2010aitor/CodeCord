# 🤖 Bot de Discord + Panel Web Administrativo (CodeCord)

---

> [!IMPORTANT]
>
> ## 💬 Servidor oficial de Discord
>
> Únete al servidor oficial de CodeCord para recibir soporte, consultar novedades, reportar errores y estar al día de las actualizaciones.
>
> 🔗 **[Entrar al servidor de Discord](https://discord.gg/PzSNTqFCuW)**

---

> [!IMPORTANT]
>
> ## 🚀 Versión 10.50 - Novedades
>
> ### 🎨 Nueva Interfaz Web de Alta Gama (Estilo ProBot / Dyno / Nekotina)
> * **Diseño Futurista & Gamer**: Transformación completa del Panel Web (`WEB/admin.html`) con una estética moderna de temática oscura profunda (`#0A0D14`, `#0F1422`), efectos *Glassmorphism* (`backdrop-filter: blur(12px)`), acentos Discord Blurple (`#5865F2`) y cian neón, además de tipografía moderna (**Plus Jakarta Sans** y **JetBrains Mono**).
> * **Barra Lateral Categorizada**: Módulos organizados en categorías lógicas (*Principal*, *Seguridad & Moderación*, *Comunicación*, *Comunidad & Engagement*, *Administración & Sistema*) con estado del bot en vivo (punto verde pulsante con animación).
> * **Botón de Menú de 3 Palitos Animado (Hamburguesa)**: Ubicado en la cabecera lateral junto a CodeCord Online y en el header principal. Cuenta con micro-animación fluida de 3 barras para plegar/desplegar la barra con transición suave (`cubic-bezier`), soporte para pantalla completa en desktop y menú flotante (*drawer*) con fondo oscuro desenfocado en móviles.
> * **Buscador Rápido Global (`Ctrl + K` / Quick Jump)**: Barra de búsqueda instantánea interactiva que permite filtrar y saltar a cualquier módulo o ajuste de inmediato.
> * **Dashboard con Hero Banner y Module Cards**: Banner visual con resumen de salud del bot e indicadores en vivo, junto a una cuadrícula de tarjetas de módulos (*Module Cards*) con accesos directos de configuración.
> * **Página Web de Verificación OAuth2 Renovada**: La pantalla web que ven los usuarios al verificarse (`/verify-callback`) fue rediseñada al estilo ProBot/Nekotina con tarjeta glassmorphism, avatar de usuario y servidor con anillo neón, insignia de check esmeralda animada, tarjeta de rol asignado y botón de retorno a Discord.
> * **Formularios y Controles Modernizados**: Switches estilo iOS/Discord con resplandor neón verde, selectores con foco luminoso y previsualizaciones fidedignas al chat de Discord.
>
<img width="1591" height="761" alt="E87BDA78-3C67-48BD-99FC-DB8E2790F47B" src="https://github.com/user-attachments/assets/9142d3cb-a34f-4719-b7aa-5de562065851" />


> ### ⚠️ Cambios en comandos y moderación
> * Los comandos de juegos usan ahora el prefijo `!` para no saturar la lista de Discord. El único comando de juegos disponible con `/` es `/juegos`.
> * Los comandos de AutoMod se eliminaron de Discord. AutoMod se configura desde el panel web, en **Moderación / AutoMod** y **Anti-Raid**.
> * Se añadió `/unwar`, que retira la advertencia más reciente de un usuario.

> ### ⚠️ Notificación automática por Mensaje Directo (MD) en `/warn`


> * El comando `/warn` ahora envía automáticamente un **mensaje directo (MD)** privado y detallado al usuario advertido con la razón, el servidor y el moderador que aplicó la sanción.
> * Cuenta con control de excepciones y reporte en el canal indicando si la notificación privada fue entregada con éxito o si el usuario tenía los MD bloqueados/cerrados.
> * Registro automático de auditoría en el sistema de logs del servidor (`sendLogEmbed`) y almacenamiento aislado en el directorio de sanciones del servidor.
>
> ### 🏠 Cargar y editar mensajes en "Enviar Mensaje como Servidor"
>
> * Ahora puedes **cargar cualquier mensaje existente** (enviado como servidor con webhook o como bot) ingresando su ID de mensaje o pegando directamente el enlace de Discord (`https://discord.com/channels/...`).
> * El panel detecta automáticamente el canal y si el mensaje es de texto normal o contiene un Embed, cargando todos sus campos (título, descripción, color, imágenes, pie de página y texto adicional).
> * Permite modificar el contenido con vista previa en vivo y cuenta con botones para **Guardar Cambios en Discord** en tiempo real o cancelar la edición.
>
> ### 🎫 Formularios de tickets corregidos (Panel Web)
>
> * Los botones del panel de tickets publicados desde el **Panel Web** ahora muestran correctamente el formulario (modal) con la pregunta configurada antes de abrir el ticket.
> * Compatibilidad con los botones `create_ticket_q{1-5}` / `create_ticket_{1-5}` del panel web y `create_ticket_btn_{1-5}` del comando `/ticketpanel`.
> * Las preguntas se leen desde `panelConfigs` de la configuración de tickets de cada servidor.
>
> ### 📁 Sanciones aisladas por servidor
>
> * El archivo de sanciones de cada servidor ya no se guarda en una carpeta global compartida.
> * Cada servidor almacena sus sanciones en su propia carpeta: `servidores/<NombreDelServidor>_<GuildID>/sanciones/sanciones_<GuildID>.txt`.
> * Los datos quedan totalmente aislados: cada servidor tiene su propia carpeta dentro de `servidores/`, sin mezclarse con los demás.

> ### 🎭 Auto-Rol mejorado (Panel Web)
>
> * **Selector visual de emojis** con búsqueda en tiempo real: muestra los emojis personalizados del servidor (con su imagen real) y los emojis unicode más populares.
> * Los emojis del servidor ya se cargan desde Discord (`guild.emojis.fetch()`) y se muestran con su imagen animada o estática.
> * **Selector de color de embed** con paleta de colores rápida (Blurple, Verde, Amarillo, Rosa, Rojo, Cyan, Blanco, Oscuro) y soporte para color hex personalizado con previsualización en tiempo real.
> * Las tarjetas de Auto-Rol activas ahora muestran la imagen real del emoji si es personalizado del servidor.

> ### 🐛 Bug: Ajustes Avanzados de Verificación persistente en otras secciones (Arreglado)
>
> * Corregido un bug de anidamiento HTML en el que el bloque `#verify-tab-settings` quedaba fuera del `<div id="verification">`, haciendo que los "Ajustes Avanzados de Verificación" aparecieran visibles en cualquier otra sección del panel.
> * Ahora el contenido de verificación se oculta correctamente al navegar a otras secciones.

> ### 👥 Lista de Miembros — Paginación corregida (Panel Web)
>
> * **Arreglado**: al pasar de página en la "Lista de Miembros", se mostraban siempre los mismos miembros porque Discord.js no respetaba el parámetro `after` con `guild.members.fetch({ limit, after })`.
> * Ahora el servidor obtiene todos los miembros, los ordena por ID (snowflake cronológico) y aplica el cursor `after` manualmente, garantizando que cada página muestre un conjunto distinto de miembros.
> * La lógica de `afterStack` en el frontend también fue corregida para que "Página anterior" vuelva al grupo correcto sin desincronizarse.

---

## 🖥️ ¿Qué es y qué hace el Panel Web de Administración?

El panel web te permite controlar la configuración del bot en tiempo real desde tu navegador con una interfaz interactiva de alta gama (estilo **ProBot**, **Dyno** y **Nekotina**), evitando tener que modificar archivos JSON manualmente o utilizar largos comandos dentro de Discord.

### 🔐 Inicio de Sesión (Login)

* Opción **LOGIN** en `WEB/admin-panel.js` (**línea 21**): cambia `true` o `false` para activar o desactivar el inicio de sesión del panel.
* Con `LOGIN = true` (recomendado) el panel exige iniciar sesión con Discord (OAuth2) para entrar.
* Con `LOGIN = false` el panel se abre directamente sin pedir iniciar sesión.

### 📊 Panel de Control (Dashboard)

* Estadísticas en tiempo real.
* Estado del bot.
* Tiempo activo (Uptime).
* Información de servidores, usuarios y canales.
* **Actividad Reciente**: muestra los últimos eventos del bot con embeds visuales completos.

### 🏠 Enviar Mensaje como Servidor

* Envío de mensajes de texto normal o embeds con el nombre e icono del servidor (vía webhook).
* **Cargar y Editar Mensajes Existentes**: carga mensajes mediante ID o enlace de Discord, modifícalos en el panel y guarda los cambios en Discord al instante.
* Barra de formato de texto (negrita, cursiva, subrayado, tachado, títulos, código, citas, listas, enlaces) y vista previa en vivo.
* Soporte para imágenes adicionales ilimitadas con tamaños configurables.

### 🤖 Enviar Mensaje como Bot

* Envío de mensajes normales o embeds directamente con la identidad del bot.
* Barra de formato enriquecido y vista previa en tiempo real.

### 🛡️ Sistema Antiraid

* **12 módulos** de monitorización: crear/borrar/editar canales, crear/borrar/editar roles, crear/borrar emojis, expulsar/banear/desbanear usuarios, editar webhooks.
* Ventana deslizante de **60 segundos** para detección de abusos.
* Respuesta automática: **aislamiento** (quita todos los roles) + **ban o kick**.
* Lista blanca para excluir usuarios (admins, bots, etc.).
* Configuración individual por módulo desde el panel web.
* Logs enviados al canal configurado en la sección **Logs**.

### 🎫 Gestión de Tickets

* Historial y transcripciones HTML.
* Creación avanzada de paneles.
* Hasta 5 botones configurables.
* Formularios personalizados.
* Vista previa del panel.
* Gestión de roles de soporte.
* **Botón "Abrir en Discord"** en cada ticket activo.

### 🎉 Sistema de Sorteos

* Crear sorteos desde la web.
* Configurar premios y duración.
* Selección automática de ganadores.
* Re-roll de ganadores.
* Registro completo de participantes.
* Sistema optimizado y corregido.

### 🛡️ Sistema de Censura

* Crear listas de palabras o frases bloqueadas.
* Detección mediante palabras y frases completas.
* Eliminación automática de mensajes.
* Configuración desde el panel web.
* Registro de acciones realizadas por el sistema.
* Mayor precisión y menos falsos positivos.

### 🤖 Sistema de Auto-Respuestas

* Respuestas automáticas por palabras clave.
* Mensajes de texto o embeds.
* Vista previa en tiempo real.
* Filtros por canales y roles.
* Correcciones de errores y mejoras de estabilidad.

### 📢 Constructor de Embeds

* Creación visual de anuncios.
* Configuración de títulos, colores, imágenes y descripción.
* Envío directo al canal seleccionado.
* Carga y edición de embeds existentes por ID de mensaje.

### ⚙️ Sistema de Logs

* Mensajes eliminados, editados, cambios de roles, entradas/salidas de usuarios.
* **Configuración individual por evento** (canal y color por evento).
* Logs visuales con embed completo en **Actividad Reciente** del panel.
* Botón **Limpiar** para vaciar el historial de logs.
* Configuración de logs unificada para todos los sistemas del bot.

### 👋 Sistema de Bienvenidas

* Mensajes personalizados.
* Tarjetas de bienvenida automáticas.
* Fondos e imágenes configurables.

### 👥 Gestión de Miembros y Auditoría

* Lista completa de usuarios.
* Información detallada de perfiles.
* Sistema de advertencias (`/warn`), retirada de advertencias (`/unwar`), notificación por Mensaje Directo (MD) y registro en auditoría.
* Historial de advertencias y sanciones (`/warnings`, `/sanctionhistory`).
* Registro de acciones administrativas.

### 🧹 Limpieza Automática de Mensajes

* Eliminación automática de mensajes de usuarios expulsados.
* Eliminación automática de mensajes de usuarios baneados.
* Configuración desde el panel administrativo.

---

## 🎧 Comandos de Voz (Discord)

### 🎶 /voiceinterface

* Publica el panel interactivo de salas de voz temporales (**efímero**: solo la persona que ejecuta el comando puede verlo).
* Controla tu sala privada desde los botones: NOMBRE, LÍMITE, PRIVACIDAD, INVITAR, EXPULSAR, BAN, UNBAN, REIVINDICAR, TRANSFERIR, ELIMINAR e INFO.

---
