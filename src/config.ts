import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Available ElevenLabs voices and their characteristics
export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
  category?: string;
  labels?: { [key: string]: string };
}

export const ELEVENLABS_VOICES: { [key: string]: ElevenLabsVoice } = {
  'rachel': {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Calm and professional voice, ideal for narration',
    category: 'professional'
  },
  'domi': {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    description: 'Confident and energetic voice',
    category: 'professional'
  },
  'bella': {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Soft and gentle voice',
    category: 'professional'
  },
  'antoni': {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Warm and engaging male voice',
    category: 'professional'
  },
  'elli': {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Approachable and friendly voice',
    category: 'professional'
  },
  'josh': {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    description: 'Deep and authoritative male voice',
    category: 'professional'
  },
  'arnold': {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'Powerful and commanding male voice',
    category: 'professional'
  },
  'sam': {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'Serious and thoughtful male voice',
    category: 'professional'
  }
};

// Available ElevenLabs models and their settings
export interface ElevenLabsModel {
  id: string;
  name: string;
  description: string;
  isRealTime: boolean;
  defaultSettings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export const ELEVENLABS_MODELS: { [key: string]: ElevenLabsModel } = {
  'eleven_turbo_v2_5': {
    id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    description: 'Fast, efficient model optimized for real-time applications',
    isRealTime: true,
    defaultSettings: {
      stability: 0.5,
      similarity_boost: 0.7
    }
  },
  'eleven_v3_alpha': {
    id: 'eleven_v3_alpha',
    name: 'Eleven v3 (Alpha)',
    description: 'Latest model with enhanced expressiveness (Alpha)',
    isRealTime: false,
    defaultSettings: {
      stability: 0.7,
      similarity_boost: 0.7,
      style: 0.7,
      use_speaker_boost: true
    }
  }
};

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
