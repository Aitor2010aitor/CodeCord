// Archivo: src/commands/admin/userfolder.js

/**
 * @file userfolder.js
 * @description Comando /userfolder para generar un archivo TXT con el listado de miembros del servidor.
 */

const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'userfolder',
    description: 'Genera un archivo TXT con la lista de usuarios del servidor (solo administradores)',
    /**
     * Ejecuta el comando userfolder.
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const member = interaction.member;
        const hasPerm = member?.permissions?.has && (member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator));

        if (!hasPerm) {
            return interaction.reply({ content: '❌ Necesitas permisos de administrador o "Gestionar el servidor" para usar este comando.', ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Generando archivo TXT con el listado de usuarios de CodeCord...', ephemeral: true });

        try {
            await interaction.guild.members.fetch();
            const members = Array.from(interaction.guild.members.cache.values());
            members.sort((a, b) => a.user.username.localeCompare(b.user.username, 'es'));

            const lines = members.map((m, i) => `${i + 1}. ${m.user.username} (ID: ${m.user.id})`);

            const folderName = 'user folder';
            const folderPath = path.join(__dirname, '..', '..', '..', folderName);
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const ts = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const fileName = `users_${interaction.guild.id}_${ts}.txt`;
            const filePath = path.join(folderPath, fileName);

            const header = `LISTA DE USUARIOS DEL SERVIDOR: ${interaction.guild.name}\nGenerado por: CodeCord Bot\nTotal de usuarios: ${members.length}\nFecha: ${now.toLocaleString('es-ES')}\n--------------------------------------------------\n\n`;
            const fileContent = header + lines.join('\n');

            fs.writeFileSync(filePath, fileContent, 'utf8');

            const indexPath = path.join(folderPath, 'index_log.txt');
            const logLine = `${fileName} | ${interaction.guild.id} | ${interaction.guild.name} | ${members.length} | ${now.toLocaleString('es-ES')}\n`;
            fs.appendFileSync(indexPath, logLine, 'utf8');

            await interaction.editReply({ content: `✅ Archivo creado exitosamente en servidor: \`${filePath}\`` });
        } catch (err) {
            console.error('Error creando userfolder:', err);
            await interaction.editReply({ content: '❌ Error generando la lista de usuarios.' }).catch(() => {});
        }
    }
};
