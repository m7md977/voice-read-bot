import { Client, GatewayIntentBits, Events, Collection, ChatInputCommandInteraction } from 'discord.js';
import { voiceReadManager } from './services/voice/VoiceReadManager';
import { logger } from './services/logging';
import config from './config';
import * as readCommand from './commands/read';
import { Command } from './types/Command';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Command collection
const commands = new Collection<string, Command>();
commands.set(readCommand.data.name, readCommand as Command);

client.once(Events.ClientReady, () => {
  logger.info('BOT', `Ready! Logged in as ${client.user?.tag}`);
  logger.info('BOT', `Voice Read Bot is active in ${client.guilds.cache.size} servers`);
  
  // Set bot status to "Playing /read"
  client.user?.setActivity('/read', { type: 0 }); // 0 is ActivityType.Playing
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn('BOT', `No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error('BOT', `Error executing command ${interaction.commandName}`, error, interaction.guild ?? undefined);
    
    const errorReply = {
      content: 'There was an error while executing this command!',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

// Handle message events for voice reading
client.on(Events.MessageCreate, async message => {
  // Skip bot messages
  if (message.author.bot) return;
  
  // Skip messages without content
  if (!message.content) return;
  
  // Only process guild messages
  if (!message.guild) return;
  
  try {
    // Check if there's an active voice reading session for this text channel
    const sessionInfo = voiceReadManager.findSessionByTextChannel(message.channel.id);
    if (!sessionInfo) return;
    
    // Get nickname (display name) or fallback to username
    const member = message.member;
    let displayName = member?.displayName || message.author.displayName || message.author.username;
    
    // Shorten long nicknames (max 20 characters)
    if (displayName.length > 20) {
      displayName = displayName.substring(0, 17) + '...';
    }
    
    // Enqueue the message for reading
    await voiceReadManager.enqueue(
      sessionInfo.guildId,
      sessionInfo.voiceChannelId,
      message.content,
      displayName
    );
    
  } catch (error) {
    logger.error('MESSAGE_HANDLER', 'Error processing message for voice reading', error, message.guild);
  }
});

// Handle voice state updates for session management
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  try {
    // Handle users leaving voice channels where voice reading is active
    if (oldState.channel && !newState.channel) {
      // User left a channel - this is handled by the VoiceReadSession's empty channel monitoring
      logger.debug('VOICE_STATE', `User ${newState.member?.displayName} left voice channel ${oldState.channel.name}`);
    }
    
    // Handle users joining voice channels where voice reading is active
    if (!oldState.channel && newState.channel) {
      logger.debug('VOICE_STATE', `User ${newState.member?.displayName} joined voice channel ${newState.channel.name}`);
    }
    
  } catch (error) {
    logger.error('VOICE_STATE_HANDLER', 'Error handling voice state update', error, newState.guild);
  }
});

// Handle errors
client.on(Events.Error, error => {
  logger.error('CLIENT_ERROR', 'Discord client error', error);
});

// Handle warnings
client.on(Events.Warn, info => {
  logger.warn('CLIENT_WARN', 'Discord client warning', info);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('BOT', 'Received SIGINT, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('BOT', 'Received SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Log in to Discord with your client's token
client.login(config.botToken).catch(error => {
  logger.error('BOT', 'Failed to login to Discord', error);
  process.exit(1);
});
