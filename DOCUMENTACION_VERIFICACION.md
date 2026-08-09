# 📋 Documentación – Sistema de Verificación

Esta guía explica cómo configurar el **Sistema de Verificación** de tu bot tanto en el **Discord Developer Portal** como en el **Panel de Administración**.

---

## 🔧 Parte 1 – Configuración en el Discord Developer Portal

### 1. Accede al portal

Abre → https://discord.com/developers/applications  
Selecciona tu aplicación (ID).

---

### 2. Añadir las Redirect URIs (OBLIGATORIO para OAuth2)

1. En el menú izquierdo haz clic en **OAuth2 → General**.
2. Baja hasta la sección **Redirects**.
3. Haz clic en **Add Redirect** y añade EXACTAMENTE estas dos URLs:

```
http://EJEMBLO/callback
http:/EJEMBLO/verify-callback
```

⚠️ Si la URL no coincide exactamente (incluyendo http:// y el puerto), Discord rechazará la autenticación.

4. Haz clic en **Save Changes**.

---

### 3. Scopes necesarios para OAuth2

| Scope | Para qué sirve |
|---|---|
| identify | Leer el ID, nombre y avatar del usuario |
| guilds.join | Añadir automáticamente al usuario al servidor si salió |

---

### 4. Bot Permissions necesarias

En **Bot → Privileged Gateway Intents**, activa:

- ✅ SERVER MEMBERS INTENT – necesario para gestionar miembros.
- ✅ MESSAGE CONTENT INTENT – necesario para detectar reacciones en mensajes.

---

## 🖥️ Parte 2 – Configuración en el Panel de Admin

### Método 1 – Verificación por Reacción 👍

| Campo | Descripción |
|---|---|
| Activado | Activa/desactiva este método |
| Emoji | El emoji que el usuario debe añadir como reacción (por defecto ✅) |
| Rol | Rol que recibirá el usuario al reaccionar |
| Canal | Canal donde se enviará el mensaje de verificación |
| Mensaje | Texto del embed que verá el usuario |

### Método 2 – Verificación por OAuth2 🔐

| Campo | Descripción |
|---|---|
| Activado | Activa/desactiva este método |
| Rol | Rol que recibirá el usuario tras autorizar |
| Canal | Canal donde se enviará el botón de verificación |
| Redirect URI | http://EJEMBLO/verify-callback |

---

## 🔑 Variables de Entorno requeridas (.env)

```
CLIENT_ID=
CLIENT_SECRET=
```

---

## ✅ Checklist rápido

- Redirect URIs añadidas en Discord Developer Portal
- SERVER MEMBERS INTENT activado
- MESSAGE CONTENT INTENT activado
- CLIENT_ID y CLIENT_SECRET en el .env
- Método de reacción configurado (emoji + rol + canal)
- Método OAuth2 configurado (rol + canal + redirect URI)
- Mensajes de verificación enviados desde el panel
