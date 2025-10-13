import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
  StreamType,
  entersState,
} from '@discordjs/voice';
import { Guild, TextBasedChannel, VoiceBasedChannel, GuildMember } from 'discord.js';
import { logger } from '../logging';
import config, { ELEVENLABS_MODELS } from '../../config';
import { Readable } from 'stream';
import { EmojiProcessor } from './EmojiProcessor';

type QueueItem = {
  text: string;
  userTag?: string;
};

type VoiceReadOptions = {
  speed: number;
  maxLength: number;
  filterLinks: boolean;
  pauseOnVoiceActivity: boolean;
  processEmojis: boolean;
  emojiMode: 'replace' | 'explain' | 'both';
  bypassRole?: string;
  modelId?: string;
  voiceId?: string;
};

type SessionKey = string; // `${guildId}:${voiceChannelId}`

class VoiceReadSession {
  public readonly guild: Guild;
  public readonly voiceChannel: VoiceBasedChannel;
  public readonly sourceTextChannel: TextBasedChannel;
  public readonly options: VoiceReadOptions;
  private connection: VoiceConnection | null = null;
  private player: AudioPlayer | null = null;
  private queue: QueueItem[] = [];
  private isPlaying = false;
  private isPaused = false;
  private destroyed = false;
  private voiceActivityPaused = false;
  private emptyChannelTimer: NodeJS.Timeout | null = null;
  private voiceActivityTimer: NodeJS.Timeout | null = null;
  private speakingUsers = new Map<string, number>(); // userId -> timestamp when started speaking
  private readonly EMPTY_CHANNEL_TIMEOUT = 30000; // 30 seconds
  private readonly VOICE_ACTIVITY_PAUSE = 2500; // 2.5 seconds after speaking stops (more natural)
  private readonly MIN_SPEAKING_DURATION = 700; // Ignore brief sounds under 0.7s
  private readonly MAX_QUEUE_SIZE = 25; // Maximum messages in queue to prevent memory issues
  private connectionRetryCount = 0;
  private readonly MAX_CONNECTION_RETRIES = 3;
  private readonly CONNECTION_RETRY_DELAY = 5000; // 5 seconds

  constructor(guild: Guild, voiceChannel: VoiceBasedChannel, sourceTextChannel: TextBasedChannel, options: VoiceReadOptions) {
    this.guild = guild;
    this.voiceChannel = voiceChannel;
    this.sourceTextChannel = sourceTextChannel;
    this.options = options;
  }

  public async start(): Promise<void> {
    if (this.destroyed) return;
    
    await this.establishVoiceConnection();
    
    // Start monitoring for empty channel
    this.startEmptyChannelMonitoring();
    
    // Set up voice activity detection if enabled
    if (this.options.pauseOnVoiceActivity) {
      this.setupVoiceActivityDetection();
    }

    if (!this.player) {
      this.player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      });
      this.player.on(AudioPlayerStatus.Idle, () => {
        this.isPlaying = false;
        void this.playNext();
      });
      this.player.on('error', (err) => {
        logger.error('VOICE_READ', 'Audio player error', err);
        this.isPlaying = false;
        void this.playNext();
      });
      this.connection?.subscribe(this.player);
    }
  }

  private async establishVoiceConnection(): Promise<void> {
    if (this.destroyed) return;
    
    try {
      if (!this.connection) {
        this.connection = joinVoiceChannel({
          channelId: this.voiceChannel.id,
          guildId: this.guild.id,
          adapterCreator: this.guild.voiceAdapterCreator,
          selfDeaf: false,
        });
        
        this.setupConnectionEventHandlers();
      }
      
      // Wait for connection to be ready with timeout
      await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
      logger.info('VOICE_READ', `Successfully connected to voice channel: ${this.voiceChannel.name}`);
      
      // Reset retry count on successful connection
      this.connectionRetryCount = 0;
      
    } catch (error) {
      logger.error('VOICE_READ', 'Failed to establish voice connection', error);
      
      // Clean up failed connection
      try { this.connection?.destroy(); } catch { /* noop */ }
      this.connection = null;
      
      // Retry if we haven't exceeded max retries
      if (this.connectionRetryCount < this.MAX_CONNECTION_RETRIES && !this.destroyed) {
        this.connectionRetryCount++;
        logger.info('VOICE_READ', `Retrying connection (${this.connectionRetryCount}/${this.MAX_CONNECTION_RETRIES}) in ${this.CONNECTION_RETRY_DELAY}ms`);
        
        setTimeout(() => {
          if (!this.destroyed) {
            void this.establishVoiceConnection();
          }
        }, this.CONNECTION_RETRY_DELAY);
        
        return;
      }
      
      // Max retries exceeded or destroyed
      throw new Error(`Failed to connect to voice channel after ${this.MAX_CONNECTION_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupConnectionEventHandlers(): void {
    if (!this.connection) return;
    
    // Handle connection lifecycle with recovery
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (this.destroyed) return;
      
      logger.warn('VOICE_READ', 'Voice connection disconnected, attempting recovery...');
      
      try {
        // Try to reconnect
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Reconnection successful
        logger.info('VOICE_READ', 'Voice connection recovered successfully');
      } catch {
        // Reconnection failed, clean up and retry
        logger.warn('VOICE_READ', 'Voice connection recovery failed, cleaning up...');
        try { this.connection?.destroy(); } catch { /* noop */ }
        this.connection = null;
        
        // Attempt to re-establish connection
        if (!this.destroyed) {
          setTimeout(() => {
            if (!this.destroyed) {
              void this.establishVoiceConnection().catch(error => {
                logger.error('VOICE_READ', 'Failed to re-establish connection after disconnect', error);
                // Notify through text channel if possible
                if (this.sourceTextChannel && 'send' in this.sourceTextChannel && typeof this.sourceTextChannel.send === 'function') {
                  this.sourceTextChannel.send('❌ Voice connection lost and could not be recovered. Voice reading has stopped.').catch(() => {});
                }
                this.stop();
              });
            }
          }, this.CONNECTION_RETRY_DELAY);
        }
      }
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      logger.info('VOICE_READ', 'Voice connection destroyed');
      if (!this.destroyed) {
        this.connection = null;
      }
    });
  }

  public async enqueue(text: string, userTag?: string): Promise<void> {
    if (this.destroyed || this.isPaused) return;
    
    // Filter text based on options
    const filteredText = this.filterText(text);
    if (!filteredText) return; // Skip if filtered out
    
    // Enforce queue size limit to prevent memory issues in busy channels
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('VOICE_READ', `Queue is full (${this.queue.length}/${this.MAX_QUEUE_SIZE}), dropping oldest message`);
      this.queue.shift(); // Remove oldest message
    }
    
    this.queue.push({ text: filteredText, userTag });
    logger.debug('VOICE_READ', `Message queued. Queue size: ${this.queue.length}`);
    
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private filterText(text: string): string | null {
    // Skip empty or whitespace-only messages
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    let processedText = trimmed;
    
    // Remove URLs and links if enabled (instead of skipping entire message)
    if (this.options.filterLinks) {
      // Remove Discord invite links
      processedText = processedText.replace(/discord\.gg\/[^\s]+/gi, '');
      processedText = processedText.replace(/discord\.com\/invite\/[^\s]+/gi, '');
      
      // Remove HTTP/HTTPS URLs
      processedText = processedText.replace(/https?:\/\/[^\s]+/gi, '');
      
      // Remove www. links
      processedText = processedText.replace(/www\.[^\s]+/gi, '');
      
      // Remove common domain patterns
      processedText = processedText.replace(/[^\s]+\.(com|net|org|io|co|me|ly|gg|tv|xyz|app|dev|cc|gg|bot|de|uk|ca|edu|gov)[^\s]*/gi, '');
      
      // Clean up extra whitespace left by removals
      processedText = processedText.replace(/\s+/g, ' ').trim();
    }
    
    // Remove user and role mentions (read as text instead)
    processedText = processedText.replace(/<@!?(\d+)>/g, 'someone');
    processedText = processedText.replace(/<@&(\d+)>/g, 'a role');
    
    // Remove channel mentions
    processedText = processedText.replace(/<#(\d+)>/g, 'a channel');
    
    // Remove custom emojis (but keep regular emojis for processing)
    processedText = processedText.replace(/<a?:\w+:\d+>/g, '');
    
    // Clean up again after all replacements
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    // Skip if message is now empty after filtering
    if (!processedText) {
      logger.info('VOICE_READ', 'Message empty after filtering links/mentions');
      return null;
    }
    
    // Process emojis if enabled
    if (this.options.processEmojis && EmojiProcessor.containsEmojis(processedText)) {
      const emojiCount = EmojiProcessor.countEmojis(processedText);
      logger.info('VOICE_READ', `Processing ${emojiCount} emoji(s) in message`);
      
      processedText = EmojiProcessor.processEmojis(processedText, {
        mode: this.options.emojiMode,
        addPauses: true
      });
    }
    
    // Check message length after emoji processing
    if (processedText.length > this.options.maxLength) {
      logger.info('VOICE_READ', `Skipping long message after processing (${processedText.length} > ${this.options.maxLength} chars)`);
      return null;
    }
    
    // Filter out messages that are mostly special characters or numbers
    // But be more lenient if emojis were processed (since they add readable text)
    const alphaCount = (processedText.match(/[a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    const hasEmojis = EmojiProcessor.containsEmojis(trimmed);
    const threshold = hasEmojis ? 0.1 : 0.2; // More lenient for emoji messages
    
    if (alphaCount < processedText.length * threshold && processedText.length > 10) {
      logger.info('VOICE_READ', 'Skipping message with too few letters');
      return null;
    }
    
    // Skip messages that are just markdown formatting, code blocks, etc.
    if (/^[\`\*\_\~\|\>\#\-\=\+\[\]\(\)\{\}]+$/.test(processedText)) {
      logger.info('VOICE_READ', 'Skipping message with only formatting characters');
      return null;
    }
    
    // Remove markdown formatting for better TTS
    processedText = processedText.replace(/\*\*(.+?)\*\*/g, '$1'); // Bold
    processedText = processedText.replace(/\*(.+?)\*/g, '$1'); // Italic
    processedText = processedText.replace(/\_\_(.+?)\_\_/g, '$1'); // Underline
    processedText = processedText.replace(/\_(.+?)\_/g, '$1'); // Italic underscore
    processedText = processedText.replace(/\~\~(.+?)\~\~/g, '$1'); // Strikethrough
    processedText = processedText.replace(/\|\|(.+?)\|\|/g, '$1'); // Spoiler
    processedText = processedText.replace(/\`\`\`(.+?)\`\`\`/gs, 'code block'); // Code blocks
    processedText = processedText.replace(/\`(.+?)\`/g, '$1'); // Inline code
    
    // Final cleanup
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    return processedText;
  }

  public pause(): void {
    this.isPaused = true;
    if (this.player && this.isPlaying) {
      this.player.pause();
    }
  }

  public resume(): void {
    this.isPaused = false;
    if (this.player) {
      this.player.unpause();
      // Resume processing queue if not currently playing
      if (!this.isPlaying && this.queue.length > 0) {
        void this.playNext();
      }
    }
  }

  private async synthesize(text: string): Promise<NodeJS.ReadableStream | Buffer | null> {
    try {
      // Always use ElevenLabs for voice features
      const stream = await this.synthesizeWithElevenLabs(text);
      if (stream) return stream;
    } catch (err) {
      logger.warn('VOICE_READ', 'ElevenLabs TTS failed', err);
    }
    return null;
  }

  private async synthesizeWithElevenLabs(text: string): Promise<Readable | null> {
    try {
      if (!config.elevenLabsApiKey) return null;
      const voiceId = this.options.voiceId || config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'; // default (Alloy-like) if unset
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

      // Get model settings
      const modelId = this.options.modelId || config.elevenLabsTtsModelId || 'eleven_turbo_v2_5';
      const model = ELEVENLABS_MODELS[modelId] || ELEVENLABS_MODELS.eleven_turbo_v2_5;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenLabsApiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({ 
          text, 
          model_id: model.id,
          voice_settings: { 
            ...model.defaultSettings,
            speed: this.options.speed 
          } 
        }),
      });
      if (!res.ok || !res.body) {
        const errorText = await res.text().catch(() => 'No error details available');
        logger.warn('VOICE_READ', `ElevenLabs TTS HTTP ${res.status}`, {
          error: errorText,
          modelId: model.id,
          voiceId,
          settings: model.defaultSettings
        });
        return null;
      }
      // Convert web ReadableStream to Node Readable
      // @ts-ignore Node 18: res.body is a web ReadableStream
      const nodeStream = Readable.fromWeb ? Readable.fromWeb(res.body) : (res as any).body;
      return nodeStream as Readable;
    } catch (err) {
      logger.warn('VOICE_READ', 'ElevenLabs TTS failed', err);
      return null;
    }
  }

  private async playNext(): Promise<void> {
    if (this.destroyed || !this.player || this.isPaused) return;
    
    // Check for voice activity if enabled - WAIT until no one is talking
    if (this.options.pauseOnVoiceActivity && this.isVoiceActivityDetected()) {
      logger.info('VOICE_READ', 'Waiting for voice activity to stop before reading...');
      // Wait and try again
      setTimeout(() => void this.playNext(), 1000);
      return;
    }
    
    const next = this.queue.shift();
    if (!next) return;
    this.isPlaying = true;

    const textToSpeak = next.userTag ? `${next.userTag} says: ${next.text}` : next.text;
    const source = await this.synthesize(textToSpeak);
    if (!source) {
      this.isPlaying = false;
      return void this.playNext();
    }

    try {
      const resource = createAudioResource(source as Readable, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      this.player.play(resource);
    } catch (err) {
      logger.error('VOICE_READ', 'Failed to create/play resource', err);
      this.isPlaying = false;
      return void this.playNext();
    }
  }

  private setupVoiceActivityDetection(): void {
    if (!this.connection) return;
    
    try {
      // Set up voice receiver to detect when users start/stop speaking
      const receiver = this.connection.receiver;
      
      // Listen for speaking start events
      receiver.speaking.on('start', (userId) => {
        const member = this.guild.members.cache.get(userId);
        if (member && !member.user.bot) {
          // Check if user has bypass role
          const hasBypassRole = this.checkBypassRole(member);
          if (hasBypassRole) {
            logger.info('VOICE_READ', `${member.displayName} started speaking but has bypass role - continuing reading`);
            return; // Don't pause for users with bypass role
          }
          
          // Track when user started speaking
          const startTime = Date.now();
          this.speakingUsers.set(userId, startTime);
          
          // Wait a bit to see if it's actual speaking or just a brief sound
          setTimeout(() => {
            // Check if user is still speaking after MIN_SPEAKING_DURATION
            const userStartTime = this.speakingUsers.get(userId);
            if (userStartTime === startTime && this.speakingUsers.has(userId)) {
              // User has been speaking for MIN_SPEAKING_DURATION, pause reading
              logger.info('VOICE_READ', `${member.displayName} is speaking (sustained) - pausing reading`);
              this.voiceActivityPaused = true;
              
              // Pause current playback if playing
              if (this.player && this.isPlaying) {
                this.player.pause();
              }
            }
          }, this.MIN_SPEAKING_DURATION);
        }
      });
      
      // Listen for speaking stop events
      receiver.speaking.on('end', (userId) => {
        const member = this.guild.members.cache.get(userId);
        if (member && !member.user.bot) {
          // Check if user has bypass role - only process if they don't have it
          const hasBypassRole = this.checkBypassRole(member);
          if (hasBypassRole) {
            return; // Don't track users with bypass role
          }
          
          const startTime = this.speakingUsers.get(userId);
          if (startTime) {
            const duration = Date.now() - startTime;
            logger.info('VOICE_READ', `${member.displayName} stopped speaking (duration: ${duration}ms)`);
          }
          
          this.speakingUsers.delete(userId);
          
          // If no one else is speaking, resume after a delay
          if (this.speakingUsers.size === 0) {
            // Clear any existing timer
            if (this.voiceActivityTimer) {
              clearTimeout(this.voiceActivityTimer);
            }
            
            // Wait for natural pause in conversation before resuming
            this.voiceActivityTimer = setTimeout(() => {
              logger.info('VOICE_READ', 'All voice activity stopped - resuming reading');
              this.voiceActivityPaused = false;
              
              // Resume playback if it was paused
              if (this.player && this.isPlaying) {
                this.player.unpause();
              }
              
              // Try to play next item in queue
              if (!this.isPlaying && this.queue.length > 0) {
                void this.playNext();
              }
            }, this.VOICE_ACTIVITY_PAUSE);
          }
        }
      });
      
      logger.info('VOICE_READ', 'Voice activity detection enabled');
    } catch (error) {
      logger.warn('VOICE_READ', 'Failed to set up voice activity detection', error);
    }
  }

  private isVoiceActivityDetected(): boolean {
    return this.voiceActivityPaused && this.speakingUsers.size > 0;
  }

  private checkBypassRole(member: GuildMember): boolean {
    if (!this.options.bypassRole) return false;
    
    // Check if the member has the bypass role by ID
    return member.roles.cache.has(this.options.bypassRole);
  }

  public stop(): void {
    this.destroyed = true;
    this.clearEmptyChannelTimer();
    this.clearVoiceActivityTimer();
    this.speakingUsers.clear();
    this.voiceActivityPaused = false;
    try { this.player?.stop(true); } catch { /* noop */ }
    try { this.connection?.destroy(); } catch { /* noop */ }
    this.player = null;
    this.connection = null;
    this.queue = [];
  }

  public skipCurrent(): boolean {
    if (!this.player || !this.isPlaying) return false;
    
    // Stop current playback, which will trigger playNext
    try {
      this.player.stop();
      logger.info('VOICE_READ', 'Skipped current message');
      return true;
    } catch (error) {
      logger.error('VOICE_READ', 'Failed to skip current message', error);
      return false;
    }
  }

  public clearQueue(): number {
    const clearedCount = this.queue.length;
    this.queue = [];
    logger.info('VOICE_READ', `Cleared ${clearedCount} message(s) from queue`);
    return clearedCount;
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getStatus(): { 
    queueSize: number; 
    isPlaying: boolean; 
    isPaused: boolean; 
    voiceActivityPaused: boolean;
  } {
    return {
      queueSize: this.queue.length,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      voiceActivityPaused: this.voiceActivityPaused
    };
  }

  private startEmptyChannelMonitoring(): void {
    // Check if channel is empty every 10 seconds
    const checkInterval = setInterval(() => {
      if (this.destroyed) {
        clearInterval(checkInterval);
        return;
      }
      
      try {
        // Get current members in voice channel (excluding bots)
        const humanMembers = this.voiceChannel.members.filter(member => !member.user.bot);
        
        if (humanMembers.size === 0) {
          // Channel is empty, start countdown if not already started
          if (!this.emptyChannelTimer) {
            logger.info('VOICE_READ', `Voice channel ${this.voiceChannel.name} is empty, starting ${this.EMPTY_CHANNEL_TIMEOUT/1000}s countdown`);
            this.emptyChannelTimer = setTimeout(() => {
              logger.info('VOICE_READ', `Auto-leaving empty voice channel: ${this.voiceChannel.name}`);
              if (this.sourceTextChannel && 'send' in this.sourceTextChannel && typeof this.sourceTextChannel.send === 'function') {
                this.sourceTextChannel.send('🔇 Voice channel is empty, leaving automatically...').catch(() => {});
              }
              // Notify manager to clean up this session
              voiceReadManager.stopSession(this.guild.id, this.voiceChannel.id);
            }, this.EMPTY_CHANNEL_TIMEOUT);
          }
        } else {
          // Channel has users, cancel any pending disconnect
          this.clearEmptyChannelTimer();
        }
      } catch (error) {
        logger.warn('VOICE_READ', 'Error checking voice channel members', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private clearEmptyChannelTimer(): void {
    if (this.emptyChannelTimer) {
      clearTimeout(this.emptyChannelTimer);
      this.emptyChannelTimer = null;
    }
  }

  private clearVoiceActivityTimer(): void {
    if (this.voiceActivityTimer) {
      clearTimeout(this.voiceActivityTimer);
      this.voiceActivityTimer = null;
    }
  }
}

export class VoiceReadManager {
  private sessions = new Map<SessionKey, VoiceReadSession>();
  private textChannelIndex = new Map<string, SessionKey>();

  private key(guildId: string, voiceChannelId: string): SessionKey {
    return `${guildId}:${voiceChannelId}`;
  }

  public async startSession(guild: Guild, voiceChannel: VoiceBasedChannel, sourceTextChannel: TextBasedChannel, options?: Partial<VoiceReadOptions>): Promise<void> {
    const defaultOptions: VoiceReadOptions = {
      speed: 0.9, // Slightly slower than normal for better comprehension
      maxLength: 1000,
      filterLinks: true,
      pauseOnVoiceActivity: false, // Never pause for voice activity
      processEmojis: true,
      emojiMode: 'explain' // Default to explaining emojis
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    const key = this.key(guild.id, voiceChannel.id);
    
    // Check for existing session in the same voice channel
    let session = this.sessions.get(key);
    if (session) {
      logger.info('VOICE_READ_MANAGER', `Session already exists for ${voiceChannel.name}, stopping existing session`);
      // Stop existing session before creating new one
      session.stop();
      this.sessions.delete(key);
      // Clean up text channel index
      for (const [textId, mappedKey] of this.textChannelIndex.entries()) {
        if (mappedKey === key) this.textChannelIndex.delete(textId);
      }
    }
    
    // Check for any existing sessions from the same text channel in different voice channels
    const existingKey = this.textChannelIndex.get(sourceTextChannel.id);
    if (existingKey && existingKey !== key) {
      logger.info('VOICE_READ_MANAGER', `Text channel ${sourceTextChannel.id} already has session in different voice channel, cleaning up`);
      const existingSession = this.sessions.get(existingKey);
      if (existingSession) {
        existingSession.stop();
        this.sessions.delete(existingKey);
      }
      this.textChannelIndex.delete(sourceTextChannel.id);
    }
    
    // Create and start new session
    session = new VoiceReadSession(guild, voiceChannel, sourceTextChannel, finalOptions);
    this.sessions.set(key, session);
    this.textChannelIndex.set(sourceTextChannel.id, key);
    
    try {
      await session.start();
      logger.info('VOICE_READ_MANAGER', `Successfully started voice reading session in ${voiceChannel.name}`);
    } catch (error) {
      // Clean up on failure
      this.sessions.delete(key);
      this.textChannelIndex.delete(sourceTextChannel.id);
      throw error;
    }
  }

  public async enqueue(guildId: string, voiceChannelId: string, text: string, userTag?: string): Promise<void> {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return;
    await session.enqueue(text, userTag);
  }

  public stopSession(guildId: string, voiceChannelId: string): boolean {
    const key = this.key(guildId, voiceChannelId);
    const session = this.sessions.get(key);
    if (!session) return false;
    session.stop();
    this.sessions.delete(key);
    // Remove any text-channel index entries pointing to this session
    for (const [textId, mappedKey] of this.textChannelIndex.entries()) {
      if (mappedKey === key) this.textChannelIndex.delete(textId);
    }
    return true;
  }

  public getSession(guildId: string, voiceChannelId: string): VoiceReadSession | undefined {
    return this.sessions.get(this.key(guildId, voiceChannelId));
  }

  public pauseSession(guildId: string, voiceChannelId: string): boolean {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return false;
    session.pause();
    return true;
  }

  public resumeSession(guildId: string, voiceChannelId: string): boolean {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return false;
    session.resume();
    return true;
  }

  public findSessionByTextChannel(textChannelId: string): { guildId: string; voiceChannelId: string } | null {
    const key = this.textChannelIndex.get(textChannelId);
    if (!key) return null;
    const [guildId, voiceChannelId] = key.split(':');
    return { guildId, voiceChannelId };
  }

  public skipCurrent(guildId: string, voiceChannelId: string): boolean {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return false;
    return session.skipCurrent();
  }

  public clearQueue(guildId: string, voiceChannelId: string): number {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return 0;
    return session.clearQueue();
  }

  public getSessionStatus(guildId: string, voiceChannelId: string): { 
    queueSize: number; 
    isPlaying: boolean; 
    isPaused: boolean; 
    voiceActivityPaused: boolean;
  } | null {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return null;
    return session.getStatus();
  }
}

export const voiceReadManager = new VoiceReadManager();
