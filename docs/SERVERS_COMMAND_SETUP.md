# Server Tracking & /servers Command Setup

## Features Added

### 1. **Enhanced Logging**
The bot now logs detailed server information:
- **On Startup**: Lists all servers the bot is currently in
- **On Server Join**: Logs when the bot joins a new server with details (name, ID, member count, owner)
- **On Server Leave**: Logs when the bot leaves a server

### 2. **New `/servers` Command**
A dev-only command that displays all servers the bot is in with detailed information:
- Server name and ID
- Member count
- Owner information
- Join date
- Sorted by member count (largest first)

**Security**: This command only works in the designated dev server.

## Configuration

Add these to your `.env` file:

```env
# Dev Server ID - Required for /servers command
DEV_SERVER_ID=1356281989753475252

# Discord Logging Channels (Optional but recommended)
BOT_CATEGORY=1429572842537619538
LOGS_CHANNEL=1429572961861374214
JOIN_LEFT_CHANNEL=1429573015724884110
```

**Note**: The logging channels are optional. If not configured, the bot will only log to console.

## Usage

### 1. **Set Up Environment Variable**
Add the `DEV_SERVER_ID` to your `.env` file with your development server ID.

### 2. **Deploy Commands**
After setting the environment variable, deploy the commands:

```bash
npm run deploy
```

This will register the new `/servers` command globally.

### 3. **Restart the Bot**
Restart the bot to apply the changes:

```bash
npm start
```

### 4. **Using the /servers Command**
In your dev server (ID: 1356281989753475252), use:
```
/servers
```

The command will:
- Show all servers the bot is in
- Display server details in organized embeds
- Be visible only to you (ephemeral response)
- **Fail with an error** if used in any other server

## Discord Logging

With the logging channels configured, you'll see:

### In #logs Channel:
- ✅ Bot startup messages with server list
- ❌ Error notifications
- 📊 General bot events

### In #join-left Channel:
- 🟢 Server join notifications (with owner info)
- 🔴 Server leave notifications
- 🌐 Real-time server count

**Both channels will show beautiful embeds with all relevant information!**

## Security Notes

- The `/servers` command is restricted to your dev server only
- Command responses are ephemeral (only visible to the user)
- Server IDs and owner information are logged for administrative purposes
- Discord logging channels should be private and only accessible to admins
- All logs include timestamps for tracking

## Example Log Output

When the bot starts:
```
[INFO] BOT: Ready! Logged in as YourBot#1234
[INFO] BOT: Voice Read Bot is active in 5 servers
[INFO] BOT: Current servers:
[INFO] BOT:   - Dev Server (ID: 1356281989753475252, Members: 42)
[INFO] BOT:   - Gaming Community (ID: 1234567890, Members: 1500)
...
```

When someone adds the bot to a new server:
```
[INFO] GUILD_JOIN: Bot joined a new server: New Server (ID: 9876543210, Members: 250)
[INFO] GUILD_JOIN: Total servers: 6
[INFO] GUILD_JOIN: Server owner: Username#1234 (123456789)
```

## Troubleshooting

### Command Not Showing Up
- Make sure you ran `npm run deploy` after adding the command
- Wait up to 1 hour for global commands to sync (or use guild-specific deployment)
- Check that the bot has the `applications.commands` scope

### "Command Not Available" Error
- Verify `DEV_SERVER_ID` is set in your `.env` file
- Restart the bot after adding the environment variable

### "Unauthorized" Error
- This means you're trying to use the command in a server that's not your dev server
- Only the server with ID `1356281989753475252` can use this command

