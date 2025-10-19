import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import config from '../config';
import { logger } from '../services/logging';

export class DiscordLogger {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Send a log message to the logs channel
   */
  async sendLog(title: string, description: string, color: number = 0x5865F2, fields?: { name: string; value: string; inline?: boolean }[]) {
    if (!config.logsChannelId) {
      logger.debug('DISCORD_LOGGER', 'LOGS_CHANNEL not configured, skipping Discord log');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(config.logsChannelId);
      if (!channel || !(channel instanceof TextChannel)) {
        logger.warn('DISCORD_LOGGER', `Logs channel ${config.logsChannelId} not found or not a text channel`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

      if (fields && fields.length > 0) {
        embed.addFields(fields);
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('DISCORD_LOGGER', 'Failed to send log to Discord logs channel', error);
    }
  }

  /**
   * Send a join/leave notification to the join-left channel
   */
  async sendJoinLeaveLog(type: 'join' | 'leave', guildName: string, guildId: string, memberCount: number, ownerTag?: string, ownerId?: string) {
    if (!config.joinLeftChannelId) {
      logger.debug('DISCORD_LOGGER', 'JOIN_LEFT_CHANNEL not configured, skipping Discord log');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(config.joinLeftChannelId);
      if (!channel || !(channel instanceof TextChannel)) {
        logger.warn('DISCORD_LOGGER', `Join-left channel ${config.joinLeftChannelId} not found or not a text channel`);
        return;
      }

      const isJoin = type === 'join';
      const embed = new EmbedBuilder()
        .setTitle(isJoin ? '🟢 Bot Joined Server' : '🔴 Bot Left Server')
        .setColor(isJoin ? 0x00ff00 : 0xff0000)
        .setTimestamp()
        .addFields(
          { name: '📝 Server Name', value: guildName, inline: true },
          { name: '🆔 Server ID', value: `\`${guildId}\``, inline: true },
          { name: '👥 Member Count', value: memberCount.toLocaleString(), inline: true }
        );

      if (isJoin && ownerTag && ownerId) {
        embed.addFields(
          { name: '👑 Server Owner', value: `${ownerTag} (\`${ownerId}\`)`, inline: false }
        );
      }

      // Add total server count
      const totalServers = this.client.guilds.cache.size;
      embed.addFields(
        { name: '🌐 Total Servers', value: totalServers.toString(), inline: false }
      );

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('DISCORD_LOGGER', 'Failed to send join/leave log to Discord', error);
    }
  }

  /**
   * Send a startup log with all current servers
   */
  async sendStartupLog() {
    if (!config.logsChannelId) {
      logger.debug('DISCORD_LOGGER', 'LOGS_CHANNEL not configured, skipping startup log');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(config.logsChannelId);
      if (!channel || !(channel instanceof TextChannel)) {
        logger.warn('DISCORD_LOGGER', `Logs channel ${config.logsChannelId} not found or not a text channel`);
        return;
      }

      const guilds = this.client.guilds.cache;
      const totalMembers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);

      const embed = new EmbedBuilder()
        .setTitle('✅ Bot Started Successfully')
        .setDescription(`${this.client.user?.tag} is now online and ready!`)
        .setColor(0x00ff00)
        .setTimestamp()
        .addFields(
          { name: '🌐 Total Servers', value: guilds.size.toString(), inline: true },
          { name: '👥 Total Members', value: totalMembers.toLocaleString(), inline: true },
          { name: '🎤 Voice Sessions', value: '0', inline: true }
        );

      // List servers if there aren't too many
      if (guilds.size > 0 && guilds.size <= 10) {
        const serverList = guilds.map(g => `• ${g.name} (${g.memberCount.toLocaleString()} members)`).join('\n');
        embed.addFields({ name: '📋 Active Servers', value: serverList || 'None', inline: false });
      } else if (guilds.size > 10) {
        const topServers = Array.from(guilds.values())
          .sort((a, b) => b.memberCount - a.memberCount)
          .slice(0, 5)
          .map(g => `• ${g.name} (${g.memberCount.toLocaleString()} members)`)
          .join('\n');
        embed.addFields({ name: '📋 Top 5 Servers', value: topServers, inline: false });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('DISCORD_LOGGER', 'Failed to send startup log to Discord', error);
    }
  }

  /**
   * Send an error log to the logs channel
   */
  async sendErrorLog(context: string, errorMessage: string, guildName?: string) {
    if (!config.logsChannelId) {
      return;
    }

    try {
      const channel = await this.client.channels.fetch(config.logsChannelId);
      if (!channel || !(channel instanceof TextChannel)) {
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Error Occurred')
        .setColor(0xff0000)
        .setTimestamp()
        .addFields(
          { name: '📍 Context', value: context, inline: false },
          { name: '⚠️ Error', value: `\`\`\`${errorMessage.substring(0, 1000)}\`\`\``, inline: false }
        );

      if (guildName) {
        embed.addFields({ name: '🏠 Server', value: guildName, inline: true });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('DISCORD_LOGGER', 'Failed to send error log to Discord', error);
    }
  }
}

// Singleton instance
let discordLoggerInstance: DiscordLogger | null = null;

export function initializeDiscordLogger(client: Client) {
  discordLoggerInstance = new DiscordLogger(client);
  return discordLoggerInstance;
}

export function getDiscordLogger(): DiscordLogger | null {
  return discordLoggerInstance;
}

