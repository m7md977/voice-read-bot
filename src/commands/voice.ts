import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { findVoiceById, isKnownVoiceId, ELEVENLABS_VOICE_CHOICES } from '../config';
import { userVoiceStore } from '../services/voice/UserVoiceStore';
import { logger } from '../services/logging';

type VoiceAction = 'set' | 'clear' | 'show';

export const data = {
  name: 'voice',
  description: 'Assign a TTS voice to yourself (admins can also assign to others)',
  options: [
    {
      name: 'action',
      description: 'Set, clear, or show a user voice',
      type: 3, // STRING
      required: true,
      choices: [
        { name: 'Set voice', value: 'set' },
        { name: 'Clear voice (use session default)', value: 'clear' },
        { name: 'Show current voice', value: 'show' }
      ]
    },
    {
      name: 'voice',
      description: 'Voice to assign (required when setting)',
      type: 3, // STRING
      required: false,
      choices: ELEVENLABS_VOICE_CHOICES
    },
    {
      name: 'user',
      description: 'User to assign a voice to - admin only, defaults to you',
      type: 6, // USER
      required: false
    }
  ]
};

function assertNever(value: never): never {
  throw new Error(`Unhandled voice action: ${String(value)}`);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const action = interaction.options.getString('action', true) as VoiceAction;
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const voiceId = interaction.options.getString('voice');
  const isSelf = targetUser.id === interaction.user.id;
  const targetLabel = isSelf ? 'your' : `${targetUser}'s`;

  // Everyone can manage their own voice; managing someone else's requires admin
  const isAdmin = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
  if (!isSelf && action !== 'show' && !isAdmin) {
    await interaction.reply({
      content: '🔒 You can only change **your own** voice. Ask a server admin to set voices for other users.',
      ephemeral: true
    });
    return;
  }

  // For other users, make sure they are actually a member of this server
  if (!isSelf && action !== 'show') {
    try {
      await interaction.guild.members.fetch(targetUser.id);
    } catch {
      await interaction.reply({
        content: '❌ That user is not a member of this server.',
        ephemeral: true
      });
      return;
    }
  }

  try {
    switch (action) {
      case 'set': {
        if (!voiceId) {
          await interaction.reply({
            content: '❌ Choose a **voice** when using `action:set`.',
            ephemeral: true
          });
          return;
        }

        if (!isKnownVoiceId(voiceId)) {
          await interaction.reply({
            content: '❌ That voice is not available. Pick one from the list.',
            ephemeral: true
          });
          return;
        }

        userVoiceStore.set(interaction.guild.id, targetUser.id, voiceId);
        const selectedVoice = findVoiceById(voiceId);

        await interaction.reply({
          content: `🗣️ Set ${targetLabel} reading voice to **${selectedVoice?.name || 'selected voice'}**.\nMessages from ${isSelf ? 'you' : targetUser} will use this voice. Use \`/voice action:clear\` to go back to the session default.`,
          ephemeral: true
        });
        return;
      }
      case 'clear': {
        const cleared = userVoiceStore.clear(interaction.guild.id, targetUser.id);
        if (!cleared) {
          await interaction.reply({
            content: `ℹ️ ${isSelf ? 'You don\'t' : `${targetUser} doesn't`} have a personal voice assigned.`,
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: `♻️ Cleared ${targetLabel} personal voice. Messages will use the session default from \`/read\`.`,
          ephemeral: true
        });
        return;
      }
      case 'show': {
        const assignedVoiceId = userVoiceStore.get(interaction.guild.id, targetUser.id);
        if (!assignedVoiceId) {
          await interaction.reply({
            content: `ℹ️ ${isSelf ? 'You don\'t' : `${targetUser} doesn't`} have a personal voice. The session voice from \`/read\` will be used.`,
            ephemeral: true
          });
          return;
        }

        const selectedVoice = findVoiceById(assignedVoiceId);
        await interaction.reply({
          content: `🗣️ ${isSelf ? 'Your' : `${targetUser}'s`} reading voice is **${selectedVoice?.name || assignedVoiceId}**.`,
          ephemeral: true
        });
        return;
      }
      default:
        assertNever(action);
    }
  } catch (error) {
    logger.error('VOICE_COMMAND', 'Error executing /voice command', error, interaction.guild);
    if (interaction.replied || interaction.deferred) {
      return;
    }
    await interaction.reply({
      content: '❌ Could not update the voice assignment. Please try again.',
      ephemeral: true
    });
  }
}
