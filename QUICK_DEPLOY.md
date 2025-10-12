# 🚀 Quick Discloud Deployment Guide

## ⚡ Fast Deploy (5 Minutes)

### **Step 0: Configure Environment** (2 minutes) ⚠️ REQUIRED FIRST!
```bash
# 1. Edit .env file with your tokens
notepad .env
```

Fill in your tokens:
- `BOT_TOKEN` - From Discord Developer Portal
- `CLIENT_ID` - From Discord Developer Portal  
- `ELEVENLABS_API_KEY` - From ElevenLabs

**📖 Need help?** See `SETUP_ENV.md` for detailed instructions.

---

### **Step 1: Build & Create ZIP** (30 seconds)
```bash
npm run create-zip
```
This will:
- ✅ Build your TypeScript
- ✅ Verify all files (including .env)
- ✅ Create `discloud-deploy.zip` ready to upload!

---

### **Step 2: Upload to Discloud** (1 minute)

1. Go to: https://discloud.app/dashboard
2. Click **"Upload Bot"** or **"New Application"**
3. Upload `discloud-deploy.zip`
4. Wait for upload to complete

**Note:** Environment variables are already inside the ZIP in `.env` file! ✅

---

### **Step 3: Start Bot** (30 seconds)

Click **"Start"** button in Discloud dashboard.

Wait for status to show **🟢 Online**.

---

### **Step 4: Deploy Commands** (30 seconds)

**Option A - From Discloud Terminal:**
1. Go to your bot in Discloud dashboard
2. Open **Terminal** tab
3. Run:
```bash
node dist/deploy-commands.js
```

**Option B - From Your Computer (Faster):**
```bash
npm run deploy-commands
```

---

### **Step 6: Test!** ✅

In Discord:
1. Join a voice channel
2. Type: `/read action:start`
3. Send a message in the text channel
4. Bot should read it aloud! 🎉

---

## 📋 What's in the ZIP?

The ZIP file (`discloud-deploy.zip`) contains:

```
discloud-deploy.zip/
├── dist/              ✅ Compiled JavaScript
├── package.json       ✅ Dependencies list
├── discloud.config    ✅ Discloud settings
└── .env              ✅ Your tokens & config
```

**NOT included** (per Discloud requirements):
- ❌ `package-lock.json` (Discloud generates its own)
- ❌ `node_modules/` (installed by Discloud)
- ❌ `src/` (source files not needed)

---

## 🐛 Quick Troubleshooting

**Bot won't start?**
→ Check BOT_TOKEN is correct in environment variables

**Commands don't appear?**
→ Run deploy-commands.js and wait 5-10 minutes

**Voice doesn't work?**
→ Verify `APT=tools` is in discloud.config

**Bot leaves immediately?**
→ Join the voice channel before starting the bot

---

## 🔄 Updating Bot Later

1. Make changes to `src/` files
2. Run: `npm run prepare-deploy`
3. Create new ZIP (same files as before)
4. Upload to Discloud (overwrites old version)
5. Bot will auto-restart with new code

---

## 📖 Full Documentation

- **Complete Guide**: `DEPLOY_DISCLOUD.md`
- **Bot Analysis**: `ANALYSIS.md`
- **Recent Changes**: `CHANGES_SUMMARY.md`

---

**That's it! Your bot should now be live on Discloud! 🎉**

**Support:** If you have issues, check Discloud logs (dashboard) or see full guide.

