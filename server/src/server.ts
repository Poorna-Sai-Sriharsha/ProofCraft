import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { startReminderJob, stopReminderJob } from './jobs/reminderJob.js';

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

      // Force exit timeout if open sockets fail to drain in 10s
      const forceExitTimer = setTimeout(() => {
        logger.error('⚠️ Forcefully terminating server: socket draining timed out after 10s.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      // Stop cron jobs
      stopReminderJob();

      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await disconnectDatabase();
        } catch (dbErr: any) {
          logger.error(`Database disconnect error: ${dbErr.message}`);
        }
        clearTimeout(forceExitTimer);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error(`Unhandled Rejection at: ${reason?.stack || reason}`);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error(`Uncaught Exception: ${error.stack || error.message}`);
      gracefulShutdown('uncaughtException');
    });
  } catch (error: any) {
    logger.error(`❌ Fatal server error on startup: ${error.message}`);
    process.exit(1);
  }
};

startServer();
