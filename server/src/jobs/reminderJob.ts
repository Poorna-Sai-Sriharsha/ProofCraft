import cron from 'node-cron';
import { NotificationService } from '../modules/notifications/notification.service.js';
import { logger } from '../utils/logger.js';

export const startReminderJob = () => {
  // Run once every day at 08:00 AM
  const job = cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ Running scheduled deadline reminder scan...');
    try {
      const generated = await NotificationService.generateUpcomingReminders();
      logger.info(`✅ Scheduled reminder job completed. Generated ${generated} reminder(s).`);
    } catch (error: any) {
      logger.error(`❌ Scheduled reminder job failed: ${error.message}`);
    }
  });

  return job;
};

export const runReminderJobNow = async (): Promise<number> => {
  return NotificationService.generateUpcomingReminders();
};
