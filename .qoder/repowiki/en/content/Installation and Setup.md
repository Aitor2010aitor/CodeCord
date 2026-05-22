# Installation and Setup

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [ESQUEMA_BOT.md](file://ESQUEMA_BOT.md)
- [package.json](file://package.json)
- [index.js](file://index.js)
- [deploy-commands.js](file://deploy-commands.js)
- [deploy-commands-simple.js](file://deploy-commands-simple.js)
- [deploy-commands-simple-fixed.js](file://deploy-commands-simple-fixed.js)
- [deploy-commands-fixed.js](file://deploy-commands-fixed.js)
- [clear-commands.js](file://clear-commands.js)
- [INICIAR-BOT.bat](file://INICIAR-BOT.bat)
- [.gitignore](file://.gitignore)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Environment Configuration](#environment-configuration)
5. [Deploying Slash Commands](#deploying-slash-commands)
6. [Starting the Bot](#starting-the-bot)
7. [Common Environment Issues and Fixes](#common-environment-issues-and-fixes)
8. [Practical Command Execution Examples](#practical-command-execution-examples)
9. [Troubleshooting Startup Errors](#troubleshooting-startup-errors)
10. [Best Practices for Credentials and Environments](#best-practices-for-credentials-and-environments)
11. [Conclusion](#conclusion)

## Introduction
This section explains how to install and set up the bot locally, register slash commands, and start the bot. It also covers environment configuration, common issues, and best practices for secure operation across development and production environments.

## Prerequisites
- Node.js runtime installed on your machine.
- npm (Node Package Manager) included with Node.js.
- A Discord bot application created with a token, Application ID, and a server (Guild) ID.
- Basic familiarity with the command line or terminal.

**Section sources**
- [README.md](file://README.md#L104-L127)
- [package.json](file://package.json#L1-L27)

## Step-by-Step Installation
Follow these steps to prepare and run the bot:

1. Install dependencies
   - Run the package manager install command to download all required libraries.
   - Reference: [README.md](file://README.md#L106-L109)

2. Create the environment file
   - Create a file named .env in the project root and add the required variables.
   - Reference: [README.md](file://README.md#L111-L116), [ESQUEMA_BOT.md](file://ESQUEMA_BOT.md#L170-L175)

3. Deploy slash commands
   - Register the bot’s slash commands for your server.
   - Reference: [README.md](file://README.md#L118-L121)

4. Start the bot
   - Launch the bot using the Node.js entry point or the Windows batch script.
   - Reference: [README.md](file://README.md#L123-L126), [INICIAR-BOT.bat](file://INICIAR-BOT.bat#L1-L23)

**Section sources**
- [README.md](file://README.md#L104-L127)
- [INICIAR-BOT.bat](file://INICIAR-BOT.bat#L1-L23)

## Environment Configuration
The bot reads configuration from environment variables loaded via dotenv. Ensure the following variables are present in your .env file:

- BOT_TOKEN: The bot’s token from the Discord Developer Portal.
- CLIENT_ID: The bot’s Application ID.
- GUILD_ID: The server ID where commands will be registered.

Notes:
- The deployment scripts extract a clean numeric server ID from the environment variable, handling potential extra characters.
- The bot’s main entry point loads dotenv at startup.

References:
- [deploy-commands.js](file://deploy-commands.js#L1-L10)
- [index.js](file://index.js#L1-L10)
- [.gitignore](file://.gitignore#L1-L10)

**Section sources**
- [deploy-commands.js](file://deploy-commands.js#L1-L10)
- [index.js](file://index.js#L1-L10)
- [.gitignore](file://.gitignore#L1-L10)

## Deploying Slash Commands
There are several scripts to register commands depending on your needs:

- Full command set registration
  - Use the primary deploy script to register all slash commands for your server.
  - Reference: [deploy-commands.js](file://deploy-commands.js#L1-L10), [README.md](file://README.md#L118-L121)

- Minimal command set registration
  - Use the simple deploy script to register a smaller subset of commands.
  - Reference: [deploy-commands-simple.js](file://deploy-commands-simple.js#L1-L20)

- Fixed minimal command set registration
  - Use the fixed simple deploy script for a consistent minimal set.
  - Reference: [deploy-commands-simple-fixed.js](file://deploy-commands-simple-fixed.js#L1-L20)

- Fixed full command set registration
  - Use the fixed deploy script to register a curated full set.
  - Reference: [deploy-commands-fixed.js](file://deploy-commands-fixed.js#L1-L20)

- Clearing commands
  - Use the clear script to remove all previously registered commands for the server and globally.
  - Reference: [clear-commands.js](file://clear-commands.js#L1-L20)

Deployment flow:
- The scripts load environment variables, construct the command payload, and call the Discord API to register commands for the configured Application ID and Guild ID.

**Section sources**
- [deploy-commands.js](file://deploy-commands.js#L1-L10)
- [deploy-commands-simple.js](file://deploy-commands-simple.js#L1-L20)
- [deploy-commands-simple-fixed.js](file://deploy-commands-simple-fixed.js#L1-L20)
- [deploy-commands-fixed.js](file://deploy-commands-fixed.js#L1-L20)
- [clear-commands.js](file://clear-commands.js#L1-L20)

## Starting the Bot
You can start the bot in two ways:

- Using Node.js directly
  - Run the main entry point script.
  - Reference: [README.md](file://README.md#L123-L126), [index.js](file://index.js#L1-L10)

- Using the Windows batch script
  - Execute the batch file to launch the bot and keep the window open after shutdown.
  - Reference: [INICIAR-BOT.bat](file://INICIAR-BOT.bat#L1-L23)

The batch script sets the working directory to the script location and runs the Node.js entry point, then pauses to show a message when the process exits.

**Section sources**
- [README.md](file://README.md#L123-L126)
- [INICIAR-BOT.bat](file://INICIAR-BOT.bat#L1-L23)
- [index.js](file://index.js#L1-L10)

## Common Environment Issues and Fixes
- Missing or empty environment variables
  - Symptom: Deployment or startup fails due to missing token or IDs.
  - Fix: Ensure .env contains valid values for BOT_TOKEN, CLIENT_ID, and GUILD_ID.
  - References: [deploy-commands.js](file://deploy-commands.js#L1-L10), [README.md](file://README.md#L111-L116)

- Invalid or malformed GUILD_ID
  - Symptom: Command registration fails or appears inconsistent.
  - Fix: The deployment script extracts a numeric ID from the environment variable. Ensure the value is a valid numeric server ID.
  - References: [deploy-commands.js](file://deploy-commands.js#L1-L10)

- .env file not loaded
  - Symptom: Variables are undefined during runtime.
  - Fix: Confirm that dotenv is required at the top of the entry point and deployment scripts.
  - References: [index.js](file://index.js#L1-L10), [deploy-commands.js](file://deploy-commands.js#L1-L10)

- .env ignored by version control
  - Symptom: .env is not committed or tracked.
  - Fix: The repository’s ignore file includes .env. Keep your local .env private and do not commit it.
  - References: [.gitignore](file://.gitignore#L1-L10)

**Section sources**
- [deploy-commands.js](file://deploy-commands.js#L1-L10)
- [README.md](file://README.md#L111-L116)
- [index.js](file://index.js#L1-L10)
- [.gitignore](file://.gitignore#L1-L10)

## Practical Command Execution Examples
Below are representative examples of how to use commands after deployment. These illustrate typical interactions and expected outcomes.

- Moderation
  - Kick a user with a reason.
    - Example: /kick usuario:@Spammer razon:Spam en el chat
    - Expected outcome: The target user is removed from the server.
  - Timeout a user for a specified duration.
    - Example: /timeout usuario:@Usuario duracion:10 razon:Flood
    - Expected outcome: The user is restricted from sending messages for the given time.
  - Warn a user.
    - Example: /warn usuario:@Usuario razon:Lenguaje inapropiado
    - Expected outcome: A warning record is created for the user.
  - View warnings for a user.
    - Example: /warnings usuario:@Usuario
    - Expected outcome: A list of past warnings is shown.
  - Clear recent messages.
    - Example: /clear cantidad:50
    - Expected outcome: Up to the specified number of recent messages are deleted.
  - Enable slow mode on a channel.
    - Example: /slowmode segundos:5
    - Expected outcome: Users must wait at least the specified seconds between messages.

- Communication
  - Post an announcement with an embed.
    - Example: /anuncio titulo:Evento canal:#anuncios descripcion:Evento mañana a las 20:00 color:#00FF00
    - Expected outcome: A formatted announcement is posted in the selected channel.
  - Create a poll.
    - Example: /poll pregunta:¿Te gusta el servidor? opciones:Sí,No,Más o menos
    - Expected outcome: A poll is created with the provided options.
  - Make the bot speak in a channel.
    - Example: /say mensaje:Hola a todos canal:#general
    - Expected outcome: The bot sends the message in the specified channel.

- Information
  - Check latency.
    - Example: /ping
    - Expected outcome: The bot responds with its latency and API response time.
  - Get server information.
    - Example: /serverinfo
    - Expected outcome: A detailed embed with server statistics is displayed.
  - Get member counts.
    - Example: /membercount
    - Expected outcome: Counts of total, human, and bot members are shown.

- Fun
  - Play a quick game:
    - Example: !8ball ¿Tendré suerte hoy?
    - Expected outcome: A random fortune is returned.
  - Flip a coin:
    - Example: !coinflip
    - Expected outcome: Either heads or tails is shown.
  - Roll dice:
    - Example: !dado 20
    - Expected outcome: A random number between 1 and the specified faces.
  - Rock-paper-scissors:
    - Example: !rps piedra
    - Expected outcome: The result of the match against the bot.
  - Roll D&D-style dice:
    - Example: !roll 2d6
    - Expected outcome: The sum of the rolled dice.
  - Get a meme:
    - Example: !meme
    - Expected outcome: A random meme link is posted.
  - Trivia:
    - Example: /trivia categoria:videojuegos
    - Expected outcome: An interactive trivia question is presented.
  - Compatibility:
    - Example: /ship persona1:@Usuario1 persona2:@Usuario2
    - Expected outcome: A compatibility percentage is generated.

These examples are derived from the official documentation and command lists.

**Section sources**
- [README.md](file://README.md#L1-L103)
- [LISTA-COMANDOS.md](file://LISTA-COMANDOS.md#L1-L200)

## Troubleshooting Startup Errors
- Invalid token
  - Symptom: The bot fails to connect or logs authentication errors.
  - Fix: Verify that BOT_TOKEN in .env matches the token from the Discord Developer Portal.
  - References: [README.md](file://README.md#L111-L116), [deploy-commands.js](file://deploy-commands.js#L1-L10)

- Missing permissions
  - Symptom: The bot cannot perform actions like sending messages, managing channels, or moving users.
  - Fix: Ensure the bot has the required permissions in the server settings and role hierarchy.
  - References: [README.md](file://README.md#L128-L141)

- Command registration errors
  - Symptom: Slash commands do not appear in the server after deployment.
  - Fix: Confirm CLIENT_ID and GUILD_ID are correct and that the bot has permission to manage commands in the server.
  - References: [deploy-commands.js](file://deploy-commands.js#L1-L10), [README.md](file://README.md#L118-L121)

- Duplicate or stale commands
  - Symptom: Confusion due to outdated or duplicated commands.
  - Fix: Clear existing commands and redeploy.
  - References: [clear-commands.js](file://clear-commands.js#L1-L20)

- Batch script does not start
  - Symptom: The batch file opens and immediately closes.
  - Fix: Ensure Node.js is installed and accessible in PATH; verify the batch file is executed from the correct directory.
  - References: [INICIAR-BOT.bat](file://INICIAR-BOT.bat#L1-L23)

**Section sources**
- [README.md](file://README.md#L111-L141)
- [deploy-commands.js](file://deploy-commands.js#L1-L10)
- [clear-commands.js](file://clear-commands.js#L1-L20)
- [INICIAR-BOT.bat](file://INICIAR-BOT.bat#L1-L23)

## Best Practices for Credentials and Environments
- Protect secrets
  - Never commit .env to version control. The repository already ignores .env and related files.
  - References: [.gitignore](file://.gitignore#L1-L10)

- Use separate environments
  - Maintain distinct .env files for development and production.
  - Keep production tokens and IDs separate from local copies.

- Validate environment variables
  - Add checks in your scripts to ensure required variables are present before proceeding.
  - References: [deploy-commands.js](file://deploy-commands.js#L1-L10), [index.js](file://index.js#L1-L10)

- Restrict command visibility
  - Use role-based restrictions for sensitive commands (e.g., moderation and administrative commands).
  - References: [README.md](file://README.md#L99-L103)

- Secure deployment
  - Store tokens securely and rotate them periodically.
  - Limit bot permissions to the minimum required for functionality.

**Section sources**
- [.gitignore](file://.gitignore#L1-L10)
- [deploy-commands.js](file://deploy-commands.js#L1-L10)
- [index.js](file://index.js#L1-L10)
- [README.md](file://README.md#L99-L103)

## Conclusion
You now have the steps to install dependencies, configure environment variables, deploy slash commands, and start the bot. Use the troubleshooting section to diagnose common issues and follow best practices to keep your environment secure and maintainable.