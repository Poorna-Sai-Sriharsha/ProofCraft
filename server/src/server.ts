import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { startReminderJob } from './jobs/reminderJob.js';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Initialize Express App
    const app = createApp();

    // 3. Start background scheduled reminder job
    startReminderJob();

    // 4. Listen on PORT
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 ProofCart Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📡 Health endpoint: http://localhost:${env.PORT}/api/v1/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: any) {
    logger.error(`❌ Fatal server error on startup: ${error.message}`);
    process.exit(1);
  }
};

startServer();
