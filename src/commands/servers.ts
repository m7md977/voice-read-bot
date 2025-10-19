import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../services/logging';
import config from '../config';

export const data = {
  name: 'servers',
  description: '[DEV ONLY] List all servers the bot is currently in',
  options: []
};

export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if command is being used in the dev server
  if (!config.devServerId) {
    return interaction.reply({
      content: '❌ **Command Not Available**\n\nThis command requires a dev server to be configured.',
      ephemeral: true
    });
  }

  if (interaction.guildId !== config.devServerId) {
    return interaction.reply({
      content: '❌ **Unauthorized**\n\nThis command can only be used in the development server.',
      ephemeral: true
    });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const client = interaction.client;
    const guilds = client.guilds.cache;

    logger.info('SERVERS_COMMAND', `Listing ${guilds.size} servers for user ${interaction.user.tag}`);

    if (guilds.size === 0) {
      return interaction.editReply({
        content: 'ℹ️ **No Servers**\n\nThe bot is not currently in any servers.'
      });
    }

    // Sort guilds by member count (descending)
    const sortedGuilds = Array.from(guilds.values()).sort((a, b) => b.memberCount - a.memberCount);

    // Create embeds (Discord has a limit of 25 fields per embed)
    const embeds: EmbedBuilder[] = [];
    let currentEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🌐 Bot Server List')
      .setDescription(`Total servers: **${guilds.size}**\nTotal members: **${sortedGuilds.reduce((acc, g) => acc + g.memberCount, 0).toLocaleString()}**`)
      .setTimestamp();

    let fieldCount = 0;
    const maxFieldsPerEmbed = 25;

    for (const guild of sortedGuilds) {
      if (fieldCount >= maxFieldsPerEmbed) {
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🌐 Bot Server List (continued)')
          .setTimestamp();
        fieldCount = 0;
      }

      // Get owner information
      let ownerInfo = 'Unknown';
      try {
        const owner = await guild.fetchOwner();
        ownerInfo = `${owner.user.tag}`;
      } catch (error) {
        logger.debug('SERVERS_COMMAND', `Could not fetch owner for guild ${guild.name}`, error);
      }

      // Get bot's join date
      const botMember = guild.members.me;
      const joinedAt = botMember?.joinedAt?.toLocaleDateString() || 'Unknown';

      currentEmbed.addFields({
        name: `${guild.name}`,
        value: `**ID:** \`${guild.id}\`\n` +
               `**Members:** ${guild.memberCount.toLocaleString()}\n` +
               `**Owner:** ${ownerInfo}\n` +
               `**Joined:** ${joinedAt}`,
        inline: false
      });

      fieldCount++;
    }

    // Add the last embed if it has any fields
    if (fieldCount > 0) {
      embeds.push(currentEmbed);
    }

    // Send embeds (Discord allows up to 10 embeds per message)
    if (embeds.length === 1) {
      return interaction.editReply({ embeds: [embeds[0]] });
    } else if (embeds.length <= 10) {
      return interaction.editReply({ embeds });
    } else {
      // If more than 10 embeds, send in batches
      await interaction.editReply({ embeds: embeds.slice(0, 10) });
      
      for (let i = 10; i < embeds.length; i += 10) {
        const batch = embeds.slice(i, Math.min(i + 10, embeds.length));
        await interaction.followUp({ embeds: batch, ephemeral: true });
      }
    }

  } catch (error) {
    logger.error('SERVERS_COMMAND', 'Error executing servers command', error, interaction.guild ?? undefined);
    
    const errorMessage = '❌ **Command Error**\n\n' +
                        'An unexpected error occurred while fetching server information.\n\n' +
                        `**Error:** \`${error instanceof Error ? error.message : 'Unknown error'}\``;
    
    if (interaction.deferred && !interaction.replied) {
      return interaction.editReply({ content: errorMessage });
    } else if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

