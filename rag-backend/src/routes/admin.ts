import { Router, Request, Response, NextFunction } from 'express';
import { env, logger } from '../config/index.js';
import { ingestIncremental, ingestFull } from '../ingestion/index.js';

const router = Router();

// Admin authentication middleware
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== env.ADMIN_REINDEX_TOKEN) {
    logger.warn({ ip: req.ip }, 'Invalid admin token attempt');
    return res.status(403).json({ error: 'Invalid token' });
  }
  
  next();
}

router.use(adminAuth);

// Trigger incremental reindex
router.post('/reindex', async (_req: Request, res: Response) => {
  logger.info('Admin triggered incremental reindex');
  
  try {
    const result = await ingestIncremental();
    
    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error({ error }, 'Reindex failed');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Trigger full reindex
router.post('/reindex/full', async (_req: Request, res: Response) => {
  logger.info('Admin triggered full reindex');
  
  try {
    const result = await ingestFull();
    
    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error({ error }, 'Full reindex failed');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Invalidate cache (placeholder - implement if using Redis)
router.post('/invalidate-cache', (_req: Request, res: Response) => {
  logger.info('Admin triggered cache invalidation');
  
  // TODO: Implement Redis cache invalidation if needed
  
  return res.json({
    success: true,
    message: 'Cache invalidation not implemented (no Redis caching active)',
  });
});

export default router;
