import { REST, Routes } from 'discord.js';
import config from './config';
import * as readCommand from './commands/read';

const commands = [
  readCommand.data
];

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(config.botToken);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild/globally
    let data: any;
    
    if (config.globalCommands) {
      // Deploy globally (takes up to 1 hour to sync)
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
    } else {
      console.log('No guild ID provided and global commands disabled. Please set GLOBAL_COMMANDS=true or provide a GUILD_ID.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
})();
