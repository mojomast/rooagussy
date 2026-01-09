import { Collection, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { askCommand } from './ask.js';
import { statusCommand } from './status.js';
import { helpCommand } from './help.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = new Collection<string, Command>();

// Register all commands
commands.set(askCommand.data.name, askCommand);
commands.set(statusCommand.data.name, statusCommand);
commands.set(helpCommand.data.name, helpCommand);

export { askCommand, statusCommand, helpCommand };
