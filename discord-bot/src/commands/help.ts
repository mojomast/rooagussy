import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to use the Roo Code docs bot'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('📚 Roo Code Docs Bot Help')
      .setDescription(
        'I can help you find information about Roo Code, the AI-powered autonomous coding agent for VS Code!'
      )
      .addFields(
        {
          name: '`/ask <question>`',
          value: 'Ask any question about Roo Code. I\'ll search the documentation and give you an answer with sources.',
          inline: false,
        },
        {
          name: '`/status`',
          value: 'Check if the bot and its services are running properly.',
          inline: false,
        },
        {
          name: '`/help`',
          value: 'Show this help message.',
          inline: false,
        }
      )
      .addFields({
        name: '💡 Tips',
        value: [
          '• Be specific in your questions for better answers',
          '• Use the `private` option if you only want to see the response',
          '• Click on source links to read the full documentation',
        ].join('\n'),
        inline: false,
      })
      .setFooter({ text: 'Roo Code Docs Bot • Powered by RAG' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
