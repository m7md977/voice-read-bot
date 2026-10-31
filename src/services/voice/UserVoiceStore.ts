import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { logger } from '../logging';

type GuildVoiceMap = Record<string, string>;
type StoreData = Record<string, GuildVoiceMap>;

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(STORE_DIR, 'user-voices.json');

class UserVoiceStore {
  private data: StoreData = {};
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;

    try {
      if (!existsSync(STORE_PATH)) {
        this.data = {};
        return;
      }

      const raw = readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as StoreData;
      this.data = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      logger.warn('USER_VOICE_STORE', 'Failed to load user voice assignments, starting empty', error);
      this.data = {};
    }
  }

  private persist(): void {
    try {
      if (!existsSync(STORE_DIR)) {
        mkdirSync(STORE_DIR, { recursive: true });
      }
      writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      logger.error('USER_VOICE_STORE', 'Failed to save user voice assignments', error);
    }
  }

  public get(guildId: string, userId: string): string | undefined {
    this.ensureLoaded();
    return this.data[guildId]?.[userId];
  }

  public set(guildId: string, userId: string, voiceId: string): void {
    this.ensureLoaded();
    if (!this.data[guildId]) {
      this.data[guildId] = {};
    }
    this.data[guildId][userId] = voiceId;
    this.persist();
  }

  public clear(guildId: string, userId: string): boolean {
    this.ensureLoaded();
    const guildMap = this.data[guildId];
    if (!guildMap || !(userId in guildMap)) {
      return false;
    }

    delete guildMap[userId];
    if (Object.keys(guildMap).length === 0) {
      delete this.data[guildId];
    }
    this.persist();
    return true;
  }
}

export const userVoiceStore = new UserVoiceStore();
