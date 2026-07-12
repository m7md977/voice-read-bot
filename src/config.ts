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
  // English Voices
  'rachel': {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel 🇺🇸',
    description: 'Calm and professional English voice',
    category: 'english'
  },
  'domi': {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi 🇺🇸',
    description: 'Confident and energetic English voice',
    category: 'english'
  },
  'bella': {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella 🇺🇸',
    description: 'Soft and gentle English voice',
    category: 'english'
  },
  'antoni': {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni 🇺🇸',
    description: 'Warm and engaging male English voice',
    category: 'english'
  },
  'elli': {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli 🇺🇸',
    description: 'Approachable and friendly English voice',
    category: 'english'
  },
  'josh': {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh 🇺🇸',
    description: 'Deep and authoritative male English voice',
    category: 'english'
  },
  'arnold': {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold 🇺🇸',
    description: 'Powerful and commanding male English voice',
    category: 'english'
  },
  'sam': {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam 🇺🇸',
    description: 'Serious and thoughtful male English voice',
    category: 'english'
  },
  'glinda': {
    id: 'z9fAnlkpzviPz146aGWa',
    name: 'Glinda 🇺🇸',
    description: 'Witchy and dramatic female English voice',
    category: 'english'
  },
  'lily': {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily 🇬🇧',
    description: 'British accent, warm and expressive',
    category: 'english'
  },
  'george': {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George 🇬🇧',
    description: 'British male, warm and conversational',
    category: 'english'
  },
  'callum': {
    id: 'N2lVS1w4EtoT3dr4eOWO',
    name: 'Callum 🇬🇧',
    description: 'British male, hoarse and intense',
    category: 'english'
  },
  'charlotte': {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte 🇬🇧',
    description: 'British female, seductive and confident',
    category: 'english'
  },
  
  // Arabic Voices - Modern Standard Arabic (MSA)
  'salma': {
    id: 'a1KZUXKFVFDOb33I1uqr',
    name: 'Salma 🇸🇦 عربي',
    description: 'Modern Standard Arabic female voice - Clear and professional',

    category: 'arabic'
  },
  'mohammad': {
    id: 'tlETan7Okc4pzjD0z62P',
    name: 'Mohammad 🇸🇦 عربي',
    description: 'Modern Standard Arabic male voice - Deep and authoritative',

    category: 'arabic'
  },
  
  // Gulf Arabic
  'adeeb': {
    id: 's83SAGdFTflAwJcAV81K',
    name: 'Adeeb 🇦🇪 خليجي',
    description: 'Gulf Arabic male voice - Warm and engaging',
    category: 'arabic'
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
  'eleven_v3': {
    id: 'eleven_v3',
    name: 'Eleven v3',
    description: 'Latest generation model with highest quality (3k chars/~3min)',
    isRealTime: false,
    defaultSettings: {
      stability: 0.5, // v3 only accepts 0.0, 0.5, or 1.0
      similarity_boost: 0.7,
      style: 0.7,
      use_speaker_boost: true
    }
  },
  'eleven_turbo_v2_5': {
    id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5 (legacy)',
    description: 'Older low-latency model — superseded by Flash v2.5 (40k chars/~40min)',
    isRealTime: true,
    defaultSettings: {
      stability: 0.5,
      similarity_boost: 0.7
    }
  },
  'eleven_flash_v2_5': {
    id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5',
    description: 'Fastest model with good quality (40k chars/~40min)',
    isRealTime: true,
    defaultSettings: {
      stability: 0.5,
      similarity_boost: 0.7
    }
  },
  'eleven_multilingual_v2': {
    id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    description: 'Highest quality, best for non-English text (10k chars/~10min)',
    isRealTime: false,
    defaultSettings: {
      stability: 0.7,
      similarity_boost: 0.7
    }
  }
  // NOTE: only text-to-speech model_ids belong here. eleven_english_sts_v2 was
  // removed because it is a speech-to-speech (voice changer) model and fails on
  // the text-to-speech endpoint.
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
  // Dev Server
  devServerId?: string;
  // Logging Channels
  botCategoryId?: string;
  logsChannelId?: string;
  joinLeftChannelId?: string;
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
  // Dev Server
  devServerId: process.env.DEV_SERVER_ID,
  // Logging Channels
  botCategoryId: process.env.BOT_CATEGORY,
  logsChannelId: process.env.LOGS_CHANNEL,
  joinLeftChannelId: process.env.JOIN_LEFT_CHANNEL,
};

// Validate required configuration
if (!config.botToken) {
  throw new Error('Missing required environment variable: BOT_TOKEN');
}
if (!config.clientId) {
  throw new Error('Missing required environment variable: CLIENT_ID');
}

export default config;
