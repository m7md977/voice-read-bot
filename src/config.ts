import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  botToken: string;
  clientId: string;
  globalCommands: boolean;
  // TTS Configuration
  ttsProvider?: 'elevenlabs' | 'none';
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsTtsModelId?: string;
  // Voice Read Bypass
  bypassRoleId?: string;
}

const config: Config = {
  botToken: process.env.BOT_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  globalCommands: process.env.GLOBAL_COMMANDS?.toLowerCase() === 'true',
  // TTS
  ttsProvider: (process.env.TTS_PROVIDER as Config['ttsProvider']) || 'elevenlabs',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
  elevenLabsTtsModelId: process.env.ELEVENLABS_TTS_MODEL_ID,
  // Voice Read Bypass
  bypassRoleId: process.env.BYPASSROLEID,
};

// Validate required configuration
if (!config.botToken) {
  throw new Error('Missing required environment variable: BOT_TOKEN');
}
if (!config.clientId) {
  throw new Error('Missing required environment variable: CLIENT_ID');
}

export default config;
