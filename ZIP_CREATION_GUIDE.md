# 📦 Automated ZIP Creation for Discloud

## 🎉 One Command Deployment!

Instead of manually creating a ZIP file, just run:

```bash
npm run create-zip
```

**That's it!** This single command will:
1. ✅ Build your TypeScript code
2. ✅ Verify all required files exist
3. ✅ Create `discloud-deploy.zip` ready for upload
4. ✅ Show you the file size and next steps

---

## 📋 What Happens

### **Step 1: Build** 🔨
```
📦 Building TypeScript...
✅ Build successful!
```
Compiles all your TypeScript code to JavaScript in the `dist/` folder.

### **Step 2: Verify** ✅
```
🔍 Verifying required files...
   ✅ dist/index.js
   ✅ dist/config.js
   ✅ dist/commands/read.js
   ✅ dist/services/voice/VoiceReadManager.js
   ✅ package.json
   ✅ package-lock.json
   ✅ discloud.config
```
Checks that all necessary files are present.

### **Step 3: Create ZIP** 📦
```
📦 Creating ZIP file...
   📁 Adding dist/ folder...
   📄 Adding package.json...
   📄 Adding package-lock.json...
   📄 Adding discloud.config...
✅ ZIP created: discloud-deploy.zip (0.06 MB)
```
Creates a compressed ZIP file with only the files needed for Discloud.

### **Step 4: Success!** 🎉
```
════════════════════════════════════════════════════════════
🎉 DEPLOYMENT PACKAGE READY! 🎉
════════════════════════════════════════════════════════════

📦 File: discloud-deploy.zip
📍 Location: D:\coding\Discord\voice-read-bot\discloud-deploy.zip

📋 Next Steps:

1. Go to: https://discloud.app/dashboard
2. Click "Upload Bot" or "New Application"
3. Upload: discloud-deploy.zip
4. Set environment variables (see QUICK_DEPLOY.md)
5. Start your bot!
6. Deploy commands: node dist/deploy-commands.js
```

---

## 📦 What's Inside the ZIP?

The ZIP file contains **ONLY** what Discloud needs:

```
discloud-deploy.zip
├── dist/                      (All compiled JavaScript)
│   ├── index.js
│   ├── config.js
│   ├── commands/
│   │   └── read.js
│   ├── services/
│   │   ├── logging/
│   │   │   └── index.js
│   │   └── voice/
│   │       ├── EmojiProcessor.js
│   │       └── VoiceReadManager.js
│   └── types/
│       └── Command.js
├── package.json               (Dependencies list)
├── package-lock.json          (Exact versions)
└── discloud.config            (Discloud settings)
```

**NOT included** (automatically excluded):
- ❌ `src/` folder (TypeScript source)
- ❌ `node_modules/` (Discloud installs these)
- ❌ `.env` file (use environment variables instead)
- ❌ Documentation files (.md)
- ❌ Build artifacts (.map, .d.ts files)

---

## 🔧 How It Works

The script uses:
- **archiver** package (for cross-platform ZIP creation)
- **Fallback** to system commands if archiver isn't available
  - Windows: PowerShell `Compress-Archive`
  - Linux/Mac: `zip` command

### **Script Location:**
`create-deploy-zip.js` in the root directory

### **Added to package.json:**
```json
{
  "scripts": {
    "create-zip": "node create-deploy-zip.js"
  },
  "devDependencies": {
    "archiver": "^7.0.1"
  }
}
```

---

## 🎯 Quick Comparison

### **Before (Manual):**
1. Run `npm run build`
2. Open file explorer
3. Select files: dist/, package.json, package-lock.json, discloud.config
4. Right-click → Send to → Compressed folder
5. Rename ZIP file
6. Hope you didn't miss anything!

### **Now (Automated):**
1. Run `npm run create-zip`
2. Upload `discloud-deploy.zip`
3. Done! ✅

---

## 💡 Usage Tips

### **First time deploying?**
```bash
npm run create-zip
```

### **Made code changes?**
```bash
npm run create-zip
```
It will rebuild and create a fresh ZIP.

### **Just want to verify files?**
```bash
npm run prepare-deploy
```
This checks everything without creating the ZIP.

### **Old ZIP exists?**
No problem! The script automatically deletes old `discloud-deploy.zip` and creates a new one.

---

## 🐛 Troubleshooting

### **Error: "archiver not found"**
**Solution:** Install dependencies
```bash
npm install
```

### **Error: "Build failed"**
**Solution:** Fix TypeScript errors first
```bash
npm run build
```
Check the error messages and fix any TypeScript issues.

### **Error: "Missing required file"**
**Solution:** Ensure all source files exist
- Check that `src/` folder has all necessary files
- Run `npm run build` to compile

### **ZIP creation fails on Windows**
**Solution:** The script automatically falls back to PowerShell
- Make sure PowerShell is available
- Or install archiver: `npm install`

### **ZIP creation fails on Linux/Mac**
**Solution:** Install zip command
```bash
# Ubuntu/Debian
sudo apt-get install zip

# macOS
brew install zip

# Or just use archiver
npm install
```

---

## 📊 File Size

**Expected size:** ~2-5 MB

**Depends on:**
- Number of dependencies compiled
- Emoji mappings (EmojiProcessor)
- Command files

**If your ZIP is much larger:**
- Make sure `node_modules/` isn't included
- Check that only `dist/` is included (not `src/`)
- Verify `.discloudignore` is working

---

## 🔄 Updating Your Bot

When you make changes to your bot:

```bash
# 1. Edit your files in src/
# 2. Test locally
npm run dev

# 3. Create new deployment ZIP
npm run create-zip

# 4. Upload to Discloud (replaces old version)
```

---

## ✅ What Makes This Better?

1. **No manual steps** - Everything automated
2. **No forgotten files** - Script ensures all required files included
3. **No extra files** - Only what's needed, smaller upload
4. **Cross-platform** - Works on Windows, Mac, Linux
5. **Consistent** - Same result every time
6. **Fast** - Takes ~30 seconds including build

---

## 🎊 Ready to Deploy!

Now you have:
- ✅ Automated build process
- ✅ Automated verification
- ✅ Automated ZIP creation
- ✅ `discloud-deploy.zip` ready to upload!

**Next step:** Upload to Discloud!

See `QUICK_DEPLOY.md` for complete deployment steps.

---

**Command Reference:**
```bash
npm run create-zip       # Build + Verify + Create ZIP (recommended)
npm run prepare-deploy   # Build + Verify only (no ZIP)
npm run build           # Build only
```

**Your deployment just got a whole lot easier! 🚀**

