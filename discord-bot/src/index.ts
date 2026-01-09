import {
  Client,
  GatewayIntentBits,
  Events,
  Interaction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { env, logger } from './config/index.js';
import { commands } from './commands/index.js';
import { ragApi } from './services/index.js';

// Rate limiting: track last command time per user
const userCooldowns = new Map<string, number>();

// Store conversation IDs per channel for context
const channelConversations = new Map<string, string>();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(
    { username: readyClient.user.tag, guilds: readyClient.guilds.cache.size },
    '🤖 Discord bot is online!'
  );

  // Verify RAG backend is reachable
  try {
    const health = await ragApi.health();
    logger.info({ health }, 'RAG backend connection verified');
  } catch (error) {
    logger.warn({ error }, 'RAG backend not reachable at startup - commands may fail');
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn({ commandName: interaction.commandName }, 'Unknown command received');
    return;
  }

  // Rate limiting check
  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsed = userCooldowns.get(userId) || 0;
  const cooldownMs = env.COOLDOWN_SECONDS * 1000;

  if (now - lastUsed < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - (now - lastUsed)) / 1000);
    await interaction.reply({
      content: `⏳ Please wait ${remainingSeconds} seconds before using another command.`,
      ephemeral: true,
    });
    return;
  }

  userCooldowns.set(userId, now);

  // Clean up old cooldown entries periodically
  if (userCooldowns.size > 10000) {
    const cutoff = now - cooldownMs * 2;
    for (const [uid, time] of userCooldowns.entries()) {
      if (time < cutoff) {
        userCooldowns.delete(uid);
      }
    }
  }

  try {
    logger.debug(
      { commandName: interaction.commandName, userId, guildId: interaction.guildId },
      'Executing command'
    );

    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    logger.error({ error, commandName: interaction.commandName, userId }, 'Command execution failed');

    const errorMessage = 'There was an error executing this command.';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Start the bot
logger.info('Starting Discord bot...');
client.login(env.DISCORD_BOT_TOKEN).catch((error) => {
  logger.error({ error }, 'Failed to login to Discord');
  process.exit(1);
});
