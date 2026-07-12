import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, GuildTextBasedChannel } from 'discord.js';
import { voiceReadManager } from '../services/voice/VoiceReadManager';
import config, { ELEVENLABS_MODELS, ELEVENLABS_VOICES } from '../config';
import { logger } from '../services/logging';

export const data = {
  name: 'read',
  description: 'Have the bot join VC and read messages from this channel',
  options: [
    {
      name: 'action',
      description: 'Start or stop voice reading',
      type: 3, // STRING
      required: true,
      choices: [
        { name: 'Start reading messages', value: 'start' },
        { name: 'Stop reading messages', value: 'stop' },
        { name: 'Pause reading', value: 'pause' },
        { name: 'Resume reading', value: 'resume' },
        { name: 'Skip current message', value: 'skip' },
        { name: 'Clear queue', value: 'clear' },
        { name: 'Show queue status', value: 'status' }
      ]
    },
    {
      name: 'model',
      description: 'ElevenLabs model to use for voice synthesis',
      type: 3, // STRING
      required: false,
      choices: Object.values(ELEVENLABS_MODELS).map(model => ({
        name: `${model.name}${!model.isRealTime ? ' (may be slower)' : ''}`,
        value: model.id
      }))
    },
    {
      name: 'voice',
      description: 'Voice to use for reading messages',
      type: 3, // STRING
      required: false,
      choices: Object.values(ELEVENLABS_VOICES).map(voice => ({
        name: `${voice.name} - ${voice.description}`,
        value: voice.id
      }))
    }
  ]
};

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;
    
    // Check if user is in a voice channel
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      return interaction.reply({ 
        content: '❌ You need to join a voice channel first to use voice reading.', 
        ephemeral: true 
      });
    }

    // Check bot permissions for the voice channel
    const botMember = interaction.guild.members.me;
    if (!botMember) {
      return interaction.reply({ 
        content: '❌ Unable to verify bot permissions. Please try again.', 
        ephemeral: true 
      });
    }

    const permissions = voiceChannel.permissionsFor(botMember);
    const requiredPermissions = [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.UseVAD
    ];

    const missingPermissions = requiredPermissions.filter(perm => !permissions?.has(perm));
    if (missingPermissions.length > 0) {
      const permissionNames = missingPermissions.map(perm => {
        switch (perm) {
          case PermissionFlagsBits.Connect: return 'Connect';
          case PermissionFlagsBits.Speak: return 'Speak';
          case PermissionFlagsBits.UseVAD: return 'Use Voice Activity';
          default: return 'Unknown';
        }
      });
      
      return interaction.reply({ 
        content: `❌ I'm missing the following permissions in ${voiceChannel}:\n` +
                `• ${permissionNames.join('\n• ')}\n\n` +
                `Please ask a server admin to grant these permissions.`, 
        ephemeral: true 
      });
    }

    // Check text channel permissions (only for guild channels)
    if (!interaction.channel) {
      return interaction.reply({ 
        content: '❌ Unable to access this text channel.', 
        ephemeral: true 
      });
    }

    // Check if it's a guild text channel (not DM)
    if ('permissionsFor' in interaction.channel) {
      const textChannel = interaction.channel as GuildTextBasedChannel;
      const textPermissions = textChannel.permissionsFor(botMember);
      if (!textPermissions?.has(PermissionFlagsBits.ViewChannel) || 
          !textPermissions?.has(PermissionFlagsBits.ReadMessageHistory)) {
        return interaction.reply({ 
          content: '❌ I need permission to view this channel and read message history to monitor for messages to read.', 
          ephemeral: true 
        });
      }
    }

    const action = interaction.options.getString('action', true);
    const modelId = interaction.options.getString('model');
    const voiceId = interaction.options.getString('voice');
    
    // Fixed defaults (these are not exposed as command options)
    const speed = 1.0; // Normal speed
    const maxLength = 3000; // Default max length
    const emojiMode = 'replace' as const; // Convert emojis to spoken descriptions (e.g. 🔥 -> "fire")

    if (action === 'start') {
      // Only defer if not already deferred or replied
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      
      // Check for ElevenLabs configuration
      if (config.ttsProvider !== 'elevenlabs' || !config.elevenLabsApiKey) {
        return interaction.editReply({
          content: '❌ **Voice reading is not configured**\n\n' +
                  'This feature requires ElevenLabs TTS to be set up. Please contact the server administrator to:\n' +
                  '• Set `TTS_PROVIDER=elevenlabs`\n' +
                  '• Configure `ELEVENLABS_API_KEY`\n\n' +
                  '💡 This ensures high-quality voice synthesis for message reading.',
        });
      }

      // Check for existing session conflicts
      const existingSession = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (existingSession) {
        return interaction.editReply({
          content: `ℹ️ **Voice reading is already active**\n\n` +
                  `I'm already reading messages in ${voiceChannel}.\n` +
                  `Use \`/read action:stop\` to stop the current session first, or use the pause/resume controls.`,
        });
      }

      // Check if there are other users in the voice channel
      const humanMembers = voiceChannel.members.filter(member => !member.user.bot);
      if (humanMembers.size === 1) {
        // Only the user who ran the command is in the channel
        const confirmEmbed = {
          color: 0xffa500, // Orange
          title: '⚠️ Empty Voice Channel',
          description: `You're the only person in ${voiceChannel}. I'll start reading anyway, but the session will automatically end if the channel stays empty for 30 seconds.`,
          footer: { text: 'Tip: Invite others to join for the best experience!' }
        };
        
        // Still proceed, but with a warning
        await interaction.editReply({ embeds: [confirmEmbed] });
        
        // Add a small delay to let user see the warning
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      try {
        // Validate voice selection
        if (voiceId && !Object.values(ELEVENLABS_VOICES).some(v => v.id === voiceId)) {
          return interaction.editReply({
            content: '❌ **Invalid voice selected**\n\nThe selected voice is not available. Please choose a valid voice from the options.'
          });
        }

        const options = {
          speed,
          maxLength,
          filterLinks: true,
          processEmojis: true,
          emojiMode,
          bypassRole: config.bypassRoleId,
          modelId: modelId || undefined,
          voiceId: voiceId || undefined
        };
        
        // Attempt to start the session with a hard timeout. Promise.race can't
        // cancel the loser, so guard the background startSession against an
        // unhandled rejection if the timeout wins the race.
        const startPromise = voiceReadManager.startSession(interaction.guild, voiceChannel, interaction.channel, options);
        startPromise.catch(() => { /* handled via the race + timeout cleanup below */ });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 15000)
        );

        await Promise.race([startPromise, timeoutPromise]);
        
        // Success! Provide detailed feedback
        // Validate model selection
        if (modelId && !ELEVENLABS_MODELS[modelId]) {
          return interaction.editReply({
            content: '❌ **Invalid model selected**\n\nThe selected model is not available. Please choose a valid model from the options.'
          });
        }

        const selectedModel = modelId ? ELEVENLABS_MODELS[modelId] : ELEVENLABS_MODELS.eleven_flash_v2_5;
        // Get selected voice or default to Rachel
        const selectedVoice = (
          voiceId ? Object.values(ELEVENLABS_VOICES).find(v => v.id === voiceId) : 
          config.elevenLabsVoiceId ? Object.values(ELEVENLABS_VOICES).find(v => v.id === config.elevenLabsVoiceId) : 
          ELEVENLABS_VOICES.rachel
        );
        
        const successEmbed = {
          color: 0x00ff00, // Green
          title: '🎙️ Voice Reading Started!',
          description: `Now reading messages from ${interaction.channel} in ${voiceChannel}`,
          fields: [
            {
              name: '⚙️ Settings',
              value: `• **Model:** ${selectedModel.name}${!selectedModel.isRealTime ? ' ⚠️' : ''}\n• **Voice:** ${selectedVoice?.name || 'Rachel'}`,
              inline: false
            }
          ],
          footer: { text: selectedModel.isRealTime ? 'Use /read action:pause, resume, or stop to control playback' : '⚠️ Non-realtime model may have higher latency' }
        };

        return interaction.editReply({ embeds: [successEmbed] });
        
      } catch (error) {
        // If the timeout won the race, startSession may still finish in the
        // background and leave an orphaned session — stop any session it registered.
        voiceReadManager.stopSession(interaction.guild.id, voiceChannel.id);

        logger.error('VOICE_READ_COMMAND', 'Failed to start voice reading session', error, interaction.guild);

        let errorMessage = '❌ **Failed to start voice reading**\n\n';
        
        if (error instanceof Error) {
          if (error.message.includes('timeout') || error.message.includes('Connection timeout')) {
            errorMessage += '⏱️ **Connection Timeout**\nCouldn\'t connect to the voice channel within 15 seconds. This might be due to:\n' +
                          '• Discord server issues\n• Network connectivity problems\n• Voice channel being full or restricted\n\n' +
                          '💡 **Try again in a few moments**';
          } else if (error.message.includes('permission') || error.message.includes('403')) {
            errorMessage += '🔒 **Permission Error**\nI don\'t have sufficient permissions. Please ensure I have:\n' +
                          '• Connect permission in the voice channel\n• Speak permission in the voice channel\n• Use Voice Activity permission\n\n' +
                          '💡 **Contact a server admin for help**';
          } else if (error.message.includes('channel')) {
            errorMessage += '📢 **Voice Channel Error**\nThere was an issue with the voice channel:\n' +
                          '• Channel might be full\n• Channel might have restrictions\n• Discord API issues\n\n' +
                          '💡 **Try a different voice channel**';
          } else {
            errorMessage += '🔧 **Technical Error**\nSomething went wrong while starting voice reading.\n\n' +
                          '💡 **Please try again, or contact a server admin if it keeps happening**';
          }
        } else {
          errorMessage += '🔧 **Unknown Error**\nSomething unexpected happened.\n\n💡 **Please try again or contact a server admin**';
        }

        return interaction.editReply({ content: errorMessage });
      }
    }

    if (action === 'stop') {
      const session = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (!session) {
        return interaction.reply({ 
          content: '❌ **No active voice reading session**\n\n' +
                  `There's no active voice reading session in ${voiceChannel}.\n` +
                  `Use \`/read action:start\` to begin reading messages.`, 
          ephemeral: true 
        });
      }

      const success = voiceReadManager.stopSession(interaction.guild.id, voiceChannel.id);
      if (success) {
        const stopEmbed = {
          color: 0xff4444, // Red
          title: '⏹️ Voice Reading Stopped',
          description: `Successfully stopped reading messages and left ${voiceChannel}.`,
          footer: { text: 'Use /read action:start to begin reading again' }
        };
        return interaction.reply({ embeds: [stopEmbed], ephemeral: true });
      } else {
        return interaction.reply({ 
          content: '⚠️ **Session cleanup issue**\n\nThe session was stopped but there might have been cleanup issues. Try the command again if needed.', 
          ephemeral: true 
        });
      }
    }

    if (action === 'pause') {
      const session = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (!session) {
        return interaction.reply({ 
          content: '❌ **No active voice reading session**\n\n' +
                  `There's no active voice reading session in ${voiceChannel}.\n` +
                  `Use \`/read action:start\` to begin reading messages.`, 
          ephemeral: true 
        });
      }

      const success = voiceReadManager.pauseSession(interaction.guild.id, voiceChannel.id);
      if (success) {
        const pauseEmbed = {
          color: 0xffaa00, // Orange
          title: '⏸️ Voice Reading Paused',
          description: `Voice reading is now paused in ${voiceChannel}.`,
          fields: [
            {
              name: '💡 What happens now?',
              value: '• Current message will finish playing\n• New messages won\'t be read\n• I\'ll stay connected to the voice channel',
              inline: false
            }
          ],
          footer: { text: 'Use /read action:resume to continue reading' }
        };
        return interaction.reply({ embeds: [pauseEmbed], ephemeral: true });
      } else {
        return interaction.reply({ 
          content: '⚠️ **Failed to pause**\n\nCouldn\'t pause the voice reading session. The session might have ended or encountered an error.', 
          ephemeral: true 
        });
      }
    }

    if (action === 'resume') {
      const session = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (!session) {
        return interaction.reply({ 
          content: '❌ **No active voice reading session**\n\n' +
                  `There's no active voice reading session in ${voiceChannel}.\n` +
                  `Use \`/read action:start\` to begin reading messages.`, 
          ephemeral: true 
        });
      }

      const success = voiceReadManager.resumeSession(interaction.guild.id, voiceChannel.id);
      if (success) {
        const resumeEmbed = {
          color: 0x00ff00, // Green
          title: '▶️ Voice Reading Resumed',
          description: `Voice reading has resumed in ${voiceChannel}.`,
          fields: [
            {
              name: '💡 What happens now?',
              value: '• Queued messages will start playing\n• New messages will be read automatically',
              inline: false
            }
          ],
          footer: { text: 'Use /read action:pause or stop to control playback' }
        };
        return interaction.reply({ embeds: [resumeEmbed], ephemeral: true });
      } else {
        return interaction.reply({ 
          content: '⚠️ **Failed to resume**\n\nCouldn\'t resume the voice reading session. The session might have ended or encountered an error.', 
          ephemeral: true 
        });
      }
    }

    if (action === 'skip') {
      const session = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (!session) {
        return interaction.reply({ 
          content: '❌ **No active voice reading session**\n\n' +
                  `There's no active voice reading session in ${voiceChannel}.\n` +
                  `Use \`/read action:start\` to begin reading messages.`, 
          ephemeral: true 
        });
      }

      const success = voiceReadManager.skipCurrent(interaction.guild.id, voiceChannel.id);
      if (success) {
        return interaction.reply({ 
          content: '⏭️ **Skipped current message**', 
          ephemeral: true 
        });
      } else {
        return interaction.reply({ 
          content: '⚠️ **Nothing to skip**\n\nNo message is currently playing.', 
          ephemeral: true 
        });
      }
    }

    if (action === 'clear') {
      const session = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (!session) {
        return interaction.reply({ 
          content: '❌ **No active voice reading session**\n\n' +
                  `There's no active voice reading session in ${voiceChannel}.\n` +
                  `Use \`/read action:start\` to begin reading messages.`, 
          ephemeral: true 
        });
      }

      const clearedCount = voiceReadManager.clearQueue(interaction.guild.id, voiceChannel.id);
      return interaction.reply({ 
        content: `🗑️ **Queue cleared**\n\nRemoved ${clearedCount} message(s) from the queue.`, 
        ephemeral: true 
      });
    }

    if (action === 'status') {
      const session = voiceReadManager.getSession(interaction.guild.id, voiceChannel.id);
      if (!session) {
        return interaction.reply({ 
          content: '❌ **No active voice reading session**\n\n' +
                  `There's no active voice reading session in ${voiceChannel}.\n` +
                  `Use \`/read action:start\` to begin reading messages.`, 
          ephemeral: true 
        });
      }

      const status = voiceReadManager.getSessionStatus(interaction.guild.id, voiceChannel.id);
      if (!status) {
        return interaction.reply({ 
          content: '⚠️ **Unable to get status**', 
          ephemeral: true 
        });
      }

      const statusEmbed = {
        color: 0x5865F2, // Blurple
        title: '📊 Voice Reading Status',
        description: `Active in ${voiceChannel}`,
        fields: [
          {
            name: '📝 Queue',
            value: `${status.queueSize} message(s) waiting`,
            inline: true
          },
          {
            name: '▶️ State',
            value: status.isPlaying ? '🎵 Playing' : status.isPaused ? '⏸️ Paused' : '⏹️ Idle',
            inline: true
          },
          {
            name: '🎙️ Voice Activity',
            value: status.voiceActivityPaused ? '🔴 Paused (someone speaking)' : '🟢 Active',
            inline: true
          }
        ],
        footer: { text: 'Use /read to control playback' }
      };

      return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }

    return interaction.reply({ 
      content: '❌ **Unknown action**\n\nPlease use one of the following actions:\n' +
              '• `start` - Begin reading messages\n' +
              '• `stop` - Stop reading and leave voice channel\n' +
              '• `pause` - Pause reading (stay connected)\n' +
              '• `resume` - Resume reading\n' +
              '• `skip` - Skip current message\n' +
              '• `clear` - Clear message queue\n' +
              '• `status` - Show queue status', 
      ephemeral: true 
    });

  } catch (error) {
    logger.error('VOICE_READ_COMMAND', 'Error executing voice read command', error, interaction.guild);
    
    const errorMessage = '❌ **Command Error**\n\n' +
                        'An unexpected error occurred while processing your request. ' +
                        'Please try again or contact a server admin if the issue persists.';

    try {
      if (interaction.deferred && !interaction.replied) {
        return interaction.editReply({ content: errorMessage });
      } else if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ content: errorMessage, ephemeral: true });
      }
      // If interaction is already handled, just log the error
      console.error('Voice read command error (interaction already handled):', error);
    } catch (responseError) {
      console.error('Failed to send error response for voice read command:', responseError);
    }
  }
}
