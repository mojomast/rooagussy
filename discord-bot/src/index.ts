import {
  Client,
  GatewayIntentBits,
  Events,
  Interaction,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { env, logger } from './config/index.js';
import { commands } from './commands/index.js';
import { ragApi, type Source } from './services/index.js';

// Rate limiting: track last command time per user
const userCooldowns = new Map<string, number>();

// Store conversation IDs per channel for context
const channelConversations = new Map<string, string>();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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

// Handle !roodocs message commands
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore messages from bots (including ourselves)
  if (message.author.bot) return;

  // Check if message starts with !roodocs
  if (!message.content.toLowerCase().startsWith('!roodocs')) return;

  // Rate limiting check
  const userId = message.author.id;
  const now = Date.now();
  const lastUsed = userCooldowns.get(userId) || 0;
  const cooldownMs = env.COOLDOWN_SECONDS * 1000;

  if (now - lastUsed < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - (now - lastUsed)) / 1000);
    await message.reply(`⏳ Please wait ${remainingSeconds} seconds before using another command.`);
    return;
  }

  userCooldowns.set(userId, now);

  // Extract question from message (everything after !roodocs)
  const question = message.content.slice('!roodocs'.length).trim();

  if (!question) {
    await message.reply('❓ Please provide a question after `!roodocs`. Example: `!roodocs How do I install Roo Code?`');
    return;
  }

  if (question.length > 2000) {
    await message.reply('❌ Your question is too long. Please keep it under 2000 characters.');
    return;
  }

  const channelId = message.channelId;

  logger.info(
    { userId, channelId, questionLength: question.length },
    'Processing !roodocs message command'
  );

  try {
    // Get existing conversation ID for this channel (optional continuity)
    const existingConversationId = channelConversations.get(channelId);

    const response = await ragApi.chat({
      message: question,
      conversationId: existingConversationId,
    });

    // Store the conversation ID for future messages in this channel
    channelConversations.set(channelId, response.conversationId);

    // Create the response embed
    const embed = createResponseEmbed(question, response.answer, response.sources);

    // Create source buttons if there are sources
    const components = createSourceButtons(response.sources);

    await message.reply({
      embeds: [embed],
      components: components.length > 0 ? components : undefined,
    });

    logger.info(
      { userId, channelId, sourceCount: response.sources.length },
      '!roodocs message command completed'
    );
  } catch (error) {
    logger.error({ error, userId, channelId }, '!roodocs message command failed');

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('❌ Error')
      .setDescription(
        'Sorry, I encountered an error while processing your question. Please try again later.'
      )
      .setFooter({ text: 'Roo Code Docs Bot' })
      .setTimestamp();

    await message.reply({ embeds: [errorEmbed] });
  }
});

// Helper functions for response formatting
function createResponseEmbed(question: string, answer: string, sources: Source[]): EmbedBuilder {
  // Discord embed description limit is 4096 characters
  const maxAnswerLength = 3800;
  let truncatedAnswer = answer;

  if (answer.length > maxAnswerLength) {
    truncatedAnswer = answer.slice(0, maxAnswerLength) + '\n\n*...response truncated*';
  }

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed) // Roo Code purple
    .setTitle('📚 Roo Code Docs')
    .setDescription(truncatedAnswer)
    .setFooter({ text: `Question: ${question.slice(0, 100)}${question.length > 100 ? '...' : ''}` })
    .setTimestamp();

  // Add sources as fields if there are any
  if (sources.length > 0) {
    const sourceList = sources
      .slice(0, 5) // Limit to 5 sources
      .map((s, i) => `${i + 1}. [${s.title}](${s.url})`)
      .join('\n');

    embed.addFields({
      name: '📖 Sources',
      value: sourceList,
      inline: false,
    });
  }

  return embed;
}

function createSourceButtons(sources: Source[]): ActionRowBuilder<ButtonBuilder>[] {
  if (sources.length === 0) return [];

  // Discord limits: 5 buttons per row, 5 rows max
  const buttons = sources.slice(0, 3).map((source, index) =>
    new ButtonBuilder()
      .setLabel(source.title.slice(0, 80)) // Button label limit is 80 chars
      .setURL(source.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji('📄')
  );

  if (buttons.length === 0) return [];

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)];
}

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
