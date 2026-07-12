import { REST, Routes } from 'discord.js';
import config from './config';
import * as readCommand from './commands/read';
import * as serversCommand from './commands/servers';

// Global commands (available in all servers)
const globalCommands = [
  readCommand.data
];

// Dev-only commands (only available in dev server)
const devCommands = [
  serversCommand.data
];

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(config.botToken);

// Deploy commands
(async () => {
  try {
    // Deploy global commands
    if (config.globalCommands) {
      console.log(`Started refreshing ${globalCommands.length} global application (/) commands.`);
      const data: any = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: globalCommands },
      );
      console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
    } else {
      console.log('ℹ️ Global commands disabled. Skipping global deployment.');
    }

    // Deploy dev-only commands to dev server
    if (config.devServerId) {
      console.log(`Started refreshing ${devCommands.length} dev server application (/) commands.`);
      const devData: any = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.devServerId),
        { body: devCommands },
      );
      console.log(`✅ Successfully reloaded ${devData.length} dev server application (/) commands.`);
    } else {
      console.log('⚠️ Warning: DEV_SERVER_ID not set. Dev-only commands (like /servers) will not be deployed.');
    }

    console.log('\n🎉 Command deployment completed!');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
})();
