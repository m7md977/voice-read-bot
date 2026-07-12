# 🔐 Environment Setup for Discloud

## ⚠️ IMPORTANT: Edit `.env` Before Deploying!

You now have a `.env` file in your project. You **MUST** edit it with your actual tokens before creating the deployment ZIP.

---

## 📝 Step-by-Step Setup

### **Step 1: Open `.env` file**
The file is in your project root: `d:\coding\Discord\voice-read-bot\.env`

### **Step 2: Fill in your tokens**

Replace the placeholder values:

```env
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token_here     ← Replace this!
CLIENT_ID=your_discord_application_id_here ← Replace this!

# Command Deployment
GLOBAL_COMMANDS=true                       ← Keep this as is

# TTS Configuration (ElevenLabs)
TTS_PROVIDER=elevenlabs                    ← Keep this as is
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here ← Replace this!
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  ← Default voice (or change)
ELEVENLABS_TTS_MODEL_ID=eleven_turbo_v2_5 ← Keep this as is

# Optional: Voice Read Bypass Role
# BYPASSROLEID=role_id_here                ← Uncomment and add if needed
```

---

## 🔑 Where to Get Your Tokens

### **1. Discord Bot Token & Client ID**
1. Go to: https://discord.com/developers/applications
2. Select your bot application (or create one)
3. **BOT_TOKEN:**
   - Go to "Bot" section
   - Click "Reset Token" (or "Copy" if not reset)
   - Paste into `.env` → `BOT_TOKEN=`
4. **CLIENT_ID:**
   - Go to "General Information"
   - Copy "Application ID"
   - Paste into `.env` → `CLIENT_ID=`

### **2. ElevenLabs API Key**
1. Go to: https://elevenlabs.io
2. Login to your account
3. Click your profile (top right)
4. Go to "Profile" → "API Keys"
5. Copy your API key
6. Paste into `.env` → `ELEVENLABS_API_KEY=`

### **3. Bypass Role (Optional)**
If you want certain users to speak without pausing the bot:
1. Open Discord → Server Settings → Roles
2. Right-click the role → "Copy ID"
3. Uncomment the line in `.env` and paste:
   ```env
   BYPASSROLEID=123456789012345678
   ```

---

## ✅ Example (with fake tokens)

```env
# Discord Bot Configuration
BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.GhK7Lm.nOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUv
CLIENT_ID=1234567890123456789

# Command Deployment
GLOBAL_COMMANDS=true

# TTS Configuration (ElevenLabs)
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=sk_1234567890abcdef1234567890abcdef
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_TTS_MODEL_ID=eleven_turbo_v2_5

# Optional: Voice Read Bypass Role
BYPASSROLEID=987654321098765432
```

---

## 🚀 After Editing `.env`

Once you've filled in your tokens:

```bash
npm run create-zip
```

This will create `discloud-deploy.zip` **WITH** your `.env` file inside.

---

## 🔒 Security Notes

### ⚠️ **NEVER share your `.env` file!**
- Contains sensitive tokens and API keys
- Anyone with these can control your bot
- `.env` is already in `.gitignore` (won't be committed to git)

### ✅ **What's safe:**
- Sharing the `.env.template` or `env.example` (no real tokens)
- Sharing your code (without `.env`)
- Uploading ZIP to Discloud (they keep it private)

### ❌ **Never share:**
- Your actual `.env` file
- Screenshots containing tokens
- Bot token or API keys in Discord/forums

---

## 🎯 Quick Checklist

Before running `npm run create-zip`:

- [ ] `.env` file exists in project root
- [ ] BOT_TOKEN is filled in (from Discord Developer Portal)
- [ ] CLIENT_ID is filled in (from Discord Developer Portal)
- [ ] ELEVENLABS_API_KEY is filled in (from ElevenLabs)
- [ ] All values are actual tokens (not placeholders)
- [ ] No extra spaces or quotes around values
- [ ] BYPASSROLEID is uncommented if you want that feature

---

## 🐛 Common Mistakes

### **"Bot won't start on Discloud"**
- Double-check BOT_TOKEN is correct
- Make sure there are no extra spaces
- Verify the token hasn't been regenerated

### **"Voice features don't work"**
- Check ELEVENLABS_API_KEY is valid
- Verify you have ElevenLabs credits
- Make sure TTS_PROVIDER=elevenlabs

### **"Commands don't appear"**
- Verify CLIENT_ID is correct
- Run deploy-commands after bot starts
- Wait 5-10 minutes for Discord to sync

---

## 📞 Need Help?

1. Make sure `.env` file is in the same folder as `package.json`
2. Check that all tokens are on single lines (no line breaks)
3. Verify no quotes around values (unless they contain spaces)
4. Test locally first with `npm start` before deploying

---

**Ready?** Edit your `.env` file, then run:
```bash
npm run create-zip
```

The ZIP will include your configured `.env` file! 🎉

