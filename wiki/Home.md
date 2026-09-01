# 🤖 Wiki de CodeCord

**CodeCord** es un bot multifuncional de Discord escrito en **Node.js + discord.js v14** que incluye un **panel web administrativo** (Express) para configurar todo el bot desde el navegador, sin tocar archivos JSON ni memorizar comandos.

* Repositorio: <https://github.com/aitor1234567899/CodeCord>
* Rama principal: `VERSION-10.50`
* Servidor de soporte: <https://discord.gg/PzSNTqFCuW>
* Licencia: ver [`LICENSE`](https://github.com/aitor1234567899/CodeCord/blob/VERSION-10.50/LICENSE)

---

## 🚀 Empezar en 5 minutos

```bash
git clone https://github.com/aitor1234567899/CodeCord.git
cd CodeCord
npm install
cp .env.example .env      # rellena BOT_TOKEN, CLIENT_ID, CLIENT_SECRET...
npm run deploy            # registra los slash commands
npm start                 # arranca el bot + panel web
```

Panel web: <http://localhost:22550> (puerto configurable con `PORT`).

Guía detallada: **[[Instalacion]]**.

---

## 📚 Índice de la wiki

| Página | Contenido |
|---|---|
| **[[Instalacion]]** | Requisitos, instalación, despliegue de comandos, arranque |
| **[[Configuracion]]** | Variables de `.env`, `panel-config.json`, OAuth2 de Discord, opción `LOGIN` |
| **[[Comandos]]** | Los 57 slash commands (usuario y administración) |
| **[[Panel-Web]]** | Secciones del panel, login con Discord, uso diario |
| **[[Sistemas]]** | Anti-Raid, tickets, voz temporal, logs, bienvenidas, auto-respuestas, sanciones, verificación, colores |
| **[[API-del-Panel]]** | Referencia de todos los endpoints HTTP del panel |
| **[[Arquitectura]]** | Estructura de carpetas, handlers, flujo de arranque |
| **[[Almacenamiento-de-Datos]]** | Carpeta `servidores/`, ficheros JSON por servidor |
| **[[Solucion-de-Problemas]]** | Errores frecuentes y cómo resolverlos |
| **[[Contribuir]]** | Convenciones de código, cómo añadir comandos, eventos y sistemas |

---

## ✨ Funcionalidades principales

* **Moderación**: ban, kick, timeout, warn (con aviso privado por MD), historial de sanciones, clear, slowmode, automod.
* **Anti-Raid**: 12 módulos de vigilancia (canales, roles, emojis, bans, webhooks) con ventana deslizante de 60 s, aislamiento automático y lista blanca.
* **Tickets**: paneles con hasta 5 botones, formularios, roles de soporte, transcripciones HTML.
* **Salas de voz temporales**: creación automática al entrar en «Crear sala» + panel privado de control (nombre, límite, privacidad, invitar, expulsar, ban, transferir…).
* **Soporte de voz por cola**: sala de espera, comando de siguiente turno y roles sancionados.
* **Bienvenidas**: mensaje personalizado + tarjeta gráfica generada con Jimp.
* **Logs**: canal y color configurables por evento, más «Actividad Reciente» en el panel.
* **Sorteos, sugerencias, auto-respuestas, censura, embeds, verificación OAuth2 o por reacción.**

---

## 🚀 Versión 10.50 - Novedades

### ⚠️ Notificación automática por Mensaje Directo (MD) en `/warn`

* El comando `/warn` ahora envía automáticamente un **mensaje directo (MD)** privado y detallado al usuario advertido con la razón, el servidor y el moderador que aplicó la sanción.
* Cuenta con control de excepciones y reporte en el canal indicando si la notificación privada fue entregada con éxito o si el usuario tenía los MD bloqueados/cerrados.
* Registro automático de auditoría en el sistema de logs del servidor (`sendLogEmbed`) y almacenamiento aislado en el directorio de sanciones del servidor.

### 🏠 Cargar y editar mensajes en "Enviar Mensaje como Servidor"

* Ahora puedes **cargar cualquier mensaje existente** (enviado como servidor con webhook o como bot) ingresando su ID de mensaje o pegando directamente el enlace de Discord (`https://discord.com/channels/...`).
* El panel detecta automáticamente el canal y si el mensaje es de texto normal o contiene un Embed, cargando todos sus campos (título, descripción, color, imágenes, pie de página y texto adicional).
* Permite modificar el contenido con vista previa en vivo y cuenta con botones para **Guardar Cambios en Discord** en tiempo real o cancelar la edición.

### 🎫 Formularios de tickets corregidos (Panel Web)

* Los botones del panel de tickets publicados desde el **Panel Web** ahora muestran correctamente el formulario (modal) con la pregunta configurada antes de abrir el ticket.
* Compatibilidad con los botones `create_ticket_q{1-5}` / `create_ticket_{1-5}` del panel web y `create_ticket_btn_{1-5}` del comando `/ticketpanel`.
* Las preguntas se leen desde `panelConfigs` de la configuración de tickets de cada servidor.

### 📁 Sanciones aisladas por servidor

* El archivo de sanciones de cada servidor ya no se guarda en una carpeta global compartida.
* Cada servidor almacena sus sanciones en su propia carpeta: `servidores/<NombreDelServidor>_<GuildID>/sanciones/sanciones_<GuildID>.txt`.
* Los datos quedan totalmente aislados: cada servidor tiene su propia carpeta dentro de `servidores/`, sin mezclarse con los demás.

### 🎭 Auto-Rol mejorado (Panel Web)

* **Selector visual de emojis** con búsqueda en tiempo real: muestra los emojis personalizados del servidor (con su imagen real) y los emojis unicode más populares.
* Los emojis del servidor se cargan directamente desde Discord (`guild.emojis.fetch()`) y se muestran con su imagen animada o estática.
* **Selector de color de embed** con paleta de colores rápida (Blurple, Verde, Amarillo, Rosa, Rojo, Cyan, Blanco, Oscuro) y soporte para color hex personalizado con previsualización en tiempo real.
* Las tarjetas de Auto-Rol activas ahora muestran la imagen real del emoji si es personalizado del servidor.

### 🐛 Bug: Ajustes Avanzados de Verificación persistente (Arreglado)

* Corregido un bug de anidamiento HTML en el que el bloque `#verify-tab-settings` quedaba fuera del `<div id="verification">`, haciendo que los «Ajustes Avanzados de Verificación» aparecieran visibles en cualquier otra sección del panel.
* Ahora el contenido de verificación se oculta correctamente al navegar a otras secciones.

### 👥 Lista de Miembros — Paginación corregida (Panel Web)

* **Arreglado**: al pasar de página en la «Lista de Miembros», se mostraban siempre los mismos miembros porque Discord.js ignora el parámetro `after` en `guild.members.fetch({ limit, after })`.
* Ahora el backend obtiene todos los miembros, los ordena por ID (snowflake cronológico) y aplica el cursor `after` manualmente, garantizando que cada página muestre un conjunto distinto.
* La lógica del `afterStack` en el frontend también fue corregida para que «Página anterior» vuelva al grupo correcto sin desincronizarse.

---

> ℹ️ Esta wiki documenta el estado del código en la rama `VERSION-10.50`. Las versiones anteriores viven en las ramas `VERSION-1.5` … `VERSION-9.0`.
