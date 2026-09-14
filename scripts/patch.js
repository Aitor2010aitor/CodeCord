const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '..', 'index.js');
let code = fs.readFileSync(indexFile, 'utf8');

console.log('Patching index.js using object wrapping...');

// 1. staff-roles.json
code = code.replace(
  /JSON\.parse\(fs\.readFileSync\(path\.join\(__dirname, 'config', 'staff-roles\.json'\), 'utf8'\)\)/g,
  "(function(){ const gId = (typeof interaction !== 'undefined' ? interaction.guild?.id : (typeof message !== 'undefined' ? message.guild?.id : null)); return gId ? { [gId]: configManager.loadGuildConfig(gId, 'staffroles', {}) } : {}; })()"
);
code = code.replace(
  /fs\.writeFileSync\(path\.join\(__dirname, 'config', 'staff-roles\.json'\), JSON\.stringify\(([^,]+), null, 2\)\)/g,
  "(function(){ const gId = (typeof interaction !== 'undefined' ? interaction.guild?.id : (typeof message !== 'undefined' ? message.guild?.id : null)); if(gId) configManager.saveGuildConfig(gId, 'staffroles', $1[gId] || $1); })()"
);

// 2. color-roles.json
code = code.replace(
  /JSON\.parse\(fs\.readFileSync\(path\.join\(__dirname, 'config', 'color-roles\.json'\), 'utf8'\)\)/g,
  "(function(){ const gId = (typeof interaction !== 'undefined' ? interaction.guild?.id : (typeof message !== 'undefined' ? message.guild?.id : null)); return gId ? { [gId]: configManager.loadGuildConfig(gId, 'colorroles', {}) } : {}; })()"
);
code = code.replace(
  /fs\.writeFileSync\(path\.join\(__dirname, 'config', 'color-roles\.json'\), JSON\.stringify\(([^,]+), null, 2\)\)/g,
  "(function(){ const gId = (typeof interaction !== 'undefined' ? interaction.guild?.id : (typeof message !== 'undefined' ? message.guild?.id : null)); if(gId) configManager.saveGuildConfig(gId, 'colorroles', $1[gId] || $1); })()"
);

// 3. welcome-config.json
code = code.replace(
  /JSON\.parse\(fs\.readFileSync\(welcomeConfigPath, 'utf8'\)\)/g,
  "(function(){ const gId = (typeof member !== 'undefined' ? member.guild?.id : null); return gId ? { [gId]: configManager.loadGuildConfig(gId, 'welcome', {}) } : {}; })()"
);
code = code.replace(
  /fs\.writeFileSync\(welcomeConfigPath, JSON\.stringify\(([^,]+), null, 2\)\)/g,
  "(function(){ const gId = (typeof interaction !== 'undefined' ? interaction.guild?.id : (typeof message !== 'undefined' ? message.guild?.id : null)); if(gId) configManager.saveGuildConfig(gId, 'welcome', $1[gId] || $1); })()"
);

// 4. logs-config.json
code = code.replace(
  /JSON\.parse\(fs\.readFileSync\(logsConfigPath, 'utf8'\)\)/g,
  "(function(){ const gId = (typeof guild !== 'undefined' ? guild.id : (typeof interaction !== 'undefined' ? interaction.guild?.id : (typeof message !== 'undefined' ? message.guild?.id : null))); return gId ? { [gId]: configManager.loadGuildConfig(gId, 'logs', {}) } : {}; })()"
);
code = code.replace(
  /fs\.writeFileSync\(logsConfigPath, JSON\.stringify\(([^,]+), null, 2\)\)/g,
  "(function(){ const gId = (typeof guildId !== 'undefined' ? guildId : (typeof interaction !== 'undefined' ? interaction.guild?.id : null)); if(gId) configManager.saveGuildConfig(gId, 'logs', $1[gId] || $1); })()"
);

// 5. auto-responses.json
code = code.replace(
  /JSON\.parse\(fs\.readFileSync\(arPath, 'utf8'\)\)/g,
  "(function(){ const gId = message.guild.id; return { guilds: { [gId]: configManager.loadGuildConfig(gId, 'autoresponses', []) } }; })()"
);
code = code.replace(
  /fs\.writeFileSync\(arPath, JSON\.stringify\(([^,]+), null, 2\)\)/g,
  "(function(){ const gId = message.guild.id; configManager.saveGuildConfig(gId, 'autoresponses', $1.guilds[gId] || $1); })()"
);

// 6. suggestions-config.json
code = code.replace(
  /JSON\.parse\(fs\.readFileSync\(suggestionsConfigPath, 'utf8'\)\)/g,
  "(function(){ const gId = (typeof message !== 'undefined' ? message.guild?.id : (typeof interaction !== 'undefined' ? interaction.guild?.id : null)); return gId ? { guilds: { [gId]: configManager.loadGuildConfig(gId, 'suggestions', {}) } } : { guilds: {} }; })()"
);
code = code.replace(
  /fs\.writeFileSync\(suggestionsConfigPath, JSON\.stringify\(([^,]+), null, 2\)\)/g,
  "(function(){ const gId = (typeof message !== 'undefined' ? message.guild?.id : (typeof interaction !== 'undefined' ? interaction.guild?.id : null)); if(gId) configManager.saveGuildConfig(gId, 'suggestions', $1.guilds[gId] || $1); })()"
);

// 7. Fix ticketsConfigPath read at 7412
code = code.replace(
  /const ticketsConfigPath = path\.join\(__dirname, 'config', 'tickets-config\.json'\);\s*if \(fs\.existsSync\(ticketsConfigPath\)\) \{\s*const ticketsConfig = JSON\.parse\(fs\.readFileSync\(ticketsConfigPath, 'utf8'\)\);\s*if \(ticketsConfig\.guilds && ticketsConfig\.guilds\[interaction\.guild\.id\]\) \{\s*ticketLogChannelId = ticketsConfig\.guilds\[interaction\.guild\.id\]\.ticketLogChannelId;\s*\}\s*\}/g,
  `const ticketConfig = configManager.loadGuildConfig(interaction.guild.id, 'tickets', {});
          if (ticketConfig.ticketLogChannelId) {
            ticketLogChannelId = ticketConfig.ticketLogChannelId;
          }`
);

fs.writeFileSync(indexFile, code, 'utf8');
console.log('index.js patched successfully!');
