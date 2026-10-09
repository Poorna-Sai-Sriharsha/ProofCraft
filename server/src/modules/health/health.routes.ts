import { Router, Request, Response } from 'express';
import { isDatabaseHealthy } from '../../config/database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const dbHealthy = isDatabaseHealthy();

  res.status(dbHealthy ? 200 : 503).json({
    success: dbHealthy,
    data: {
      status: dbHealthy ? 'healthy' : 'degraded',
      service: 'proofcart-api',
      version: '1.0.0',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
});

export const healthRoutes = router;
