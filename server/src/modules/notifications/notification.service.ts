import mongoose from 'mongoose';
import { Notification, NotificationType } from './notification.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { getDaysRemaining } from '../../utils/dateUtils.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

export class NotificationService {
  static async listNotifications(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Notification.find({ userId: userObjectId })
      .populate('purchaseId', 'productName brand category')
      .sort({ createdAt: -1 });
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
   * Checks 30-day, 7-day, and 1-day reminder windows for all active purchases.
   * Employs unique compound index and catch-up ranges to prevent duplicates.
   */
  static async generateUpcomingReminders(): Promise<number> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const horizonLimit = new Date(startOfToday.getTime() + 32 * 24 * 60 * 60 * 1000);

    // Scoped query: Only fetch purchases with upcoming deadlines in the 30-day window (DB-03)
    const activePurchases = await Purchase.find({
      archivedAt: null,
      $or: [
        { warrantyExpiryDate: { $gte: startOfToday, $lte: horizonLimit } },
        { returnDeadline: { $gte: startOfToday, $lte: horizonLimit } },
      ],
    })
      .select('_id userId productName warrantyExpiryDate returnDeadline')
      .lean();

    const intervals = [30, 7, 1];
    let createdCount = 0;

    for (const p of activePurchases) {
      // 1. Warranty reminders
      if (p.warrantyExpiryDate) {
        const days = getDaysRemaining(p.warrantyExpiryDate, now);
        for (const interval of intervals) {
          if (days <= interval && days >= 0) {
            try {
              await Notification.create({
                userId: p.userId,
                purchaseId: p._id,
                type: 'WARRANTY_EXPIRY',
                reminderDaysBefore: interval,
                title: `Warranty Expiring Soon: ${p.productName}`,
                message: `The warranty for your ${p.productName} expires in ${days} day(s). Check your documentation or claim service if needed.`,
              });
              createdCount++;
            } catch (err: any) {
              // Ignore duplicate key error (11000) - guarantees idempotency
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
        for (const interval of intervals) {
          if (days <= interval && days >= 0) {
            try {
              await Notification.create({
                userId: p.userId,
                purchaseId: p._id,
                type: 'RETURN_DEADLINE',
                reminderDaysBefore: interval,
                title: `Return Window Closing: ${p.productName}`,
                message: `The return deadline for your ${p.productName} is in ${days} day(s). Ensure you initiate a return if you plan to.`,
              });
              createdCount++;
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
