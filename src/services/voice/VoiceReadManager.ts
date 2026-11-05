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
import { userVoiceStore } from './UserVoiceStore';

type QueueItem = {
  text: string;
  userTag?: string;
  userId?: string;
  /** Discord message ID this queue item came from (for edit/delete tracking) */
  messageId?: string;
};

type VoiceReadOptions = {
  speed: number;
  /** Resource volume multiplier: 1 = normal, 0-2 supported (inline volume transform) */
  volume: number;
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
  private lastSpokenUserTag: string | null = null;
  /** Discord message ID of the item currently being (or about to be) spoken, for edit/delete tracking */
  private currentMessageId: string | null = null;
  /** Discord message ID of the public control message with reaction controls (skip/stop) */
  private statusMessageId: string | null = null;
  /** Discord message ID of the live "Now Reading" display with the same reaction controls */
  private nowPlayingMessageId: string | null = null;
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

    // Create the audio player up front so it can be (re)subscribed to every
    // connection we establish — including any recreated after a reconnect.
    if (!this.player) {
      this.player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      });
      this.player.on(AudioPlayerStatus.Idle, () => {
        this.isPlaying = false;
        this.currentMessageId = null;
        void this.playNext();
      });
      this.player.on('error', (err) => {
        logger.error('VOICE_READ', 'Audio player error', err);
        this.isPlaying = false;
        this.currentMessageId = null;
        void this.playNext();
      });
    }

    await this.establishVoiceConnection();

    // Start monitoring for empty channel
    this.startEmptyChannelMonitoring();

    // Set up voice activity detection if enabled
    if (this.options.pauseOnVoiceActivity) {
      this.setupVoiceActivityDetection();
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

      // (Re)subscribe the player to the (possibly newly created) connection so
      // audio keeps flowing after a reconnect, not just on the first connect.
      if (this.player && this.connection) {
        this.connection.subscribe(this.player);
      }

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
            // Attach a catch: this retry runs detached, so if it exhausts all
            // attempts and throws, the rejection would otherwise be unhandled
            // and could crash the process.
            void this.establishVoiceConnection().catch(retryError => {
              logger.error('VOICE_READ', 'Voice connection retries exhausted', retryError);
              if (this.sourceTextChannel && 'send' in this.sourceTextChannel && typeof this.sourceTextChannel.send === 'function') {
                this.sourceTextChannel.send('❌ Could not connect to the voice channel. Voice reading has stopped.').catch(() => {});
              }
              voiceReadManager.stopSession(this.guild.id, this.voiceChannel.id);
            });
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

  public async enqueue(text: string, userTag?: string, userId?: string, messageId?: string): Promise<void> {
    if (this.destroyed || this.isPaused) return;
    
    // Filter text based on options
    const filteredText = this.filterText(text);
    if (!filteredText) return; // Skip if filtered out
    
    // Enforce queue size limit to prevent memory issues in busy channels
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('VOICE_READ', `Queue is full (${this.queue.length}/${this.MAX_QUEUE_SIZE}), dropping oldest message`);
      this.queue.shift(); // Remove oldest message
    }
    
    this.queue.push({ text: filteredText, userTag, userId, messageId });
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
      // Collapse repeated emojis first (😂😂😂 -> 😂) so each unique emoji is read once
      processedText = EmojiProcessor.dedupeEmojis(processedText);

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

  private async synthesize(text: string, voiceIdOverride?: string): Promise<NodeJS.ReadableStream | Buffer | null> {
    try {
      // Always use ElevenLabs for voice features
      const stream = await this.synthesizeWithElevenLabs(text, voiceIdOverride);
      if (stream) return stream;
    } catch (err) {
      logger.warn('VOICE_READ', 'ElevenLabs TTS failed', err);
    }
    return null;
  }

  private async synthesizeWithElevenLabs(text: string, voiceIdOverride?: string): Promise<Readable | null> {
    try {
      if (!config.elevenLabsApiKey) return null;
      const voiceId = voiceIdOverride || this.options.voiceId || config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'; // default (Alloy-like) if unset
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

      // Get model settings (Flash v2.5 is the current low-latency default)
      const modelId = this.options.modelId || config.elevenLabsTtsModelId || 'eleven_flash_v2_5';
      const model = ELEVENLABS_MODELS[modelId] || ELEVENLABS_MODELS.eleven_flash_v2_5;
      
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
    this.currentMessageId = next.messageId ?? null;

    const shouldAnnounceName = Boolean(next.userTag) && next.userTag !== this.lastSpokenUserTag;
    const textToSpeak = shouldAnnounceName ? `${next.userTag}: ${next.text}` : next.text;
    this.lastSpokenUserTag = next.userTag ?? null;
    const assignedVoiceId = next.userId ? userVoiceStore.get(this.guild.id, next.userId) : undefined;
    const source = await this.synthesize(textToSpeak, assignedVoiceId);
    if (!source) {
      this.isPlaying = false;
      return void this.playNext();
    }
    // If the message was deleted/edited away while we were synthesizing, discard it
    if (next.messageId && this.currentMessageId !== next.messageId) {
      logger.info('VOICE_READ', 'Message was removed while synthesizing - skipping playback');
      this.isPlaying = false;
      return void this.playNext();
    }

    try {
      const resource = createAudioResource(source as Readable, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      // Volume is applied after creation via the inline volume transformer
      resource.volume?.setVolume(this.options.volume);
      this.player.play(resource);
      // Fire-and-forget: keep the live "Now Reading" message in sync so the
      // reaction controls are always visible at the bottom of the channel
      void this.updateNowPlayingMessage(textToSpeak).catch(() => {});
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
    this.deleteStatusMessage();
    this.deleteNowPlayingMessage();
    this.clearEmptyChannelTimer();
    this.clearVoiceActivityTimer();
    this.speakingUsers.clear();
    this.voiceActivityPaused = false;
    this.lastSpokenUserTag = null;
    this.currentMessageId = null;
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

  /**
   * Remove all queued items (and any currently-playing message) that came from
   * the given Discord message. Used when the source message is deleted.
   */
  public removeById(messageId: string): boolean {
    const before = this.queue.length;
    this.queue = this.queue.filter(item => item.messageId !== messageId);
    const removed = this.queue.length !== before;

    if (this.currentMessageId === messageId) {
      // The message currently being read was deleted — stop it so playNext fires
      this.currentMessageId = null;
      try {
        this.player?.stop();
      } catch { /* noop */ }
      logger.info('VOICE_READ', 'Stopped playback of a deleted message');
      return true;
    }

    if (removed) {
      logger.info('VOICE_READ', 'Removed deleted message from queue');
    }
    return removed;
  }

  /**
   * Re-filter and replace the queued text for a message that was edited.
   * Returns true if a queued item was updated or removed.
   * Messages currently playing (or being synthesized) are left alone.
   */
  public updateById(messageId: string, newContent: string): boolean {
    if (this.currentMessageId === messageId) {
      logger.debug('VOICE_READ', 'Edited message is playing/being synthesized - keeping current audio');
      return false;
    }

    const index = this.queue.findIndex(item => item.messageId === messageId);
    if (index === -1) return false;

    const filtered = this.filterText(newContent);
    if (!filtered) {
      this.queue.splice(index, 1);
      logger.info('VOICE_READ', 'Removed edited message from queue (no readable content)');
      return true;
    }

    this.queue[index].text = filtered;
    logger.info('VOICE_READ', 'Updated queued message after edit');
    return true;
  }

  /** Store the ID of the public control message so reactions can be matched to this session */
  public setStatusMessage(messageId: string): void {
    this.statusMessageId = messageId;
  }

  public getStatusMessageId(): string | null {
    return this.statusMessageId;
  }

  /** True if the given message belongs to this session's reaction controls (start message or live "Now Reading") */
  public ownsControlMessage(messageId: string): boolean {
    return this.statusMessageId === messageId || this.nowPlayingMessageId === messageId;
  }

  /**
   * Post (first time) or update the live "Now Reading" message in the source
   * text channel so the skip/stop reactions are always visible without
   * scrolling up to the session start message. Fire-and-forget: playback is
   * never delayed by this.
   */
  private async updateNowPlayingMessage(spokenText: string): Promise<void> {
    if (this.destroyed) return;

    const channel = this.sourceTextChannel;
    if (!channel || !('send' in channel) || typeof channel.send !== 'function') return;

    // Keep embeds well under the limits for long messages
    const preview = spokenText.length > 300 ? `${spokenText.slice(0, 297)}…` : spokenText;
    const payload = {
      embeds: [{
        color: 0x2db466,
        title: '🔊 Now Reading',
        description: preview,
        footer: { text: 'React ⏭️ to skip, ⏹️ to stop' }
      }]
    };

    // Update the existing display in place when we have one
    if (this.nowPlayingMessageId && 'messages' in channel && typeof channel.messages?.edit === 'function') {
      try {
        await channel.messages.edit(this.nowPlayingMessageId, payload);
        return;
      } catch {
        // Message may have been deleted — fall through and post a new one
        this.nowPlayingMessageId = null;
      }
    }

    try {
      const message = await channel.send(payload);
      this.nowPlayingMessageId = message.id;
      await message.react('⏭️');
      await message.react('⏹️');
    } catch (error) {
      logger.warn('VOICE_READ', 'Could not post the "Now Reading" status message', error);
    }
  }

  /** Best-effort deletion of the control message when the session ends */
  private deleteStatusMessage(): void {
    const messageId = this.statusMessageId;
    this.statusMessageId = null;
    if (!messageId) return;

    const channel = this.sourceTextChannel;
    if (channel && 'send' in channel && typeof channel.send === 'function') {
      void channel.messages.delete(messageId).catch(() => {/* message may already be gone */});
    }
  }

  /** Best-effort deletion of the live "Now Reading" message when the session ends */
  private deleteNowPlayingMessage(): void {
    const messageId = this.nowPlayingMessageId;
    this.nowPlayingMessageId = null;
    if (!messageId) return;

    const channel = this.sourceTextChannel;
    if (channel && 'send' in channel && typeof channel.send === 'function') {
      void channel.messages.delete(messageId).catch(() => {/* message may already be gone */});
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
      volume: 1.0, // Normal volume
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

  public async enqueue(guildId: string, voiceChannelId: string, text: string, userTag?: string, userId?: string, messageId?: string): Promise<void> {
    const session = this.sessions.get(this.key(guildId, voiceChannelId));
    if (!session) return;
    await session.enqueue(text, userTag, userId, messageId);
  }

  /**
   * Called when a source message is deleted: removes it from the queue and
   * stops playback if it was the message being read.
   */
  public removeMessage(channelId: string, messageId: string): boolean {
    const key = this.textChannelIndex.get(channelId);
    if (!key) return false;
    const session = this.sessions.get(key);
    if (!session) return false;
    return session.removeById(messageId);
  }

  /**
   * Called when a source message is edited: re-filters and replaces its queued text.
   */
  public updateMessage(channelId: string, messageId: string, newContent: string): boolean {
    const key = this.textChannelIndex.get(channelId);
    if (!key) return false;
    const session = this.sessions.get(key);
    if (!session) return false;
    return session.updateById(messageId, newContent);
  }

  /**
   * Find the active session that owns the given control message — either the
   * session start message or the live "Now Reading" display — used for
   * reaction controls (⏭️ skip / ⏹️ stop).
   */
  public findSessionByStatusMessage(channelId: string, messageId: string): VoiceReadSession | null {
    const key = this.textChannelIndex.get(channelId);
    if (!key) return null;
    const session = this.sessions.get(key);
    if (!session) return null;
    return session.ownsControlMessage(messageId) ? session : null;
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

  /**
   * Stop and clean up every active session belonging to a guild.
   * Used when the bot is removed from a guild so timers/connections don't leak.
   */
  public stopAllSessionsForGuild(guildId: string): number {
    let stopped = 0;
    for (const [sessionKey, session] of this.sessions.entries()) {
      if (!sessionKey.startsWith(`${guildId}:`)) continue;
      session.stop();
      this.sessions.delete(sessionKey);
      for (const [textId, mappedKey] of this.textChannelIndex.entries()) {
        if (mappedKey === sessionKey) this.textChannelIndex.delete(textId);
      }
      stopped++;
    }
    return stopped;
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
