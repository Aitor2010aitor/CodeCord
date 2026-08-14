
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
> ## 🚀 Versión 9.50 - Novedades
>
> ### 🔐 Inicio de Sesión Obligatorio con Discord (OAuth2)
>
> * El panel ahora **exige iniciar sesión con Discord** para acceder (`LOGIN = true` en `WEB/admin-panel.js`, **línea 21**).
> * Filtrado de servidores por permisos: solo ves los servidores donde tienes permisos de **Administrador** o **Gestionar Servidor**.
> * Bloqueo total de API: si intentas acceder a un servidor que no te pertenece, la API devuelve error **403 No autorizado**.
> * Archivo `VER-URLS-DISCORD.bat` actualizado para generar los enlaces de redirección OAuth2 desde tu `.env`.
>
> ### 🏠 Secciones de Mensajes y Webhooks Separadas
>
> * Sección **🤖 Enviar Mensaje como Bot** y sección independiente **🏠 Enviar como Servidor** (webhooks) con icono e identidad del servidor y badge `SERVIDOR` verde.
> * Formato visual premium: **Barra de formato rápido** en los editores de texto para aplicar **negrita**, *cursiva*, subrayado, tachado, bloques de código, títulos (`#`, `##`, `###`), citas, listas y enlaces `[texto](url)`.
> * **Vista previa en tiempo real realista**: Renderiza el markdown de Discord visualmente en la previsualización al instante.
>
> ### 🧭 Direccionamiento por Enlaces URL Directos
>
> * El panel ahora soporta rutas URL directas en el navegador (`/embed`, `/enbet` y `/say-server`) para abrir secciones directamente.
> * Actualización dinámica de la URL (`history.pushState`) al cambiar de pestaña en el menú.
>
> ### 📝 Mensajes Eliminados en Logs
>
> * El evento `messageDelete` ahora guarda y muestra el **contenido del mensaje borrado** en los logs del panel.
> * Muestra quién borró el mensaje, en qué canal y el texto exacto.
> * Si el mensaje no está disponible (caché), muestra un aviso en lugar de romperse.
>
> ### 💾 Persistencia del Servidor Seleccionado
>
> * El servidor que selecciones en el menú desplegable se **guarda automáticamente** en tu navegador (`localStorage`).
> * Al recargar la página, se selecciona automáticamente el último servidor que tenías abierto.
> * La **Actividad Reciente** y los **Logs** se filtran dinámicamente según el servidor seleccionado.
>
> ### 🎭 Auto-Rol al Entrar
>
> * Nueva opción en **Moderación y AutoMod**: "Rol Automático al Entrar".
> * Selecciona el rol que se asignará automáticamente a los miembros nuevos cuando se unan al servidor.
>
> ### ✅ Retirar Rol al Verificarse
>
> * Nueva opción en **Verificación > Ajustes Avanzados**: "Rol a retirar al verificarse".
> * El bot quita automáticamente el rol de no verificado cuando el usuario completa la verificación (reacción u OAuth2).
>
> ### 🧹 Limpieza de Consola
>
> * Eliminados los mensajes de spam en consola (`🔍 Anti-Spam check`, `🛡️ Procesando mensaje`, `📊 Spam check`).
> * Corregido el error `TypeError: cb is not a function` al destruir sesiones.
>
> ### 🎧 Comandos de Voz
>
> * El comando `/voiceinterface` ahora es **efímero (solo tú lo ves)**: únicamente la persona que ejecuta el comando puede ver el panel interactivo de salas de voz temporales.
> * El panel privado sigue siendo totalmente funcional: los botones (NOMBRE, LÍMITE, PRIVACIDAD, INVITAR, EXPULSAR, BAN, UNBAN, REIVINDICAR, TRANSFERIR, ELIMINAR, INFO) solo pueden ser usados por quien lo abrió.
>
> ### 🖥️ Panel Web
>
> * Nueva opción **LOGIN** en `WEB/admin-panel.js` (**línea 21**): cambia `true` o `false` para activar o desactivar el inicio de sesión en el panel de administración.
> * Con `LOGIN = true` (recomendado) el panel exige iniciar sesión con Discord; con `false` el panel se abre directamente sin pedir login.

---

## 🖥️ ¿Qué es y qué hace el Panel Web de Administración?

El panel web te permite controlar la configuración del bot en tiempo real desde tu navegador, evitando tener que modificar archivos JSON manualmente o utilizar largos comandos dentro de Discord.

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
* Historial de advertencias.
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
