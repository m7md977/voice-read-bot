# Discord Logging Setup Guide

## Overview

The bot now sends detailed logs to specific Discord channels in your dev server:

- **📋 Logs Channel**: General bot logs (startup, errors, important events)
- **🚪 Join-Left Channel**: Server join/leave notifications with server details

## Features

### 1. **Startup Logs**
When the bot starts, it sends a comprehensive startup message to the logs channel:
- Bot name and status
- Total servers and members
- List of servers (or top 5 if more than 10)
- Voice session count

### 2. **Join/Leave Notifications**
When the bot joins or leaves a server, it sends a notification to the join-left channel:
- 🟢 **Join**: Server name, ID, member count, owner info, total servers
- 🔴 **Leave**: Server name, ID, member count, total servers

### 3. **Error Logging**
Important errors can be logged to the logs channel with context.

## Configuration

### Step 1: Add Channel IDs to `.env`

Add these lines to your `.env` file with the actual IDs from your Discord server:

```env
# Dev Server Configuration
DEV_SERVER_ID=1356281989753475252

# Discord Logging Channels
BOT_CATEGORY=1429572842537619538
LOGS_CHANNEL=1429572961861374214
JOIN_LEFT_CHANNEL=1429573015724884110
```

### Step 2: Verify Channel Setup

Make sure your Discord server has:
1. A category named "BOT_CATEGORY" (or similar)
2. A text channel called **#logs** for general logs
3. A text channel called **#join-left** for server join/leave events

The bot needs:
- **View Channel** permission for both channels
- **Send Messages** permission for both channels
- **Embed Links** permission for both channels

### Step 3: Rebuild and Deploy

```bash
npm run build
npm run deploy
```

### Step 4: Restart the Bot

```bash
npm start
```

## What You'll See

### On Bot Startup
In **#logs** channel:
```
✅ Bot Started Successfully
Voice Read Bot#1234 is now online and ready!

🌐 Total Servers: 3
👥 Total Members: 1,542
🎤 Voice Sessions: 0

📋 Active Servers
• Dev Server (42 members)
• Gaming Community (1,000 members)
• Test Server (500 members)
```

### When Bot Joins a Server
In **#join-left** channel:
```
🟢 Bot Joined Server

📝 Server Name: New Community
🆔 Server ID: 1234567890123456789
👥 Member Count: 250
👑 Server Owner: Username#1234 (9876543210)
🌐 Total Servers: 4
```

### When Bot Leaves a Server
In **#join-left** channel:
```
🔴 Bot Left Server

📝 Server Name: Old Server
🆔 Server ID: 9876543210987654321
👥 Member Count: 150
🌐 Total Servers: 3
```

## Benefits

1. **Real-time Monitoring**: Instantly see when the bot joins or leaves servers
2. **Server Analytics**: Track member counts and server growth
3. **Owner Information**: Know who owns each server the bot joins
4. **Centralized Logging**: All important events in dedicated channels
5. **Error Tracking**: Quick notification of issues

## Optional: Disable Discord Logging

If you don't want Discord logging, simply don't set the channel IDs in your `.env` file. The bot will continue to log to console/files but won't send messages to Discord channels.

## Troubleshooting

### Logs Not Appearing in Discord

1. **Check channel IDs**: Make sure the IDs in `.env` match your Discord channels
2. **Verify permissions**: Bot needs View Channel, Send Messages, and Embed Links
3. **Check bot status**: Make sure the bot is online and connected
4. **Console logs**: Check console output for any error messages like:
   - "Logs channel not found or not a text channel"
   - "Failed to send log to Discord logs channel"

### Getting Channel IDs

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click the channel → Copy ID
3. Paste the ID into your `.env` file

### Channel Not Found Error

If you see "channel not found", verify:
- The channel exists in the same server as your bot
- The channel ID is correct (18-19 digits)
- The bot has been invited to the server
- The bot has proper permissions

## Additional Logging

The Discord logger can be used throughout the codebase for sending custom logs. Example:

```typescript
import { getDiscordLogger } from './utils/discordLogger';

const discordLogger = getDiscordLogger();
if (discordLogger) {
  await discordLogger.sendLog(
    'Custom Event',
    'Something important happened!',
    0x00ff00 // Green color
  );
}
```

## Privacy Note

The join/leave logs include:
- Server names and IDs
- Member counts
- Owner usernames and IDs

This information is only visible in your private dev server channels. Make sure these channels have proper permissions and are only accessible to trusted administrators.

