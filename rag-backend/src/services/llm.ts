import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { env, logger } from '../config/index.js';

let embeddings: OpenAIEmbeddings | null = null;
let chatModel: ChatOpenAI | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: env.EMBED_API_KEY,
      modelName: env.EMBED_MODEL,
      configuration: {
        baseURL: env.EMBED_BASE_URL,
      },
    });
    logger.info({ model: env.EMBED_MODEL, baseUrl: env.EMBED_BASE_URL }, 'Embeddings client initialized');
  }
  return embeddings;
}

export function getChatModel(): ChatOpenAI {
  if (!chatModel) {
    chatModel = new ChatOpenAI({
      openAIApiKey: env.LLM_API_KEY,
      modelName: env.LLM_MODEL,
      temperature: 0.1,
      maxTokens: 2048,
      configuration: {
        baseURL: env.LLM_BASE_URL,
      },
    });
    logger.info({ model: env.LLM_MODEL, baseUrl: env.LLM_BASE_URL }, 'Chat model initialized');
  }
  return chatModel;
}

export async function embedText(text: string): Promise<number[]> {
  const model = getEmbeddings();
  return model.embedQuery(text);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = getEmbeddings();
  return model.embedDocuments(texts);
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateAnswer(
  messages: ChatMessage[],
  context: string
): Promise<string> {
  const model = getChatModel();

  const systemPrompt = `You are a helpful assistant that answers questions about Roo Code, an AI-powered autonomous coding agent for VS Code.

IMPORTANT RULES:
1. ONLY answer based on the provided context. Do not use outside knowledge.
2. If the context doesn't contain enough information to answer, say so clearly and suggest where the user might find more information.
3. Always cite your sources by referencing the document titles and sections.
4. Be concise but thorough. Use bullet points and code examples when helpful.
5. If asked about something unrelated to Roo Code, politely redirect to Roo Code topics.

CONTEXT FROM DOCUMENTATION:
${context}`;

  const formattedMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const response = await model.invoke(formattedMessages);
  return response.content as string;
}
