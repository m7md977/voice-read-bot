# Voice Read Bot

A lightweight Discord bot that reads text messages aloud in voice channels using high-quality text-to-speech.

## Features

- 🎙️ **Voice Message Reading**: Joins voice channels and reads text messages aloud
- 🎛️ **Customizable Settings**: Adjust speech speed, message length limits, and emoji handling
- 🔇 **Smart Pausing**: Automatically pauses when users speak (voice activity detection)
- 😊 **Emoji Processing**: Converts emojis to readable text descriptions
- 🔗 **Link Filtering**: Automatically filters out URLs to avoid reading them
- ⏰ **Auto-Leave**: Automatically leaves empty voice channels after 30 seconds
- 🎭 **Bypass Roles**: Configure roles that can speak without pausing the bot

## Commands

### `/read`
The main command for controlling voice reading functionality.

**Options:**
- `action` (required): 
  - `start` - Begin reading messages
  - `stop` - Stop reading and leave voice channel  
  - `pause` - Pause reading (stay connected)
  - `resume` - Resume reading
  - `skip` - Skip currently playing message
  - `clear` - Clear message queue
  - `status` - Show queue and playback status
- `speed` (optional): Speech speed from 0.5 to 2.0 (default: 0.9)
- `max_length` (optional): Maximum message length to read, 50-2000 characters (default: 1000)
- `emoji_mode` (optional): How to handle emojis
  - `explain` - Read emoji with description (😀 grinning face)
  - `replace` - Replace emoji with description only
  - `skip` - Skip emojis entirely

## 🚀 Deployment Options

### Deploy to Discloud (Recommended for 24/7 hosting)

Quick deploy guide available! See:
- **⚡ Quick Start**: `QUICK_DEPLOY.md` (5 minutes)
- **📖 Full Guide**: `DEPLOY_DISCLOUD.md` (complete instructions)
- **✅ Checklist**: `DEPLOYMENT_CHECKLIST.txt` (step-by-step)

```bash
# Create deployment ZIP automatically
npm run create-zip

# Or just verify (without creating ZIP)
npm run prepare-deploy
```

### Run Locally

See installation instructions below for local development and testing.

---

## Setup

### Prerequisites

1. **Discord Bot**: Create a Discord application and bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. **ElevenLabs Account**: Sign up at [ElevenLabs](https://elevenlabs.io/) for TTS functionality
3. **Node.js**: Version 18 or higher

### Installation

1. **Clone/Download**: Get the bot files
```bash
git clone <repository-url>
cd voice-read-bot
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Environment Configuration**:
   - Copy `env.example` to `.env`
   - Fill in your configuration values:

```env
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_id_here

# Command Deployment
GLOBAL_COMMANDS=true

# TTS Configuration (ElevenLabs)
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_TTS_MODEL_ID=eleven_turbo_v2_5

# Optional: Voice Read Bypass Role
BYPASSROLEID=role_id_here
```

4. **Deploy Commands**:
```bash
npm run deploy-commands
```

5. **Build and Start**:
```bash
npm run build
npm start
```

Or for development:
```bash
npm run dev
```

### Discord Bot Permissions

Your bot needs these permissions:
- **Send Messages**: To send command responses
- **Use Slash Commands**: To register and use slash commands
- **Connect**: To join voice channels
- **Speak**: To play audio in voice channels
- **Use Voice Activity**: For voice activity detection
- **Read Message History**: To monitor messages for reading

### Bot Invite URL

Use this URL format to invite your bot (replace CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3146752&scope=bot%20applications.commands
```

## Configuration Details

### TTS Provider (ElevenLabs)

This bot uses ElevenLabs for high-quality text-to-speech. You'll need:

1. **API Key**: Get from [ElevenLabs API Keys](https://elevenlabs.io/app/speech-synthesis)
2. **Voice ID**: Choose a voice from your ElevenLabs library (default is Rachel-like voice)
3. **Model ID**: TTS model to use (default: `eleven_turbo_v2_5` for fast generation)

### Voice Settings

- **Speed**: 0.5 = slow, 1.0 = normal, 1.5 = fast, 2.0 = very fast
- **Max Length**: Prevents reading extremely long messages
- **Emoji Processing**: Makes emojis readable in voice
- **Link Filtering**: Automatically skips messages containing URLs
- **Voice Activity Detection**: Pauses reading when users speak

### Bypass Role

Configure a role ID in `BYPASSROLEID` to allow certain users (like moderators) to speak without pausing the voice reading. This is useful for:
- Moderators who need to give instructions
- DJs or event hosts
- Server administrators

## Usage

1. **Join a Voice Channel**: Users must be in a voice channel to start voice reading
2. **Start Reading**: Use `/read action:start` in a text channel
3. **Send Messages**: Any messages in that text channel will be read aloud
4. **Control Playback**: Use pause/resume/stop actions as needed

### Example Usage

```
/read action:start speed:1.2 max_length:500 emoji_mode:explain
```

This starts voice reading with:
- 20% faster speech
- Maximum 500 characters per message
- Emojis explained with descriptions

## Troubleshooting

### Common Issues

1. **"Voice reading is not configured"**
   - Ensure `TTS_PROVIDER=elevenlabs` and `ELEVENLABS_API_KEY` are set
   - Verify your ElevenLabs API key is valid

2. **"Missing permissions"**
   - Check bot has Connect, Speak, and Use Voice Activity permissions
   - Verify bot can view the text channel and read message history

3. **"Connection timeout"**
   - Voice channel might be full or restricted
   - Check Discord server status
   - Try a different voice channel

4. **No audio playback**
   - Verify ElevenLabs API key and voice ID
   - Check if you have ElevenLabs credits remaining
   - Ensure ffmpeg is installed (should be handled by ffmpeg-static package)

### Logs

The bot logs important events to the console:
- Connection status
- TTS generation
- Voice activity detection
- Error messages

Check the logs for detailed error information if something isn't working.

## Development

### Project Structure

```
voice-read-bot/
├── src/
│   ├── commands/
│   │   └── read.ts                 # Main voice read command
│   ├── services/
│   │   ├── voice/
│   │   │   ├── VoiceReadManager.ts # Core voice reading logic  
│   │   │   └── EmojiProcessor.ts   # Emoji to text conversion
│   │   └── logging/
│   │       └── index.ts            # Simple logging utilities
│   ├── types/
│   │   └── Command.ts              # TypeScript interfaces
│   ├── config.ts                   # Configuration management
│   ├── index.ts                    # Bot entry point
│   └── deploy-commands.ts          # Command registration
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled bot
npm run dev      # Run with ts-node for development
```

## License

This project is licensed under the ISC License.

## 📚 Documentation

- **Quick Deploy**: `QUICK_DEPLOY.md` - Fast Discloud deployment (5 min)
- **Full Deploy Guide**: `DEPLOY_DISCLOUD.md` - Complete Discloud instructions
- **Bot Analysis**: `ANALYSIS.md` - In-depth workflow and optimization details
- **Recent Changes**: `CHANGES_SUMMARY.md` - Latest improvements and features
- **Checklist**: `DEPLOYMENT_CHECKLIST.txt` - Deployment verification steps

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review console logs for error details
3. Verify your configuration and permissions
4. Test with a simple voice channel setup first
5. See `ANALYSIS.md` for advanced tuning options
