# 🤖 Bot de Discord + Panel Web Administrativo (CodeCord)

> 💬 **Servidor oficial de Discord**
>
> Únete al servidor oficial de CodeCord para recibir soporte, consultar novedades, reportar errores y conocer las próximas actualizaciones.
>
> 🔗 **[Entrar al servidor de Discord](https://discord.gg/PzSNTqFCuW)**

---

> [!IMPORTANT]
>
> ## 🚀 Versión 7.0 - Novedades
>
> ### 🛡️ Sistema Antiraid (12 Módulos)
>
> * Monitoriza **12 tipos de acciones**: crear/borrar/editar canales, crear/borrar/editar roles, crear/borrar emojis, expulsar/banear/desbanear usuarios, editar webhooks.
> * Ventana deslizante de **60 segundos** para detección de abusos.
> * Respuesta automática: **aislamiento** (quita todos los roles) seguido de **ban o kick**.
> * Lista blanca para excluir usuarios (admins, bots, etc.).
> * Logs enviados al canal configurado en la sección **Logs** del panel.
> * Configuración individual por módulo (activado/desactivado, límite de acciones, acción a tomar).
>
> ### 📜 Logs Visuales en Actividad Reciente
>
> * Los eventos de logs (mensaje eliminado, miembro unido, etc.) ahora se muestran **visualmente** con el embed completo en el panel.
> * Incluye título, descripción, campos, color y pie del embed original.
> * Botón **Limpiar** para vaciar el historial de actividad.
> * Filtro automático: los cambios de configuración del panel ya no aparecen en la actividad reciente.
>
> ### 🎫 Botón "Abrir en Discord" en Tickets
>
> * Cada ticket activo en la gestión de tickets ahora tiene un botón para **abrir el canal directamente en Discord**.
> * Enlace directo al canal del ticket con solo un clic.
>
> ### ⚡ Mejoras Internas
>
> * Nuevos intents de Discord: `GuildModeration` y `GuildExpressions` para detección de bans, kicks y cambios de emojis.
> * Sistema Antiraid V2 separado del anti-spam clásico para evitar conflictos.
> * Actualización automática de configuración en memoria al guardar desde el panel.

---

## 🖥️ ¿Qué es y qué hace el Panel Web de Administración?

El panel web te permite controlar la configuración del bot en tiempo real desde tu navegador, evitando tener que modificar archivos JSON manualmente o utilizar largos comandos dentro de Discord.

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
