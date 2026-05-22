# Permission and Authorization Errors

<cite>
**Referenced Files in This Document**   
- [README.md](file://README.md)
- [index.js](file://index.js)
- [deploy-commands.js](file://deploy-commands.js)
- [deploy-commands-fixed.js](file://deploy-commands-fixed.js)
- [deploy-commands-simple.js](file://deploy-commands-simple.js)
- [deploy-commands-simple-fixed.js](file://deploy-commands-simple-fixed.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Permission Hierarchy in Discord](#permission-hierarchy-in-discord)
3. [Bot Permission Requirements](#bot-permission-requirements)
4. [User Permission Validation with PermissionsBitField](#user-permission-validation-with-permissionsbitfield)
5. "No tienes permiso para usar este comando" Errors
6. [Role Hierarchy Issues](#role-hierarchy-issues)
7. [Embed Sending Issues](#embed-sending-issues)
8. [Troubleshooting Permission-Related Problems](#troubleshooting-permission-related-problems)
9. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive guidance on permission and authorization errors in the Discord bot system. It covers the complete permission architecture, including Discord's permission hierarchy, bot permission requirements, user permission validation using PermissionsBitField, and common issues such as "No tienes permiso para usar este comando" messages. The document also addresses role hierarchy conflicts and embed sending problems, providing detailed troubleshooting steps for administrators and developers.

**Section sources**
- [README.md](file://README.md#L1-L188)
- [index.js](file://index.js#L1-L800)

## Permission Hierarchy in Discord
Discord implements a multi-layered permission system that governs user and bot interactions within servers. The permission hierarchy consists of several key components:

1. **User Roles**: Each user can have multiple roles, with permissions inherited from all assigned roles.
2. **Role Position**: Roles have a hierarchical position where higher-positioned roles override lower-positioned ones.
3. **Permission Overwrites**: Specific channels can have permission overwrites that modify role permissions for that channel.
4. **Owner Privileges**: Server owners have all permissions regardless of role assignments.
5. **Administrator Override**: Users with the Administrator permission receive all permissions automatically.

The bot respects this hierarchy in all operations, ensuring that users cannot perform actions beyond their permission level. For example, when a user attempts to kick another member, the bot verifies that the executor's highest role is above the target member's highest role in the hierarchy.

**Section sources**
- [README.md](file://README.md#L177-L179)
- [index.js](file://index.js#L5068-L5085)

## Bot Permission Requirements
The bot requires specific permissions to function properly, as documented in the README.md file. These permissions must be granted through the Discord developer portal and server settings:

- **Administrator**: Required for comprehensive administration commands
- **Manage Roles**: Needed for assigning/removing roles and creating color roles
- **Ban Members**: Required for banning users from the server
- **Manage Channels**: Necessary for creating ticket channels and temporary voice channels
- **Connect**: Required for connecting to voice channels
- **Speak**: Needed for audio playback in voice channels
- **Send Messages**: Essential for sending messages in text channels
- **Use Slash Commands**: Required for slash command functionality
- **Manage Messages**: Needed for mass message deletion and spam management
- **View Audit Log**: Required for security logging functionality

To properly configure these permissions, administrators should:
1. Visit the Discord Developer Portal
2. Navigate to the bot application
3. Copy the OAuth2 URL with the required permissions
4. Invite the bot to the server using this URL
5. Ensure the bot's role is positioned higher than roles it needs to manage

**Section sources**
- [README.md](file://README.md#L128-L141)
- [index.js](file://index.js#L492-L500)

## User Permission Validation with PermissionsBitField
The bot uses Discord.js's PermissionsBitField class to validate user permissions before executing commands. This implementation provides granular control over which users can access specific functionality.

The validation process follows this pattern:
1. Extract the command name from the interaction
2. Check if the user has the required permission flag
3. Return an ephemeral error message if permission is denied
4. Proceed with command execution if permission is granted

For example, the /ban command validation:
```javascript
if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
  return interaction.reply({ content: 'No tienes permiso para banear.', ephemeral: true });
}
```

The bot also implements a custom role-based permission system through the `/setroles` command, which allows administrators to restrict command usage to specific roles. This system uses a Map to store allowed role IDs per server and checks membership against these roles.

**Section sources**
- [index.js](file://index.js#L3616-L3618)
- [index.js](file://index.js#L4792-L4816)
- [index.js](file://index.js#L2984-L2997)

## "No tienes permiso para usar este comando" Errors
The error message "No tienes permiso para usar este comando" appears when a user attempts to execute a command without the required permissions. This is a deliberate security feature implemented throughout the bot's codebase.

Common causes of this error include:

1. **Missing Role Permissions**: The user doesn't have a role with the required permission flag
2. **Role-Based Command Restrictions**: The server administrator has restricted command usage to specific roles via `/setroles`
3. **Channel Permission Overwrites**: Channel-specific permissions are blocking command usage
4. **Hierarchy Violations**: The user's role position is too low to perform the action

The bot implements this check consistently across all moderation commands:
- `/ban`: Requires BanMembers permission
- `/kick`: Requires KickMembers permission
- `/timeout`: Requires ModerateMembers permission
- `/clear`: Requires ManageMessages permission
- `/say`: Requires ManageMessages permission

These checks use the PermissionsBitField.Flags enum to ensure type safety and prevent permission string errors.

**Section sources**
- [index.js](file://index.js#L4032-L4033)
- [index.js](file://index.js#L3797-L3799)
- [index.js](file://index.js#L3951-L3953)

## Role Hierarchy Issues
Role hierarchy conflicts occur when the bot's role is positioned below roles it needs to manage, preventing successful command execution. This is a common source of permission errors that cannot be resolved through permission configuration alone.

Key hierarchy rules in Discord:
1. A role can only manage roles below it in the hierarchy
2. The bot cannot assign roles higher than its highest role
3. Users cannot manage other users with equal or higher role positions
4. Role position is determined by drag-and-drop order in server settings

When the bot encounters a hierarchy issue, it returns specific error messages:
- "No puedo asignar ese rol porque está por encima (o al mismo nivel) de mi rol más alto" when the target role is above the bot's role
- "No puedes asignar roles a alguien con la misma o mayor jerarquía que tú" when a user tries to manage someone with equal/higher hierarchy

To resolve hierarchy issues:
1. Go to Server Settings → Roles
2. Drag the bot's role above all roles it needs to manage
3. Ensure the bot's role has all required permission flags
4. Save the changes and test the command again

**Section sources**
- [index.js](file://index.js#L5080-L5082)
- [index.js](file://index.js#L5084-L5086)
- [index.js](file://index.js#L5073-L5075)

## Embed Sending Issues
Embed sending failures typically occur due to permission issues or user settings that prevent message delivery. The bot implements comprehensive error handling for embed sending operations.

Common causes of embed sending failures:

1. **User DM Settings**: The recipient has disabled direct messages from server members
2. **Bot Blocking**: The user has blocked the bot
3. **Server Privacy Settings**: The bot and user don't share a mutual server
4. **Permission Restrictions**: The bot lacks Send Messages permission in the target channel

The bot handles these errors gracefully, particularly in moderation commands where notification DMs are sent:
```javascript
try {
  await user.send({ embeds: [dmEmbed] });
  console.log(`✅ MD enviado a ${user.tag} antes del ban`);
} catch (error) {
  if (error.code === 50007) {
    console.log(`⚠️ No se pudo enviar MD a ${user.tag}:`, error.message);
  }
}
```

Error code 50007 specifically indicates that direct messages cannot be sent to the user, usually due to privacy settings. The bot logs this information but continues with the moderation action to ensure server management functionality is not blocked by notification failures.

**Section sources**
- [index.js](file://index.js#L3624-L3637)
- [index.js](file://index.js#L586-L606)
- [index.js](file://index.js#L3167-L3187)

## Troubleshooting Permission-Related Problems
When encountering permission-related command failures or embed sending issues, follow this systematic troubleshooting approach:

### For "No tienes permiso" Errors:
1. **Verify User Permissions**: Ensure the user has the required role with appropriate permissions
2. **Check Role Configuration**: If `/setroles` has been used, confirm the user has one of the allowed roles
3. **Examine Channel Overwrites**: Check if channel-specific permissions are overriding role permissions
4. **Test with Administrator**: Verify the command works for users with Administrator permission

### For Bot Permission Issues:
1. **Reauthorize with Correct Permissions**: Use the OAuth2 URL with all required permissions
2. **Check Role Position**: Ensure the bot's role is above all roles it needs to manage
3. **Verify Permission Flags**: Confirm all required permission flags are enabled in the bot's role
4. **Test in Different Channels**: Check if the issue is channel-specific due to overwrites

### For Embed Sending Failures:
1. **Check User Privacy Settings**: The recipient may have disabled DMs from server members
2. **Verify Mutual Servers**: Ensure the bot and user share at least one server
3. **Test DM Functionality**: Attempt to send a simple text message to verify DM capability
4. **Review Error Codes**: Use specific error codes (like 50007) to diagnose the exact issue

### Diagnostic Commands:
- `/serverinfo`: Verify bot permissions and role hierarchy
- `/userinfo [user]`: Check user roles and permissions
- `/channelinfo [channel]`: Examine channel permission overwrites
- `/logs`: Review permission-related actions in the audit log

**Section sources**
- [index.js](file://index.js#L3616-L3618)
- [index.js](file://index.js#L5080-L5086)
- [index.js](file://index.js#L586-L606)

## Conclusion
Understanding and properly configuring permissions is crucial for the effective operation of this Discord bot. The system implements a robust permission validation framework using Discord.js's PermissionsBitField, respecting Discord's native permission hierarchy while adding custom role-based restrictions. Common issues like "No tienes permiso para usar este comando" messages can be resolved by ensuring proper role assignment, correct bot permission configuration, and appropriate role positioning in the hierarchy. Administrators should carefully configure the required bot permissions and maintain proper role ordering to prevent permission-related command failures and ensure smooth operation of all bot features.

**Section sources**
- [README.md](file://README.md#L128-L141)
- [index.js](file://index.js#L3616-L3618)
- [index.js](file://index.js#L5080-L5086)