# Voice Read Bot

A lightweight Discord bot that reads text messages aloud in voice channels using high-quality ElevenLabs text-to-speech.

## Features

- 🎙️ **Voice Message Reading**: Joins a voice channel and reads new messages from a text channel aloud
- 🗣️ **Multiple Voices**: Choose from a range of English and Arabic ElevenLabs voices
- 🎚️ **Selectable Models**: Pick the ElevenLabs model that best balances quality vs. speed
- 😊 **Emoji Processing**: Converts emojis to spoken descriptions (🔥 → "fire")
- 🔗 **Link & Mention Filtering**: Strips URLs, invites, and mentions so they aren't read aloud
- 🧹 **Markdown Cleanup**: Removes bold/italic/spoiler/code formatting before speaking
- ⏰ **Auto-Leave**: Automatically leaves a voice channel after it's been empty for 30 seconds
- ♻️ **Resilient Connections**: Automatically retries and recovers dropped voice connections

## Commands

### `/read`

The main command for controlling voice reading.

**Options:**

- `action` (required):
  - `start` — Join your voice channel and begin reading messages from the current text channel
  - `stop` — Stop reading and leave the voice channel
  - `pause` — Pause reading (stay connected)
  - `resume` — Resume reading
  - `skip` — Skip the message currently being read
  - `clear` — Clear the pending message queue
  - `status` — Show queue size and playback state
- `model` (optional): ElevenLabs model to use for synthesis (e.g. Flash v2.5, Multilingual v2, Eleven v3). Defaults to the value of `ELEVENLABS_TTS_MODEL_ID`, or Flash v2.5.
- `voice` (optional): Voice to read with. Defaults to `ELEVENLABS_VOICE_ID`, or a Rachel-like voice.

**Example:**

```
/read action:start voice:George 🇬🇧 model:Eleven Flash v2.5
```

Start reading in your current voice channel, then send messages in the text channel — the bot reads each one as it arrives, prefixed with the sender's display name.

### `/servers` *(dev only)*

Lists every server the bot is in. Only works inside the server configured via `DEV_SERVER_ID`.

## 🚀 Deployment (Discloud, 24/7 hosting)

Discloud compiles the bot from source on deploy — no local build or ZIP needed.
The [`discloud.config`](discloud.config) tells it how:

```properties
TYPE=bot
MAIN=src/index.ts
BUILD=npm run build   # compiles TypeScript to build/
START=npm start       # runs node build/index.js
```

> **Note:** Discloud reserves the `dist/` folder for its own build process, so this
> project compiles to `build/` instead.

**Deploy from GitHub:** in the Discloud dashboard, connect this repository and deploy.
Discloud installs dependencies, runs `BUILD`, then `START`.

**Or deploy with the CLI** (`npm i -g discloud`, then `discloud login`):

```bash
discloud upload
```

After the first deploy, set your secrets in the Discloud dashboard (**never commit `.env`**):
`BOT_TOKEN`, `CLIENT_ID`, `ELEVENLABS_API_KEY`, and the rest from [`env.example`](env.example).
Then register slash commands once from the Discloud terminal: `node build/deploy-commands.js`.

> The guides in [`docs/`](docs/) describe an older build-locally-and-upload-a-ZIP
> flow; the GitHub / `discloud upload` method above is the current one.

## Setup

### Prerequisites

1. **Discord Bot**: Create an application and bot at the [Discord Developer Portal](https://discord.com/developers/applications)
2. **ElevenLabs Account**: Sign up at [ElevenLabs](https://elevenlabs.io/) for TTS
3. **Node.js**: Version 18 or higher (the bot relies on the built-in global `fetch`)

### Installation

1. **Clone and install:**

```bash
git clone https://github.com/m7md977/voice-read-bot.git
cd voice-read-bot
npm install
```

2. **Configure environment:** Copy `env.example` to `.env` and fill in your values:

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
ELEVENLABS_TTS_MODEL_ID=eleven_flash_v2_5

# Optional: Dev server for the /servers command
DEV_SERVER_ID=your_dev_server_id_here

# Optional: Discord logging channels
BOT_CATEGORY=your_bot_category_id_here
LOGS_CHANNEL=your_logs_channel_id_here
JOIN_LEFT_CHANNEL=your_join_left_channel_id_here
```

See [`docs/SETUP_ENV.md`](docs/SETUP_ENV.md) for a full walkthrough of each variable.

3. **Register slash commands:**

```bash
npm run deploy-commands
```

4. **Build and run:**

```bash
npm run build   # Compile TypeScript to build/
npm start       # Run the compiled bot
```

Or for development with live TypeScript:

```bash
npm run dev
```

### Discord Bot Permissions

The bot needs these permissions:

- **Send Messages** — to reply to commands
- **Use Slash Commands** — to register and receive `/read`
- **Connect** — to join voice channels
- **Speak** — to play audio
- **Use Voice Activity** — required to transmit voice
- **View Channel** / **Read Message History** — to monitor the text channel for messages to read

Invite URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3146752&scope=bot%20applications.commands
```

## Configuration Details

### Voices & Models

Voices and their ElevenLabs IDs are defined in [`src/config.ts`](src/config.ts) and exposed as choices on the `/read` command. English (US & UK) and Modern Standard / Gulf Arabic voices are included. Available models range from `eleven_v3` (highest quality) to `eleven_flash_v2_5` (fastest). Set a default voice/model via `ELEVENLABS_VOICE_ID` and `ELEVENLABS_TTS_MODEL_ID`, or override per-session with the command options.

### Message Handling

- **Emoji Processing**: Emojis are converted to spoken descriptions before synthesis
- **Link Filtering**: URLs, `discord.gg` invites, and bare domains are stripped out
- **Mentions**: User/role/channel mentions are read as "someone" / "a role" / "a channel"
- **Length Limit**: Very long messages are skipped to avoid runaway TTS usage
- **Queue Limit**: The per-session queue is capped (oldest dropped) to bound memory use

## Usage

1. **Join a voice channel** — you must be in one to start reading
2. **Start reading** — run `/read action:start` in a text channel
3. **Send messages** — messages in that text channel are read aloud in order
4. **Control playback** — use `pause` / `resume` / `skip` / `clear` / `stop` as needed

## Troubleshooting

**"Voice reading is not configured"**
- Ensure `TTS_PROVIDER=elevenlabs` and `ELEVENLABS_API_KEY` are set and valid

**"Missing permissions"**
- Confirm the bot has Connect, Speak, and Use Voice Activity in the voice channel, and can view the text channel and read message history

**"Connection timeout"**
- The voice channel may be full or restricted; check Discord's status and try again

**No audio playback**
- Verify your ElevenLabs API key, voice ID, and remaining credits
- `ffmpeg` is bundled via `ffmpeg-static`, so no separate install is needed

The bot logs connection status, TTS activity, and errors to the console. If `LOGS_CHANNEL` is configured, it also posts startup and error notifications to Discord.

## Development

### Project Structure

```
voice-read-bot/
├── src/
│   ├── commands/
│   │   ├── read.ts                 # Main /read command
│   │   └── servers.ts              # Dev-only /servers command
│   ├── services/
│   │   ├── voice/
│   │   │   ├── VoiceReadManager.ts # Core voice session + queue logic
│   │   │   └── EmojiProcessor.ts   # Emoji → spoken-text conversion
│   │   └── logging/
│   │       └── index.ts            # Console logger
│   ├── types/
│   │   └── Command.ts              # Command interface
│   ├── utils/
│   │   └── discordLogger.ts        # Optional Discord channel logging
│   ├── config.ts                   # Env config + voice/model tables
│   ├── index.ts                    # Bot entry point & event handlers
│   └── deploy-commands.ts          # Slash command registration
├── docs/                           # Deployment & setup guides
├── discloud.config                 # Discloud build/run configuration
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

```bash
npm run build            # Compile TypeScript to build/
npm start                # Run the compiled bot
npm run dev              # Run from source with ts-node
npm run deploy-commands  # Register slash commands with Discord
```

## Contributing

Issues and pull requests are welcome. Fork the repo, create a branch, and open a
PR — please run `npm run build` first to make sure it compiles.

## License

Released under the [ISC License](LICENSE) — free to use, modify, and distribute.
