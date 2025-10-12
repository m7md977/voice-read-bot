import { Guild } from 'discord.js';

// Simple logger without database or complex channel logging
export const logger = {
  info: (source: string, message: string, details?: any, guild?: Guild) => {
    const timestamp = new Date().toISOString();
    const guildInfo = guild ? ` [${guild.name}]` : '';
    console.log(`[${timestamp}] [INFO] [${source}]${guildInfo} ${message}`, details || '');
  },
  
  warn: (source: string, message: string, details?: any, guild?: Guild) => {
    const timestamp = new Date().toISOString();
    const guildInfo = guild ? ` [${guild.name}]` : '';
    console.warn(`[${timestamp}] [WARN] [${source}]${guildInfo} ${message}`, details || '');
  },
  
  error: (source: string, message: string, details?: any, guild?: Guild) => {
    const timestamp = new Date().toISOString();
    const guildInfo = guild ? ` [${guild.name}]` : '';
    console.error(`[${timestamp}] [ERROR] [${source}]${guildInfo} ${message}`, details || '');
  },

  debug: (source: string, message: string, details?: any, guild?: Guild) => {
    const timestamp = new Date().toISOString();
    const guildInfo = guild ? ` [${guild.name}]` : '';
    console.log(`[${timestamp}] [DEBUG] [${source}]${guildInfo} ${message}`, details || '');
  }
};
