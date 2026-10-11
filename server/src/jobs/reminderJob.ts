import cron from 'node-cron';
import { NotificationService } from '../modules/notifications/notification.service.js';
import { logger } from '../utils/logger.js';

let activeCronJob: cron.ScheduledTask | null = null;

export const startReminderJob = () => {
  if (activeCronJob) {
    return activeCronJob;
  }

  // Run once every day at 08:00 AM
  activeCronJob = cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ Running scheduled deadline reminder scan...');
    try {
      const generated = await NotificationService.generateUpcomingReminders();
      logger.info(`✅ Scheduled reminder job completed. Generated ${generated} reminder(s).`);
    } catch (error: any) {
      logger.error(`❌ Scheduled reminder job failed: ${error.message}`);
    }
  });

  return activeCronJob;
};

export const stopReminderJob = () => {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info('🛑 Reminder cron job stopped.');
  }
};

export const runReminderJobNow = async (): Promise<number> => {
  return NotificationService.generateUpcomingReminders();
};

