import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, logger } from './config/index.js';
import { chatRouter, healthRouter, adminRouter } from './routes/index.js';
import { ensureCollection } from './services/index.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS - allow same-origin and configured origins
app.use(cors({
  origin: env.NODE_ENV === 'development' 
    ? true 
    : [env.PUBLIC_DOCS_BASE_URL],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/chat', limiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    }, 'Request completed');
  });
  next();
});

// Routes
app.use('/rag/api', healthRouter);
app.use('/rag/api', chatRouter);
app.use('/rag/api/admin', adminRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
async function start() {
  try {
    // Ensure Qdrant collection exists
    await ensureCollection();
    
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 RAG Backend started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
