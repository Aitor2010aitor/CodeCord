// Archivo: src/events/reactionEvents.js

/**
 * @file reactionEvents.js
 * @description Eventos de reaccción ('messageReactionAdd' y 'messageReactionRemove') para autoroles y verificación por reacción.
 */

const configManager = require('../../scripts/config-manager.js');

module.exports = [
    {
        name: 'messageReactionAdd',
        once: false,
        /**
         * Manejador de adición de reacciones.
         * @param {MessageReaction} reaction 
         * @param {User} user 
         * @param {Client} client 
         */
        async execute(reaction, user, client) {
            if (user.bot) return;
            try {
                if (reaction.partial) await reaction.fetch();
                if (reaction.message.partial) await reaction.message.fetch();

                const guildId = reaction.message.guildId;
                if (!guildId) return;

                // Verificación por reacción
                const verificationConfig = configManager.loadGuildConfig(guildId, 'verification', {});
                if (verificationConfig && verificationConfig.reaction && verificationConfig.reaction.enabled) {
                    if (reaction.message.id === verificationConfig.reaction.messageId) {
                        const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
                        if (emojiIdentifier === verificationConfig.reaction.emoji) {
                            const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
                            if (member && verificationConfig.reaction.roleId) {
                                await member.roles.add(verificationConfig.reaction.roleId).catch(console.error);

                                const removeRoleId = verificationConfig.settings?.removeRoleId;
                                const unverifiedRoleId = verificationConfig.settings?.unverifiedRoleId;
                                const rolesToRemove = [removeRoleId, unverifiedRoleId].filter(id => id && typeof id === 'string' && id.trim().length > 0);
                                for (const rId of rolesToRemove) {
                                    if (member.roles.cache.has(rId)) {
                                        await member.roles.remove(rId).catch(console.error);
                                    }
                                }
                            }
                        }
                    }
                }

                // Autorol por reaciones
                const autoroles = configManager.loadGuildConfig(guildId, 'autoroles', []);
                const config = autoroles.find(a => a.messageId === reaction.message.id);
                if (!config) return;

                const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
                const targetReaction = config.reactions.find(r => r.emoji === emojiIdentifier);

                if (targetReaction) {
                    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
                    if (member) {
                        await member.roles.add(targetReaction.roleId).catch(console.error);
                    }
                }
            } catch (e) {
                console.error('Error en messageReactionAdd:', e);
            }
        }
    },
    {
        name: 'messageReactionRemove',
        once: false,
        /**
         * Manejador de remoción de reacciones.
         * @param {MessageReaction} reaction 
         * @param {User} user 
         * @param {Client} client 
         */
        async execute(reaction, user, client) {
            if (user.bot) return;
            try {
                if (reaction.partial) await reaction.fetch();
                if (reaction.message.partial) await reaction.message.fetch();

                const guildId = reaction.message.guildId;
                if (!guildId) return;

                const verificationConfig = configManager.loadGuildConfig(guildId, 'verification', {});
                if (verificationConfig && verificationConfig.reaction && verificationConfig.reaction.enabled) {
                    if (reaction.message.id === verificationConfig.reaction.messageId) {
                        const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
                        if (emojiIdentifier === verificationConfig.reaction.emoji) {
                            const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
                            if (member && verificationConfig.reaction.roleId) {
                                await member.roles.remove(verificationConfig.reaction.roleId).catch(console.error);
                            }
                        }
                    }
                }

                const autoroles = configManager.loadGuildConfig(guildId, 'autoroles', []);
                const config = autoroles.find(a => a.messageId === reaction.message.id);
                if (!config) return;

                const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
                const targetReaction = config.reactions.find(r => r.emoji === emojiIdentifier);

                if (targetReaction) {
                    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
                    if (member) {
                        await member.roles.remove(targetReaction.roleId).catch(console.error);
                    }
                }
            } catch (e) {
                console.error('Error en messageReactionRemove:', e);
            }
        }
    }
];
