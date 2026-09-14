const fs = require('fs');
const path = require('path');

const webFile = path.join(__dirname, '..', 'WEB', 'admin-panel.js');
let code = fs.readFileSync(webFile, 'utf8');

console.log('Patching admin-panel.js...');

// Add require configManager at top if not exists
if (!code.includes("const configManager = require('../scripts/config-manager.js');")) {
    code = code.replace(
        "const fs = require('fs');",
        "const fs = require('fs');\nconst configManager = require('../scripts/config-manager.js');"
    );
}

// Logs
code = code.replace(
    /const config = loadLogsConfig\(\);\s*res\.json\(config\[req\.params\.guildId\] \|\| \{\}\);/,
    "const config = configManager.loadGuildConfig(req.params.guildId, 'logs', {});\n    res.json(config || {});"
);
code = code.replace(
    /const config = loadLogsConfig\(\);\s*config\[req\.params\.guildId\] = req\.body;\s*saveLogsConfig\(config\);/,
    "configManager.saveGuildConfig(req.params.guildId, 'logs', req.body);"
);

// Welcome
code = code.replace(
    /const config = loadWelcomeConfig\(\);\s*res\.json\(config\[req\.params\.guildId\] \|\| \{ enabled: false, channel: '', message: '¡Bienvenido \{user\} a \{server\}!', color: '#5865f2' \}\);/,
    "const config = configManager.loadGuildConfig(req.params.guildId, 'welcome', { enabled: false, channel: '', message: '¡Bienvenido {user} a {server}!', color: '#5865f2' });\n    res.json(config);"
);
code = code.replace(
    /const config = loadWelcomeConfig\(\);\s*config\[req\.params\.guildId\] = req\.body;\s*saveWelcomeConfig\(config\);/,
    "configManager.saveGuildConfig(req.params.guildId, 'welcome', req.body);"
);

// Giveaways
code = code.replace(
    /function getGuildGiveawayData\(guildId\) \{\s*const config = loadGiveawaysConfig\(\);\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*if \(\!config\.guilds\[guildId\]\) \{\s*config\.guilds\[guildId\] = \{\s*giveaways: \[\],\s*permissions: \{\s*canReroll: \[\],\s*canFinish: \[\],\s*canEdit: \[\]\s*\}\s*\};\s*\}\s*return config\.guilds\[guildId\];\s*\}/,
    `function getGuildGiveawayData(guildId) {
    const data = configManager.loadGuildConfig(guildId, 'giveaways', {});
    if (!data.giveaways) {
        data.giveaways = [];
        data.permissions = { canReroll: [], canFinish: [], canEdit: [] };
    }
    return data;
}`
);
code = code.replace(
    /function saveGuildGiveawayData\(guildId, data\) \{\s*const config = loadGiveawaysConfig\(\);\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*config\.guilds\[guildId\] = data;\s*saveGiveawaysConfig\(config\);\s*\}/,
    `function saveGuildGiveawayData(guildId, data) {
    configManager.saveGuildConfig(guildId, 'giveaways', data);
}`
);

// Tickets
code = code.replace(
    /let config = \{\};\s*try \{ config = JSON\.parse\(fs\.readFileSync\(ticketsConfigPath, 'utf8'\)\); \} catch \(e\) \{ \}\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*config\.guilds\[guildId\] = req\.body;\s*fs\.writeFileSync\(ticketsConfigPath, JSON\.stringify\(config, null, 2\)\);/,
    "configManager.saveGuildConfig(guildId, 'tickets', req.body);"
);
// In /api/guilds/:guildId/tickets-config
code = code.replace(
    /let config = \{ guilds: \{\} \};\s*try \{ config = JSON\.parse\(fs\.readFileSync\(ticketsConfigPath, 'utf8'\)\); \} catch \(e\) \{ \}\s*const guildConfig = config\.guilds\?\.\[req\.params\.guildId\] \|\| \{ enabled: false, categoryId: '', adminRoleId: '' \};\s*res\.json\(guildConfig\);/,
    "const guildConfig = configManager.loadGuildConfig(req.params.guildId, 'tickets', { enabled: false, categoryId: '', adminRoleId: '' });\n    res.json(guildConfig);"
);

// Suggestions
code = code.replace(
    /let config = \{ guilds: \{\} \};\s*try \{ config = JSON\.parse\(fs\.readFileSync\(suggestionsConfigPath, 'utf8'\)\); \} catch \(e\) \{ \}\s*const guildConfig = config\.guilds\?\.\[guildId\] \|\| \{ enabled: false \};\s*res\.json\(guildConfig\);/,
    "const guildConfig = configManager.loadGuildConfig(guildId, 'suggestions', { enabled: false });\n    res.json(guildConfig);"
);
code = code.replace(
    /let config = \{\};\s*try \{ config = JSON\.parse\(fs\.readFileSync\(suggestionsConfigPath, 'utf8'\)\); \} catch \(e\) \{ \}\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*config\.guilds\[guildId\] = req\.body;\s*fs\.writeFileSync\(suggestionsConfigPath, JSON\.stringify\(config, null, 2\)\);/g,
    "configManager.saveGuildConfig(guildId, 'suggestions', req.body);"
);
code = code.replace(
    /let config = \{\};\s*try \{ config = JSON\.parse\(fs\.readFileSync\(suggestionsConfigPath, 'utf8'\)\); \} catch \(e\) \{ \}\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*if \(\!config\.guilds\[guildId\]\) config\.guilds\[guildId\] = \{\};\s*config\.guilds\[guildId\]\.channelId = channelId;\s*fs\.writeFileSync\(suggestionsConfigPath, JSON\.stringify\(config, null, 2\)\);/g,
    "const guildConfig = configManager.loadGuildConfig(guildId, 'suggestions', {});\n    guildConfig.channelId = channelId;\n    configManager.saveGuildConfig(guildId, 'suggestions', guildConfig);"
);
code = code.replace(
    /let config = \{\};\s*try \{ config = JSON\.parse\(fs\.readFileSync\(suggestionsConfigPath, 'utf8'\)\); \} catch \(e\) \{ \}\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*if \(\!config\.guilds\[guildId\]\) config\.guilds\[guildId\] = \{\};\s*config\.guilds\[guildId\]\.enabled = enabled;\s*fs\.writeFileSync\(suggestionsConfigPath, JSON\.stringify\(config, null, 2\)\);/g,
    "const guildConfig = configManager.loadGuildConfig(guildId, 'suggestions', {});\n    guildConfig.enabled = enabled;\n    configManager.saveGuildConfig(guildId, 'suggestions', guildConfig);"
);


// Auto Responses
code = code.replace(
    /function loadAutoResponses\(\) \{\s*try \{\s*if \(fs\.existsSync\(autoResponsesPath\)\) \{\s*return JSON\.parse\(fs\.readFileSync\(autoResponsesPath, 'utf8'\)\);\s*\}\s*\} catch \(e\) \{ console\.error\('Error cargando auto-responses\.json:', e\); \}\s*return \{ guilds: \{\} \};\s*\}/,
    "function loadAutoResponses(guildId) { return { guilds: { [guildId]: configManager.loadGuildConfig(guildId, 'autoresponses', []) } }; }"
);
code = code.replace(
    /function saveAutoResponses\(config\) \{\s*try \{\s*fs\.writeFileSync\(autoResponsesPath, JSON\.stringify\(config, null, 2\), 'utf8'\);\s*\} catch \(e\) \{\s*console\.error\('Error guardando auto-responses\.json:', e\);\s*\}\s*\}/,
    "function saveAutoResponses(guildId, config) { configManager.saveGuildConfig(guildId, 'autoresponses', config.guilds[guildId] || []); }"
);

code = code.replace(
    /const config = loadAutoResponses\(\);\s*const responses = config\.guilds\?\.\[req\.params\.guildId\] \|\| \[\];/,
    "const responses = configManager.loadGuildConfig(req.params.guildId, 'autoresponses', []);"
);

code = code.replace(
    /const config = loadAutoResponses\(\);\s*if \(\!config\.guilds\) config\.guilds = \{\};\s*config\.guilds\[guildId\] = req\.body;\s*saveAutoResponses\(config\);/,
    "configManager.saveGuildConfig(guildId, 'autoresponses', req.body);"
);


// Staff Roles API
code = code.replace(
    /let staffRoles = \{\};\s*try \{ staffRoles = JSON\.parse\(fs\.readFileSync\(staffRolesPath, 'utf8'\)\); \} catch \(e\) \{ \}/g,
    "let staffRoles = configManager.loadGuildConfig(guildId, 'staffroles', {});"
);
code = code.replace(
    /if \(\!staffRoles\[guildId\]\) staffRoles\[guildId\] = \{\};\s*staffRoles\[guildId\]\.commandRoles = roles;\s*fs\.writeFileSync\(staffRolesPath, JSON\.stringify\(staffRoles, null, 2\)\);/g,
    "staffRoles.commandRoles = roles;\n    configManager.saveGuildConfig(guildId, 'staffroles', staffRoles);"
);
code = code.replace(
    /if \(\!staffRoles\[guildId\]\) staffRoles\[guildId\] = \{\};\s*staffRoles\[guildId\]\.ticketStaffRole = ticketStaffRole;\s*fs\.writeFileSync\(staffRolesPath, JSON\.stringify\(staffRoles, null, 2\)\);/g,
    "staffRoles.ticketStaffRole = ticketStaffRole;\n    configManager.saveGuildConfig(guildId, 'staffroles', staffRoles);"
);

// get admin staff roles
code = code.replace(
    /const guildRoles = staffRoles\[guildId\] \|\| \{\};\s*res\.json\(guildRoles\);/g,
    "res.json(staffRoles);"
);

fs.writeFileSync(webFile, code, 'utf8');
console.log('admin-panel.js patched successfully!');
