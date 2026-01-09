import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Qdrant
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default('roo-docs'),
  VECTOR_DIM: z.string().default('3072').transform(Number),

  // Document paths
  DOCS_ROOT: z.string().default('..'),
  DOCS_CONTENT_PATH: z.string().default('docs'),
  PUBLIC_DOCS_BASE_URL: z.string().url().default('https://docs.roocode.com'),

  // LLM Provider
  LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default('gpt-4o-mini'),

  // Embeddings
  EMBED_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  EMBED_API_KEY: z.string().min(1),
  EMBED_MODEL: z.string().default('text-embedding-3-small'),

  // RAG Configuration
  MAX_CONTEXT_TOKENS: z.string().default('4000').transform(Number),
  RETRIEVAL_TOP_K: z.string().default('6').transform(Number),

  // Admin
  ADMIN_REINDEX_TOKEN: z.string().min(16),

  // Optional
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

const env = validateEnv();

// Validate VECTOR_DIM is exactly 3072
if (env.VECTOR_DIM !== 3072) {
  console.error(`VECTOR_DIM must be exactly 3072, got ${env.VECTOR_DIM}`);
  process.exit(1);
}

export { env };
