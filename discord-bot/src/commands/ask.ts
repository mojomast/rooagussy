import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../config/index.js';
import { ragApi, type Source } from '../services/index.js';

// Store conversation IDs per channel for context
const channelConversations = new Map<string, string>();

export const askCommand = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question about Roo Code')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question about Roo Code')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Only you will see the response')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const question = interaction.options.getString('question', true);
    const isPrivate = interaction.options.getBoolean('private') ?? false;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;

    logger.info(
      { userId, channelId, questionLength: question.length },
      'Processing /ask command'
    );

    // Defer reply to allow time for API call
    await interaction.deferReply({ ephemeral: isPrivate });

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

      await interaction.editReply({
        embeds: [embed],
        components: components.length > 0 ? components : undefined,
      });

      logger.info(
        { userId, channelId, sourceCount: response.sources.length },
        '/ask command completed'
      );
    } catch (error) {
      logger.error({ error, userId, channelId }, '/ask command failed');

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Error')
        .setDescription(
          'Sorry, I encountered an error while processing your question. Please try again later.'
        )
        .setFooter({ text: 'Roo Code Docs Bot' })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

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
