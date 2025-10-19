# Quick Start: Discord Logging

## 🚀 3 Simple Steps to Enable Discord Logging

### Step 1: Update `.env` File
Copy these lines to your `.env` file:

```env
# Dev Server & Logging Configuration
DEV_SERVER_ID=1356281989753475252
BOT_CATEGORY=1429572842537619538
LOGS_CHANNEL=1429572961861374214
JOIN_LEFT_CHANNEL=1429573015724884110
```

### Step 2: Build & Deploy
```bash
npm run build
npm run deploy
```

### Step 3: Start the Bot
```bash
npm start
```

## ✅ What to Expect

### In #logs Channel
- ✅ **Startup message** with server list and stats
- ❌ **Error notifications** when issues occur
- 📊 **General bot events**

### In #join-left Channel  
- 🟢 **Server joins** with owner information
- 🔴 **Server leaves** with member count
- 🌐 **Real-time server count** updates

### New /servers Command
In your dev server, type:
```
/servers
```
See a complete list of all servers with details!

## 📁 Channel Setup

Make sure your Discord has:
- ✅ #logs channel (ID: 1429572961861374214)
- ✅ #join-left channel (ID: 1429573015724884110)
- ✅ Bot has permissions: View Channel, Send Messages, Embed Links

## 🔍 Testing

1. **Start bot** → Check #logs for startup message
2. **Invite to test server** → Check #join-left for join message
3. **Remove from server** → Check #join-left for leave message
4. **Use /servers command** → See all servers listed

## 📚 Full Documentation

- `DISCORD_LOGGING_SETUP.md` - Complete setup guide
- `SERVERS_COMMAND_SETUP.md` - /servers command guide
- `CHANGELOG_DISCORD_LOGS.md` - Technical changes

## 💡 Tips

- Channels are **optional** - bot works without them
- Logs also appear in **console** as before
- All Discord messages are **embeds** with colors
- **Secure your channels** - they contain sensitive info!

---

**That's it! Your bot will now send beautiful log messages to Discord! 🎉**

