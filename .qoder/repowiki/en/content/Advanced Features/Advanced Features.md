# Advanced Features

<cite>
**Referenced Files in This Document**   
- [index.js](file://index.js)
- [COMANDOS-SOPORTE-VOZ.md](file://COMANDOS-SOPORTE-VOZ.md)
- [README.md](file://README.md)
</cite>

## Table of Contents
1. [Support Voice System with Automated Queue Management](#support-voice-system-with-automated-queue-management)
2. [Anti-Raid System with Progressive Punishment](#anti-raid-system-with-progressive-punishment)
3. [Security Features: Whitelist Management](#security-features-whitelist-management)
4. [Domain Model for User Interactions](#domain-model-for-user-interactions)
5. [Common Issues and Solutions](#common-issues-and-solutions)

## Support Voice System with Automated Queue Management

The bot implements a sophisticated support voice system that manages user queues through Discord.js voice connections and real-time message tracking. This system allows users to join a waiting room voice channel and be automatically queued for support, with staff members able to process requests through a command-based interface.

When a user joins the designated waiting room (identified by names containing "espera", "waiting", or "sala-de-espera"), they are automatically added to the queue. The system tracks their entry time using the `client.voiceSupportWaitingTime` collection, which stores timestamps for each user in each server. This enables the enforcement of minimum wait times and prevents abuse of the support system.

Staff members with the appropriate role (configured via `/voicesupportnextrole`) can use the `!nex` or `!next` command in the support log channel to move the next user in queue to their support channel. If the staff member isn't already in a support channel, the bot automatically moves them to the first available one. This functionality is implemented through Discord.js voice state updates and channel management, using the `voice.setChannel()` method to move users between voice channels.

The system provides real-time feedback by updating queue status messages every second with the current wait time. These messages are tracked in the `client.voiceSupportQueueMessages` collection, allowing the bot to edit the message content dynamically. The wait time is displayed in a human-readable format showing minutes and seconds, providing transparency to users about their position in the queue.

For users who need to leave before receiving support, the system enforces a 3-minute minimum stay requirement. If a user leaves before this time, they are automatically sanctioned. This is tracked by comparing the user's entry timestamp with their exit time when they leave the waiting room channel. The system also sends automated warnings after 1 minute of waiting if the user hasn't communicated, encouraging them to indicate they still need assistance.

**Section sources**
- [index.js](file://index.js#L530-L706)
- [index.js](file://index.js#L729-L800)
- [index.js](file://index.js#L2614-L2750)
- [COMANDOS-SOPORTE-VOZ.md](file://COMANDOS-SOPORTE-VOZ.md#L124-L147)

## Anti-Raid System with Progressive Punishment

The bot's anti-raid system implements comprehensive protection against various forms of server disruption, including spam, rapid message repetition, unauthorized bot invitations, and channel spam. The system uses Discord.js message tracking and audit log monitoring to detect and respond to suspicious activities in real-time.

Message tracking is implemented through the `client.antiRaid.messageTracker` collection, which maintains a record of recent messages from each user within a configurable time window (default 5 seconds). When a user sends a message, it's added to their message history along with a timestamp. The system then filters this history to include only messages within the time window, effectively creating a sliding window of recent activity.

For spam detection, the system counts messages within this time window and compares it against a configurable threshold (default 5 messages). When a user exceeds this threshold, the system triggers anti-spam measures. Similarly, the system detects repetitive behavior by identifying when a user sends the same single letter three times within the time window, which is a common raid tactic.

The anti-raid system implements progressive punishment through the `client.antiRaid.infractions` collection, which tracks the number and timing of infractions for each user. When suspicious activity is detected, the system increments the user's infraction count and applies increasingly severe consequences according to a 10-level punishment hierarchy:

1. 1-minute timeout
2. 2-minute timeout
3. 5-minute timeout
4. 10-minute timeout
5. 15-minute timeout
6. 30-minute timeout
7. 1-hour timeout
8. 2-hour timeout
9. 1-day timeout
10. Permanent ban

The system automatically resets a user's infraction count after one hour without further incidents, preventing permanent penalties for isolated events. This progressive approach allows the bot to respond appropriately to the severity and persistence of disruptive behavior.

Additional anti-raid features include protection against unauthorized bot invitations (`antiBots`), which automatically kicks bots that join the server unless they're on the whitelist, and protection against channel spam (`antiChannelSpam`), which monitors rapid channel creation or deletion and removes all roles from offending users.

**Section sources**
- [index.js](file://index.js#L936-L953)
- [index.js](file://index.js#L1848-L2065)
- [index.js](file://index.js#L2121-L2214)
- [README.md](file://README.md#L62-L72)

## Security Features: Whitelist Management

The bot's security framework includes a comprehensive whitelist management system that allows server administrators to exempt specific users or roles from anti-raid protections. This feature is crucial for ensuring that trusted members and bots can operate without being mistakenly flagged by automated systems.

The whitelist is stored in the `client.antiRaid.whitelist` collection, which maintains a list of whitelisted user IDs for each server. The system provides a simple interface for checking whitelist status through the `isWhitelisted(guildId, userId)` function, which returns true if the specified user is on the whitelist for the given server.

The whitelist is checked at multiple points throughout the anti-raid system:
- Before applying anti-spam measures
- Before processing repeated letter detection
- Before handling unauthorized bot detection
- Before responding to channel creation/deletion spam

This ensures that whitelisted users are completely exempt from all anti-raid protections, allowing them to communicate freely without triggering automated responses. The system also automatically exempts users with administrator permissions, providing an additional layer of protection for server staff.

Whitelist management is integrated into the bot's command system, allowing administrators to add or remove users from the whitelist through dedicated commands. This enables dynamic adjustment of security settings based on evolving server needs and trusted member status.

The combination of user-based whitelisting and automatic administrator exemption creates a flexible security model that protects against raids while accommodating legitimate server operations and trusted members.

**Section sources**
- [index.js](file://index.js#L936-L940)
- [index.js](file://index.js#L1757-L1765)
- [index.js](file://index.js#L2103-L2104)
- [index.js](file://index.js#L2134-L2135)
- [index.js](file://index.js#L2181-L2182)

## Domain Model for User Interactions

The bot implements a sophisticated domain model for managing user interactions in both the support queue system and automated moderation responses. This model is built around several key data structures that track user state and facilitate automated workflows.

For the support voice system, the domain model includes:
- `client.voiceSupportQueue`: A Map that stores arrays of user IDs waiting for support, organized by server ID
- `client.voiceSupportWaitingTime`: A nested Map that tracks the entry timestamp for each user in the waiting room, organized by server and user ID
- `client.voiceSupportWarningSent`: A Map of Sets that tracks which users have received automated warnings, preventing duplicate notifications
- `client.voiceSupportQueueMessages`: A Map that stores message IDs for queue status updates, enabling real-time time tracking

These data structures work together to create a seamless user experience. When a user joins the waiting room, they're added to the queue and their entry time is recorded. The system then monitors their status, sending warnings after one minute and enforcing the three-minute minimum stay rule when they leave.

For automated moderation, the domain model includes:
- `client.antiRaid.messageTracker`: A Map that tracks recent messages from each user for spam detection
- `client.antiRaid.channelActions`: A Map that tracks channel creation and deletion actions for spam detection
- `client.antiRaid.infractions`: A Map that tracks progressive punishment levels for each user
- `client.antiRaid.whitelist`: A Map that stores whitelisted users exempt from anti-raid measures

The interaction between these components creates a comprehensive moderation system. Message tracking feeds into the infraction system, which applies progressive punishments while respecting whitelist exemptions. Channel action tracking operates similarly, detecting suspicious patterns of channel manipulation.

User state management is implemented through Discord.js's built-in member properties, particularly the `communicationDisabledUntil` property for timeout status. The system checks this property before applying additional punishments, preventing conflicts with existing timeouts and ensuring appropriate escalation of consequences.

This domain model enables the bot to maintain context across multiple interactions, providing consistent and intelligent responses to user behavior while preventing abuse of server resources.

**Section sources**
- [index.js](file://index.js#L510-L519)
- [index.js](file://index.js#L521-L528)
- [index.js](file://index.js#L2614-L2630)
- [index.js](file://index.js#L2731-L2750)

## Common Issues and Solutions

One common issue with the anti-raid system is false positives in spam detection, where legitimate rapid conversation is mistaken for raid behavior. This can occur in active discussion channels where multiple users are exchanging messages quickly. The system addresses this by focusing on individual user behavior rather than overall channel activity, reducing false positives from group conversations.

Another potential issue is the sanctioning of users who briefly enter the support waiting room by mistake. The system mitigates this by providing a one-minute warning before enforcing the three-minute minimum stay rule, giving users time to communicate their needs or leave without penalty. Additionally, staff members are automatically exempt from sanctioning, preventing accidental penalties when they enter the waiting room.

A challenge with the progressive punishment system is the potential for punishment escalation when multiple infractions occur in quick succession. The system addresses this by resetting the infraction count after one hour without incidents, preventing permanent penalties for temporary lapses in behavior. This creates a fair system that responds to persistent abuse while allowing for rehabilitation.

For the whitelist system, a potential issue is administrators forgetting to add trusted bots or members, resulting in them being incorrectly targeted by anti-raid measures. The system mitigates this risk by automatically exempting users with administrator permissions, ensuring that server staff are never affected by automated moderation.

Performance considerations include the memory usage of tracking multiple user states across servers. The system addresses this by using efficient Map and Set data structures and periodically cleaning up expired entries. The message tracking system automatically filters out messages outside the time window, preventing unbounded growth of the message history.

These solutions ensure that the bot's advanced features provide robust protection and efficient support management while minimizing negative impacts on legitimate users and server performance.

**Section sources**
- [index.js](file://index.js#L1890-L1895)
- [index.js](file://index.js#L1992-L1997)
- [index.js](file://index.js#L1902-L1904)
- [index.js](file://index.js#L1762-L1765)
- [index.js](file://index.js#L2003-L2006)