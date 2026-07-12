# 🚀 Deploying to Discloud

## 📋 Prerequisites

1. ✅ Discloud account ([https://discloud.app](https://discloud.app))
2. ✅ Discord Bot Token
3. ✅ Discord Application Client ID
4. ✅ ElevenLabs API Key (for TTS)

---

## 🔧 Pre-Deployment Steps

### **1. Build Your Bot**
```bash
npm run build
```
This compiles TypeScript to JavaScript in the `dist/` folder.

### **2. Verify Build**
Check that `dist/` folder contains compiled JavaScript files:
- ✅ `dist/index.js`
- ✅ `dist/commands/read.js`
- ✅ `dist/services/voice/VoiceReadManager.js`
- ✅ `dist/config.js`

### **3. Test Locally First** (Recommended)
```bash
npm start
```
Make sure the bot works locally before deploying!

---

## 📦 Deployment Methods

### **Method 1: Discloud Website (Recommended)**

#### **Step 1: Prepare Files**
Create a ZIP file containing:
- ✅ `dist/` folder (compiled code)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `discloud.config`
- ❌ **DO NOT include**: `src/`, `node_modules/`, `.env`, `.md` files

#### **Step 2: Upload to Discloud**
1. Go to [https://discloud.app/dashboard](https://discloud.app/dashboard)
2. Click **"Upload Bot"**
3. Upload your ZIP file
4. Wait for deployment to complete

#### **Step 3: Set Environment Variables**
In the Discloud dashboard, go to **Bot Settings** → **Environment Variables** and add:

```
BOT_TOKEN=your_actual_discord_bot_token
CLIENT_ID=your_actual_discord_client_id
GLOBAL_COMMANDS=true
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_TTS_MODEL_ID=eleven_turbo_v2_5
```

**Optional** (if you want bypass role):
```
BYPASSROLEID=your_role_id
```

#### **Step 4: Start Bot**
Click **"Start Bot"** in the Discloud dashboard.

---

### **Method 2: Discloud CLI**

#### **Step 1: Install Discloud CLI**
```bash
npm install -g discloud
```

#### **Step 2: Login**
```bash
discloud login
```
Enter your Discloud API token (found in dashboard settings).

#### **Step 3: Upload Bot**
```bash
# From your bot directory
discloud upload
```

#### **Step 4: Configure Environment Variables**
Use the Discloud dashboard (see Method 1, Step 3) to set environment variables.

#### **Step 5: Start Bot**
```bash
discloud start YOUR_BOT_ID
```

---

## 🎛️ Discloud Configuration Explained

### **`discloud.config` File:**

```
NAME=VCReader                  # Your bot's name
AVATAR=https://...             # Bot avatar URL (optional)
TYPE=bot                       # Application type
MAIN=dist/index.js            # Entry point (compiled JavaScript)
RAM=512                        # RAM allocation in MB
AUTORESTART=true              # Auto-restart on crash
VERSION=recommended           # Node.js version (use recommended)
APT=tools                     # Install system tools (needed for voice/ffmpeg)
```

### **RAM Requirements:**
- **512 MB**: Good for 1-5 servers (recommended starting point)
- **1024 MB**: For 10+ servers or heavy usage
- **2048 MB**: For 50+ servers

**Your bot is lightweight (~200-300 KB per session), so 512 MB should be fine unless you have many active servers.**

---

## 🔐 Important Security Notes

### **⚠️ NEVER commit `.env` file or secrets to Git!**

✅ **Do This:**
- Store secrets in Discloud environment variables (dashboard)
- Use `.env.example` as a template (no real values)
- Add `.env` to `.gitignore` (already done)

❌ **Don't Do This:**
- Don't put tokens in `discloud.config`
- Don't commit `.env` with real tokens
- Don't share your `.env` file

---

## 🚦 Post-Deployment

### **1. Deploy Slash Commands**
After bot starts, you need to register slash commands with Discord:

**Option A: Run locally (one-time setup)**
```bash
# Create a temporary .env file with your tokens
npm run deploy-commands
```

**Option B: Use Discloud terminal**
In Discloud dashboard → Terminal:
```bash
node dist/deploy-commands.js
```

### **2. Verify Bot is Online**
1. Check Discloud dashboard - status should be **"Online"** (green)
2. Check Discord - bot should show as online
3. Test command: `/read action:start` in a voice channel

### **3. Monitor Logs**
In Discloud dashboard → Logs, you should see:
```
[INFO] [BOT] Ready! Logged in as YourBot#1234
[INFO] [BOT] Voice Read Bot is active in X servers
```

---

## 🐛 Troubleshooting

### **Bot shows offline:**
- ✅ Check BOT_TOKEN is correct in environment variables
- ✅ Verify bot has proper intents enabled in Discord Developer Portal
- ✅ Check Discloud logs for errors

### **Commands don't appear:**
- ✅ Run `npm run deploy-commands` (or deploy-commands.js on Discloud)
- ✅ Verify CLIENT_ID is correct
- ✅ Wait 5-10 minutes for Discord to sync commands

### **Voice features don't work:**
- ✅ Verify `APT=tools` is in `discloud.config` (needed for ffmpeg)
- ✅ Check ELEVENLABS_API_KEY is set correctly
- ✅ Verify bot has voice permissions in your Discord server
- ✅ Check ElevenLabs API quota/credits

### **Bot crashes/restarts frequently:**
- ✅ Check Discloud logs for error messages
- ✅ Increase RAM allocation if needed
- ✅ Verify all environment variables are set

### **"Module not found" errors:**
- ✅ Ensure `package.json` includes all dependencies
- ✅ Run `npm run build` before uploading
- ✅ Include `package-lock.json` in your upload

---

## 📊 Monitoring & Maintenance

### **Logs:**
Access logs in Discloud dashboard to monitor:
- Bot startup messages
- Voice reading activity
- Queue warnings (if queue fills up)
- Connection errors

### **Key Log Messages to Watch:**
- ✅ `Successfully connected to voice channel` - Good
- ⚠️ `Queue is full` - Many messages being sent (normal in busy channels)
- ❌ `Failed to connect to voice channel` - Check bot permissions
- ❌ `ElevenLabs TTS failed` - Check API key or quota

### **Usage Tips:**
- Monitor your ElevenLabs API usage/credits
- Check Discloud resource usage if bot slows down
- Review logs weekly for any recurring errors

---

## 🔄 Updating Your Bot

### **1. Make Changes Locally**
Edit your source files in `src/`

### **2. Build**
```bash
npm run build
```

### **3. Test Locally**
```bash
npm start
```

### **4. Deploy Update**
Create new ZIP with updated `dist/` folder and upload to Discloud.

**OR** use CLI:
```bash
discloud upload
```

---

## 💰 Discloud Pricing

**Free Tier:**
- 1 bot
- 256 MB RAM
- Basic support

**Pro Plans:**
- More RAM
- Multiple bots
- Priority support
- Better uptime

**For this bot:** Free tier should work for small servers, upgrade if you need more resources.

---

## ✅ Deployment Checklist

Before uploading to Discloud:

- [ ] Run `npm run build` successfully
- [ ] Test bot locally with `npm start`
- [ ] Create ZIP with: `dist/`, `package.json`, `package-lock.json`, `discloud.config`
- [ ] Upload to Discloud
- [ ] Set all environment variables in dashboard
- [ ] Start bot
- [ ] Deploy slash commands
- [ ] Test `/read action:start` in Discord
- [ ] Monitor logs for errors

---

## 🆘 Support

**Discloud Support:**
- [Discloud Documentation](https://docs.discloud.app)
- [Discloud Discord Server](https://discord.gg/discloud)

**Bot Issues:**
- Check `ANALYSIS.md` for bot-specific details
- Review logs in Discloud dashboard
- Verify environment variables are set correctly

---

**Your bot is now ready for deployment! 🚀**

Remember: Always test locally before deploying to production!

