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
> ## 🚀 Versión 11.0 - Novedades
>
> * **💾 Sistema Completo de Copias de Seguridad (Backups)**:
>   * Creación de copias de seguridad con **versionado personalizado** (ej. "v1.0 - Configuración inicial").
>   * Respaldo exhaustivo: nombre del servidor, icono, categorías, canales (texto, voz, anuncio) y roles completos.
>   * Almacenamiento detallado de la **matriz de permisos y sobrescrituras (overwrites)** por rol en cada categoría y canal.
> * **🖥️ Visualizador Estilo Discord en la Web**:
>   * Inspección visual interactiva de backups directamente desde el panel web.
>   * Árbol de canales y categorías que replica la interfaz de Discord con iconos (`#`, `🔊`, `📢`, `🔒` para canales privados).
>   * Inspector de permisos por rol: muestra permisos concedidos (verde), denegados (rojo) o heredados/neutrales (gris).
> * **⚡ Motor de Restauración con Protección Anti-Rate-Limit**:
>   * Restauración segura y automatizada: elimina estructura previa y recrea categorías, canales, roles y permisos con pausas reguladas (~850ms).
>   * Gestión automática de respuestas 429 de Discord con retry-after.
>   * Remapeo automático de IDs de roles nuevos sobre las restricciones de canales y categorías.
>   * Modal con barra de progreso en vivo y estado en tiempo real.
> * **🌐 Nueva Categoría en el Panel Web**:
>   * Categoría lateral **Copias de Seguridad** con tarjetas visuales, métricas y acciones directas.

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
