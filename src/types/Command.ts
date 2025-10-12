import { ChatInputCommandInteraction } from 'discord.js';

export interface Command {
  data: {
    name: string;
    description: string;
    options?: any[];
  };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
