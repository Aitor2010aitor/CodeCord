# 🤝 Contribuir

## Ramas

El repositorio usa una rama por versión: `VERSION-1.5`, `VERSION-2.0`, … `VERSION-9.0` (rama por defecto y más reciente), además de `main`. Trabaja sobre la rama de la versión en desarrollo y abre el Pull Request contra ella.

## Convenciones de código

* JavaScript (CommonJS, `require`) con indentación de 4 espacios y comillas simples.
* Cada fichero empieza con una cabecera de comentario:

```js
// Archivo: src/commands/usuario/ping.js

/**
 * @file ping.js
 * @description Comando /ping para consultar la latencia del bot.
 */
```

* Documenta las funciones con JSDoc (`@param`, `@returns`).
* Los mensajes al usuario van en **español** y los embeds usan `EmbedBuilder`.
* Las respuestas privadas usan `flags: MessageFlags.Ephemeral` (no el antiguo `ephemeral: true`).
* Los logs de consola llevan prefijo: `✅ [CodeCord] ...`, `❌ [CodeCord] ...`.

## Añadir un comando

1. Crea `src/commands/usuario/micomando.js` (o en `administradores/`):

```js
// Archivo: src/commands/usuario/micomando.js

/**
 * @file micomando.js
 * @description Ejemplo de comando.
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'micomando',
    description: 'Descripción que verá el usuario',
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setTitle('Hola')
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed] });
    }
};
```

2. Añade el `SlashCommandBuilder` correspondiente en `scripts/deploy-commands.js` (incluidas sus opciones).
3. Ejecuta `npm run deploy` y reinicia el bot.

El handler carga la carpeta de forma recursiva, así que no hace falta registrar nada más.

## Añadir un evento

Crea un fichero en `src/events/` que exporte `{ name, once?, execute }` (o un array de esos objetos):

```js
module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(guild, client) {
        console.log(`✅ [CodeCord] Añadido a ${guild.name}`);
    }
};
```

## Añadir un sistema

Coloca la lógica reutilizable en `src/systems/`, exporta funciones puras y consúmelas desde comandos y eventos. Para persistir configuración usa siempre `scripts/config-manager.js` (`loadGuildConfig` / `saveGuildConfig`) en lugar de escribir ficheros a mano.

## Añadir una sección al panel

1. Endpoints en `WEB/admin-panel.js` siguiendo el patrón `/api/guilds/:guildId/<recurso>` y respetando la comprobación de permisos.
2. Interfaz en `WEB/admin.html` (SPA en un único fichero).
3. Documenta el endpoint en **[[API-del-Panel]]**.

## Antes de abrir el PR

* Comprueba que el bot arranca (`npm start`) sin errores en consola.
* Prueba el comando o la sección en un servidor de pruebas.
* No incluyas `.env`, `bot.lock`, `uploads/` ni datos reales de `servidores/`.
* Describe en el PR qué cambia y cómo probarlo.
