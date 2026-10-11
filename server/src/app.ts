import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { purchaseRoutes } from './modules/purchases/purchase.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { serviceRoutes } from './modules/services/service.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { deadlineRoutes } from './modules/deadlines/deadlines.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Trust first proxy for Render, Cloudflare, and reverse proxy deployments (INF-01)
  app.set('trust proxy', 1);

  // Basic security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS configuration
  app.use(cors(corsOptions));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Apply general API rate limiter
  app.use('/api', apiLimiter);

  // Core feature routes
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/purchases', purchaseRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/services', serviceRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/deadlines', deadlineRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // Future feature routes will be mounted here:
  // app.use('/api/v1/auth', authRoutes);
  // app.use('/api/v1/purchases', purchaseRoutes);
  // app.use('/api/v1/documents', documentRoutes);
  // app.use('/api/v1/services', serviceRoutes);
  // app.use('/api/v1/dashboard', dashboardRoutes);
  // app.use('/api/v1/deadlines', deadlineRoutes);
  // app.use('/api/v1/notifications', notificationRoutes);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
