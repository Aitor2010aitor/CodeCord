# 🖥️ Panel web de administración

El panel es un servidor **Express** (`WEB/admin-panel.js`, ~3.300 líneas) que sirve una SPA de una sola página (`WEB/admin.html`). Se arranca automáticamente desde el evento `ready` del bot a través de `src/server.js` → `startAdminPanel(client)`.

* URL por defecto: `http://localhost:22550`
* Puerto: `PORT` del `.env` o el puerto incluido en `PANEL_URL` / `config/panel-config.json`

## 🔐 Inicio de sesión

Controlado por la constante `LOGIN` de `WEB/admin-panel.js` (ver **[[Configuracion]]**).

Con `LOGIN = true`:

1. Cualquier ruta no pública redirige a `/login`.
2. `/login` lleva al OAuth2 de Discord; Discord vuelve a `/callback`.
3. Se listan **solo** los servidores donde tu cuenta tiene `Administrador` o `Gestionar servidor`, y donde el bot está presente.
4. Las llamadas a la API sobre servidores ajenos responden **403 No autorizado**.
5. `/logout` cierra la sesión.

Rutas públicas: `/login`, `/login/password`, `/callback`, `/verify-callback`, `/logout`.

## 🧭 Navegación por URL

El panel soporta rutas directas en el navegador, por ejemplo `/embed`, `/enbet` y `/say-server`, y actualiza la URL con `history.pushState` al cambiar de pestaña. El servidor seleccionado en el desplegable se guarda en `localStorage` y se restaura al recargar.

## 📋 Secciones

| Sección | Qué permite |
|---|---|
| **Dashboard** | Estado del bot, uptime, número de servidores/usuarios/canales y *Actividad Reciente* con los embeds de los últimos eventos |
| **Enviar Mensaje como Bot** | Enviar texto o embeds a cualquier canal, con barra de formato (negrita, cursiva, subrayado, tachado, código, títulos, citas, listas, enlaces) y vista previa en tiempo real |
| **Enviar como Servidor** | Enviar texto o embeds mediante webhook con identidad del servidor, y también **cargar y editar mensajes existentes** por ID o enlace de Discord |
| **Constructor de Embeds** | Crear embeds visualmente, enviarlos y también **cargar y editar** un embed existente por ID de mensaje |
| **Moderación y AutoMod** | Anti-spam, anti-links, anti-bots, censura de palabras/frases, **Auto-Rol** (con selector visual de emojis del servidor y paleta de color de embed), limpieza de mensajes de usuarios expulsados/baneados |
| **Anti-Raid** | Activar/desactivar cada uno de los 12 módulos, umbrales, lista blanca y acción de castigo |
| **Tickets** | Crear paneles (hasta 5 botones + formularios), roles de soporte, canal de logs, tickets activos con botón «Abrir en Discord», historial y transcripciones HTML |
| **Sorteos** | Crear sorteos, premio y duración, ver participantes, finalizar, cancelar y re-rollear ganadores |
| **Auto-respuestas** | Respuestas por palabra clave (texto o embed), filtros por canal y rol, vista previa |
| **Sugerencias** | Canal de sugerencias, listado, comentarios y gestión de estado |
| **Verificación** | Verificación por reacción o por OAuth2, rol a otorgar, rol a retirar al verificarse, listado de usuarios verificados. Bug arreglado: los ajustes avanzados ya no se muestran en otras secciones. |
| **Bienvenidas** | Canal, mensaje personalizado, tarjeta gráfica, fondo e imagen, y botón de prueba |
| **Logs** | Canal y color **por evento**, historial y botón de limpiar |
| **Miembros** | Lista de usuarios con **paginación corregida** (cada página muestra un conjunto distinto de miembros ordenados por ID), ficha detallada, advertencias e historial de acciones |

## 🖼️ Subida de archivos

El panel guarda las imágenes subidas (fondos de bienvenida, imágenes de embed) en la carpeta `uploads/`, que se crea automáticamente y se sirve estáticamente en `/uploads`. Endpoints: `POST /api/upload` y `GET /api/list-uploads`.

## 🌐 Exponer el panel en Internet

Si publicas el panel fuera de `localhost`:

1. Pon `LOGIN = true`.
2. Define `PANEL_URL` con tu dominio público y añade `<PANEL_URL>/callback` y `<PANEL_URL>/verify-callback` en el portal de Discord.
3. Sirve el panel detrás de HTTPS (proxy inverso tipo Nginx/Caddy o un túnel).
4. Usa un `SESSION_SECRET` largo y aleatorio.

Referencia completa de endpoints: **[[API-del-Panel]]**.

## 🔧 Correcciones recientes

| Componente | Corrección |
|---|---|
| **Auto-Rol → Emoji** | Selector visual con emojis del servidor (imagen real) y unicode más populares, con búsqueda en tiempo real |
| **Auto-Rol → Color** | Paleta de color de embed con presets rápidos + input hex con previsualización |
| **Verificación** | Bug de anidamiento HTML corregido: los ajustes avanzados ya no aparecen en otras secciones |
| **Lista de Miembros** | Paginación reescrita: cursor `after` calculado manualmente sobre lista ordenada por ID; `afterStack` del frontend corregido |
