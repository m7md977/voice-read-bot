# 🎙️ Smart Content Filtering & Nickname Reading

## ✨ Recent Improvements

Your bot now has **smarter content filtering** and reads **nicknames** instead of usernames!

---

## 🏷️ Nickname Reading

### **What Changed:**
- ✅ Now reads **server nickname** (display name) instead of username
- ✅ Automatically shortens long nicknames (max 20 characters)
- ✅ Falls back to username if no nickname is set

### **Examples:**

**Before:**
```
"john_smith_12345: Hello everyone!"
```

**After:**
```
"Johnny: Hello everyone!"              (using server nickname)
"VeryLongNickname...: Hello everyone!" (shortened to 20 chars)
```

### **Why This Matters:**
- More natural in voice chat (uses name everyone knows)
- Long nicknames don't waste time
- Cleaner audio experience

---

## 🔗 Improved Link Filtering

### **What Changed:**
Links are now **removed** instead of skipping the entire message!

### **Filters Applied:**

#### **1. URLs & Links**
- ✅ HTTP/HTTPS links: `https://example.com`
- ✅ WWW links: `www.google.com`
- ✅ Common domains: `github.com`, `youtube.com`, etc.
- ✅ Discord invites: `discord.gg/xxxxx`

#### **2. Discord Mentions**
- ✅ User mentions: `<@123456789>` → "someone"
- ✅ Role mentions: `<@&123456789>` → "a role"
- ✅ Channel mentions: `<#123456789>` → "a channel"
- ✅ Custom emojis: `<:name:123456789>` → removed

#### **3. Markdown Formatting**
- ✅ Bold: `**text**` → "text"
- ✅ Italic: `*text*` or `_text_` → "text"
- ✅ Strikethrough: `~~text~~` → "text"
- ✅ Spoilers: `||text||` → "text"
- ✅ Code blocks: ` ```code``` ` → "code block"
- ✅ Inline code: `` `code` `` → "code"

#### **4. Special Cases**
- ✅ Messages with only formatting → Skipped
- ✅ Messages empty after filtering → Skipped
- ✅ Messages with too few letters → Skipped

---

## 📋 Examples

### **Example 1: Link Removal**

**Message sent:**
```
Check out this awesome site! https://example.com and also www.cool-stuff.net
```

**Bot reads:**
```
"Alex: Check out this awesome site! and also"
```
Links removed, rest of message is read!

---

### **Example 2: Mentions**

**Message sent:**
```
Hey <@123456789> check <#987654321> for updates!
```

**Bot reads:**
```
"Mike: Hey someone check a channel for updates!"
```

---

### **Example 3: Markdown**

**Message sent:**
```
This is **very important** and *super cool*!
```

**Bot reads:**
```
"Sarah: This is very important and super cool!"
```
Formatting removed, natural speech!

---

### **Example 4: Mixed Content**

**Message sent:**
```
Join us at discord.gg/example! <@123456789> come to <#999999999>
```

**Bot reads:**
```
"Chris: Join us at someone come to a channel"
```

---

### **Example 5: Link in Sentence**

**Before (old behavior):**
- Message: `"I love youtube.com videos"`
- Result: **Entire message skipped** ❌

**After (new behavior):**
- Message: `"I love youtube.com videos"`
- Bot reads: `"I love videos"` ✅
- Link removed, message still read!

---

## 🎯 What Gets Skipped Entirely

Messages are completely skipped if:
1. **Empty after filtering** - Only contained links/mentions
2. **Too short** - Less than 3 letters
3. **No letters** - Only numbers/symbols
4. **Only formatting** - Just markdown characters
5. **Too long** - Over max length (default 1000 chars)
6. **Code-only** - Just code blocks

---

## 🎛️ Supported Domains

The bot filters these common domains:
- `.com` `.net` `.org` `.io` `.co`
- `.me` `.ly` `.gg` `.tv` `.xyz`
- `.app` `.dev` `.cc` `.bot` `.de`
- `.uk` `.ca` `.edu` `.gov`

And more! The filter is smart about detecting URLs.

---

## 🔧 Technical Details

### **Nickname Extraction Priority:**
1. Server nickname (if set by admins)
2. Global display name (if user set one)
3. Username (fallback)

### **Name Shortening:**
- Maximum: 20 characters
- Long names: Truncated to 17 chars + "..."
- Example: `"VeryVeryLongNickname"` → `"VeryVeryLongNick..."`

### **Content Processing Order:**
1. Remove links/URLs
2. Replace mentions with text
3. Remove custom emojis
4. Process regular emojis (if enabled)
5. Remove markdown formatting
6. Check length and validity
7. Clean up extra whitespace

---

## ✅ Benefits

### **1. Better Audio Quality**
- No long URLs being read aloud
- No "at user one two three four" for mentions
- Natural-sounding names

### **2. More Readable Messages**
- Focus on actual content
- Remove technical noise
- Cleaner conversation flow

### **3. Smarter Filtering**
- Messages with links aren't entirely skipped
- Important content still gets read
- Better handling of mixed content

### **4. More Natural**
- Uses names people recognize
- Removes formatting artifacts
- Sounds like real conversation

---

## 🧪 Test Examples

Try sending these messages to test:

```
1. Hello world! https://google.com           → "Hello world!"
2. Hey <@user> check this out!              → "Hey someone check this out!"
3. **Important** announcement                → "Important announcement"
4. discord.gg/test is the link              → "is the link"
5. Visit www.example.com for info           → "Visit for info"
```

---

## 📊 Configuration

All filtering is **enabled by default** via the options:
```typescript
{
  filterLinks: true,           // Remove URLs
  processEmojis: true,         // Handle emojis
  maxLength: 1000,            // Max message length
  pauseOnVoiceActivity: true  // Pause when users speak
}
```

---

## 🎉 Summary

Your bot now:
- ✅ Reads **nicknames** (max 20 chars)
- ✅ **Removes** links instead of skipping messages
- ✅ Handles Discord **mentions** naturally
- ✅ Strips **markdown** formatting
- ✅ Filters **custom emojis**
- ✅ Skips **code blocks** intelligently
- ✅ Cleans up **whitespace** automatically

**Result:** Much cleaner, more natural voice reading! 🎙️✨

