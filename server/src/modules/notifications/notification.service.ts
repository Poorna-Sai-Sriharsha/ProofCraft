import mongoose from 'mongoose';
import { Notification, NotificationType } from './notification.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { getDaysRemaining } from '../../utils/dateUtils.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

export class NotificationService {
  static async listNotifications(userId: string, limit = 50, page = 1) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeSkip = (Math.max(1, page) - 1) * safeLimit;

    return Notification.find({ userId: userObjectId })
      .populate('purchaseId', 'productName brand category')
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(safeLimit);
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Notification.countDocuments({
      userId: userObjectId,
      readAt: null,
    });
  }

  static async markAsRead(userId: string, notificationId: string) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw ApiError.badRequest('Invalid notification identifier', 'INVALID_NOTIFICATION_ID');
    }

    const notification = await Notification.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  static async markAllAsRead(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    await Notification.updateMany(
      { userId: userObjectId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return { message: 'All notifications marked as read.' };
  }

  static async deleteNotification(userId: string, notificationId: string) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw ApiError.badRequest('Invalid notification identifier', 'INVALID_NOTIFICATION_ID');
    }

    const notification = await Notification.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    await Notification.deleteOne({ _id: notification._id });
    return { message: 'Notification deleted successfully.' };
  }

  /**
   * Idempotent reminder scheduler job.
   * Checks mutually exclusive 30-day, 7-day, and 1-day reminder windows (BG-02)
   * to eliminate multi-tier alert storms when purchases are registered near deadlines.
   */
  static async generateUpcomingReminders(): Promise<number> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const horizonLimit = new Date(startOfToday.getTime() + 32 * 24 * 60 * 60 * 1000);

    // Scoped query with compound index (DB-04)
    const activePurchases = await Purchase.find({
      archivedAt: null,
      $or: [
        { warrantyExpiryDate: { $gte: startOfToday, $lte: horizonLimit } },
        { returnDeadline: { $gte: startOfToday, $lte: horizonLimit } },
      ],
    })
      .select('_id userId productName warrantyExpiryDate returnDeadline')
      .lean();

    const tiers = [
      { interval: 30, min: 8, max: 30 },
      { interval: 7, min: 2, max: 7 },
      { interval: 1, min: 0, max: 1 },
    ];

    let createdCount = 0;

    for (const p of activePurchases) {
      // 1. Warranty reminders
      if (p.warrantyExpiryDate) {
        const days = getDaysRemaining(p.warrantyExpiryDate, now);
        for (const tier of tiers) {
          if (days >= tier.min && days <= tier.max) {
            try {
              const notif = await Notification.create({
                userId: p.userId,
                purchaseId: p._id,
                type: 'WARRANTY_EXPIRY',
                reminderDaysBefore: tier.interval,
                title: `Warranty Expiring Soon: ${p.productName}`,
                message: `The warranty for your ${p.productName} expires in ${days} day(s). Check your documentation or claim service if needed.`,
              });
              createdCount++;
              logger.info(`[Email Dispatch Simulation] Sent WARRANTY_EXPIRY reminder to user ${p.userId} for purchase "${p.productName}" (${days} days remaining)`);
            } catch (err: any) {
              if (err.code !== 11000) {
                logger.error(`Error generating warranty reminder: ${err.message}`);
              }
            }
          }
        }
      }

      // 2. Return deadline reminders
      if (p.returnDeadline) {
        const days = getDaysRemaining(p.returnDeadline, now);
        for (const tier of tiers) {
          if (days >= tier.min && days <= tier.max) {
            try {
              const notif = await Notification.create({
                userId: p.userId,
                purchaseId: p._id,
                type: 'RETURN_DEADLINE',
                reminderDaysBefore: tier.interval,
                title: `Return Window Closing: ${p.productName}`,
                message: `The return deadline for your ${p.productName} is in ${days} day(s). Ensure you initiate a return if you plan to.`,
              });
              createdCount++;
              logger.info(`[Email Dispatch Simulation] Sent RETURN_DEADLINE reminder to user ${p.userId} for purchase "${p.productName}" (${days} days remaining)`);
            } catch (err: any) {
              if (err.code !== 11000) {
                logger.error(`Error generating return reminder: ${err.message}`);
              }
            }
          }
        }
      }
    }

    return createdCount;
  }
}
