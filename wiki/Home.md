# 🤖 Wiki de CodeCord

**CodeCord** es un bot multifuncional de Discord escrito en **Node.js + discord.js v14** que incluye un **panel web administrativo** (Express) para configurar todo el bot desde el navegador, sin tocar archivos JSON ni memorizar comandos.

* Repositorio: <https://github.com/aitor1234567899/CodeCord>
* Rama principal: `VERSION-9.0`
* Servidor de soporte: <https://discord.gg/PzSNTqFCuW>
* Licencia: ver [`LICENSE`](https://github.com/aitor1234567899/CodeCord/blob/VERSION-9.0/LICENSE)

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

* **Moderación**: ban, kick, timeout, warn, historial de sanciones, clear, slowmode, automod.
* **Anti-Raid**: 12 módulos de vigilancia (canales, roles, emojis, bans, webhooks) con ventana deslizante de 60 s, aislamiento automático y lista blanca.
* **Tickets**: paneles con hasta 5 botones, formularios, roles de soporte, transcripciones HTML.
* **Salas de voz temporales**: creación automática al entrar en «Crear sala» + panel privado de control (nombre, límite, privacidad, invitar, expulsar, ban, transferir…).
* **Soporte de voz por cola**: sala de espera, comando de siguiente turno y roles sancionados.
* **Bienvenidas**: mensaje personalizado + tarjeta gráfica generada con Jimp.
* **Logs**: canal y color configurables por evento, más «Actividad Reciente» en el panel.
* **Sorteos, sugerencias, auto-respuestas, censura, embeds, verificación OAuth2 o por reacción.**

---

> ℹ️ Esta wiki documenta el estado del código en la rama `VERSION-9.0`. Las versiones anteriores viven en las ramas `VERSION-1.5` … `VERSION-7.0`.
