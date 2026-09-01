# 🖥️ Panel web de administración

El panel es un servidor **Express** (`WEB/admin-panel.js`, ~3.300 líneas) que sirve una SPA de una sola página (`WEB/admin.html`) con una interfaz gráfica interactiva de alta gama inspirada en **ProBot**, **Dyno** y **Nekotina**. Se arranca automáticamente desde el evento `ready` del bot a través de `src/server.js` → `startAdminPanel(client)`.

* URL por defecto: `http://localhost:22550`
* Puerto: `PORT` del `.env` o el puerto incluido en `PANEL_URL` / `config/panel-config.json`

---

## 🎨 Nueva Interfaz de Usuario y Navegación

El panel cuenta con un sistema de diseño visual moderno:
* **Tema Oscuro & Glassmorphism**: Paleta gamer y cyberpunk (`#0A0D14`, `#0F1422`, `#131929`), desenfoque translúcido (`backdrop-filter: blur(12px)`), tipografía **Plus Jakarta Sans** y **JetBrains Mono**, y acentos en **Discord Blurple** (`#5865F2`), **Cian Neón** (`#00D2FF`) y **Verde Esmeralda** (`#10B981`).
* **Sidebar Categorizada con Estado en Vivo**: Módulos agrupados por categorías lógicas (*Principal*, *Seguridad & Moderación*, *Comunicación*, *Comunidad & Engagement*, *Administración & Sistema*) con un indicador de estado online del bot con pulsación animada.
* **Botón de Menú de 3 Palitos (Hamburguesa)**: Ubicado junto al nombre/avatar del bot y en la cabecera principal. Permite plegar y desplegar la barra lateral con una micro-animación fluida de 3 barras horizontales simétricas y soporte para pantalla completa en desktop y overlay móvil.
* **Buscador Rápido Global (`Ctrl + K` / Quick Jump)**: Paleta de comandos interactiva que permite filtrar y saltar a cualquier módulo al instante con el teclado o el ratón.
* **Hero Banner & Module Cards**: Dashboard de bienvenida con chips de estado en vivo y tarjetas de acceso directo para configurar cada módulo.
* **Pantalla de Verificación OAuth2 para Miembros**: La página web que ven los usuarios al verificarse (`/verify-callback`) fue rediseñada con tarjeta glassmorphism, avatar con resplandor neón, insignia esmeralda animada de éxito y botón para regresar a Discord.

---

## 🔐 Inicio de sesión

Controlado por la constante `LOGIN` de `WEB/admin-panel.js` (ver **[[Configuracion]]**).

Con `LOGIN = true`:

1. Cualquier ruta no pública redirige a `/login`.
2. `/login` lleva al OAuth2 de Discord; Discord vuelve a `/callback`.
3. Se listan **solo** los servidores donde tu cuenta tiene `Administrador` o `Gestionar servidor`, y donde el bot está presente.
4. Las llamadas a la API sobre servidores ajenos responden **403 No autorizado**.
5. `/logout` cierra la sesión.

Rutas públicas: `/login`, `/login/password`, `/callback`, `/verify-callback`, `/logout`.

---

## 🧭 Navegación por URL

El panel soporta rutas directas en el navegador, por ejemplo `/embed`, `/enbet` y `/say-server`, y actualiza la URL con `history.pushState` al cambiar de pestaña. El servidor seleccionado en el desplegable se guarda en `localStorage` y se restaura automáticamente al recargar la página.

---

## 📋 Categorías y Módulos

| Categoría | Módulo | Qué permite |
|---|---|---|
| **Principal** | **Dashboard** | Hero Banner, estado del bot, uptime, estadísticas de servidores/usuarios/canales, *Module Cards* interactivas y *Actividad Reciente* |
| **Seguridad & Moderación** | **Moderación y AutoMod** | Anti-spam, anti-links, anti-bots, censura de mayúsculas/palabras vetadas, acciones automáticas al banear/expulsar |
| | **Anti-Raid** | Activar/desactivar cada uno de los módulos de defensa, umbrales de ataque, lista blanca y modo pánico |
| | **Verificación** | Verificación por reacción o por OAuth2, rol a otorgar, rol a retirar al verificarse y lista de verificados |
| | **Config Logs** | Canal y color **por evento**, selector múltiple de canales y registro de auditoría |
| **Comunicación** | **Enviar Mensaje como Bot** | Enviar texto o embeds con identidad del bot, formato markdown y vista previa en tiempo real |
| | **Enviar como Servidor** | Enviar texto o embeds mediante webhook, y **cargar y editar mensajes existentes** por ID o enlace |
| | **Constructor de Embeds** | Diseñar embeds visuales con paleta de colores, author, footer, campos inline y previsualización Discord |
| | **Auto-respuestas** | Respuestas automáticas por palabra clave o trigger (texto o embed) con filtros por canal/rol |
| **Comunidad & Engagement** | **Bienvenidas** | Canal, mensaje personalizado, tarjeta gráfica con avatar del usuario, fondo y previsualización en vivo |
| | **Tickets** | Crear paneles interactivos (botones + modales con preguntas), roles de soporte, transcripciones y gestión |
| | **Sugerencias** | Canal de sugerencias, comentarios y votaciones con reacciones |
| | **Sorteos (Giveaways)** | Crear sorteos, premio, duración, ganadores automáticos, participantes y re-roll |
| | **Auto-Rol** | Asignación automática de roles para nuevos miembros y roles por reacción con selector de emojis del servidor |
| **Administración & Sistema** | **Miembros** | Lista paginada de miembros ordenados por ID, detalles de usuario y sanciones directas |
| | **Logs Recientes** | Visor de auditoría y eventos recientes con opción de limpieza |
| | **Servidores** | Lista de servidores donde está el bot y selector activo |

---

## 🖼️ Subida de archivos

El panel guarda las imágenes subidas (fondos de bienvenida, imágenes de embed) en la carpeta `uploads/`, que se crea automáticamente y se sirve estáticamente en `/uploads`. Endpoints: `POST /api/upload` y `GET /api/list-uploads`.

---

## 🌐 Exponer el panel en Internet

Si publicas el panel fuera de `localhost`:

1. Pon `LOGIN = true`.
2. Define `PANEL_URL` con tu dominio público y añade `<PANEL_URL>/callback` y `<PANEL_URL>/verify-callback` en el portal de Discord.
3. Sirve el panel detrás de HTTPS (proxy inverso tipo Nginx/Caddy o un túnel).
4. Usa un `SESSION_SECRET` largo y aleatorio.

Referencia completa de endpoints: **[[API-del-Panel]]**.

---

## 🔧 Correcciones y Mejoras Recientes

| Componente | Mejora / Corrección |
|---|---|
| **Interfaz General** | Rediseño integral estilo ProBot / Dyno / Nekotina con Dark Theme, Glassmorphism, fuentes Google y microinteracciones |
| **Navegación** | Barra lateral categorizada con botón de 3 palitos (hamburguesa) animado para plegar/desplegar con fluidez |
| **Búsqueda Rápida** | Atajo `Ctrl + K` para abrir la paleta de búsqueda global instantánea |
| **Auto-Rol → Emoji** | Selector visual con emojis del servidor (imagen real) y unicode más populares, con búsqueda en tiempo real |
| **Auto-Rol → Color** | Paleta de color de embed con presets rápidos + input hex con previsualización |
| **Verificación** | Bug de anidamiento HTML corregido: los ajustes avanzados ya no aparecen en otras secciones |
| **Lista de Miembros** | Paginación reescrita: cursor `after` calculado manualmente sobre lista ordenada por ID; `afterStack` del frontend corregido |
