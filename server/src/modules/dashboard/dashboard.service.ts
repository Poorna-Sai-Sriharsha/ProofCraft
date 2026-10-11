import mongoose from 'mongoose';
import { Purchase } from '../purchases/purchase.model.js';
import {
  calculateWarrantyStatus,
  getDaysRemaining,
  normalizeDateOnlyToUtc,
} from '../../utils/dateUtils.js';

export class DashboardService {
  static async getSummary(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Active purchases with minimal projection (DB-02)
    const purchases = await Purchase.find({
      userId: userObjectId,
      archivedAt: null,
    })
      .select('currency purchasePrice warrantyStatus warrantyExpiryDate')
      .lean();

    const now = new Date();
    let activeWarranties = 0;
    let expiringSoon = 0;
    let expiredWarranties = 0;
    let unknownWarranty = 0;
    let noWarranty = 0;

    // Currency spending map
    const spendingMap = new Map<string, number>();

    for (const p of purchases) {
      // Aggregate spending by currency
      const currency = p.currency || 'INR';
      const currentAmount = spendingMap.get(currency) || 0;
      spendingMap.set(currency, currentAmount + (p.purchasePrice || 0));

      // Calculate dynamic warranty status
      const status = calculateWarrantyStatus({
        storedStatus: p.warrantyStatus,
        warrantyExpiryDate: p.warrantyExpiryDate,
        referenceDate: now,
      });

      if (status === 'NONE') {
        noWarranty++;
      } else if (status === 'UNKNOWN') {
        unknownWarranty++;
      } else if (status === 'EXPIRED') {
        expiredWarranties++;
      } else if (status === 'ACTIVE') {
        activeWarranties++;
        if (p.warrantyExpiryDate) {
          const days = getDaysRemaining(p.warrantyExpiryDate, now);
          if (days >= 0 && days <= 30) {
            expiringSoon++;
          }
        }
      }
    }

    const totalSpentByCurrency = Array.from(spendingMap.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    return {
      totalPurchases: purchases.length,
      totalSpentByCurrency,
      activeWarranties,
      expiringSoon,
      expiredWarranties,
      unknownWarranty,
      noWarranty,
    };
  }

  static async getSpendingAnalytics(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const result = await Purchase.aggregate([
      { $match: { userId: userObjectId, archivedAt: null } },
      {
        $group: {
          _id: { category: '$category', currency: '$currency' },
          totalAmount: { $sum: '$purchasePrice' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          currency: '$_id.currency',
          categoryLabel: {
            $concat: ['$_id.category', ' (', '$_id.currency', ')'],
          },
          amount: '$totalAmount',
          count: '$count',
        },
      },
      { $sort: { amount: -1 } },
    ]);

    return result;
  }

  static async getWarrantyDistribution(userId: string) {
    const summary = await this.getSummary(userId);
    return [
      { name: 'Active', count: summary.activeWarranties, color: '#15803d' },
      { name: 'Expiring Soon (30d)', count: summary.expiringSoon, color: '#b45309' },
      { name: 'Expired', count: summary.expiredWarranties, color: '#b91c1c' },
      { name: 'No Warranty', count: summary.noWarranty, color: '#64748b' },
      { name: 'Unknown', count: summary.unknownWarranty, color: '#94a3b8' },
    ];
  }

  static async getRecentPurchases(userId: string, limit: number = 5) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const purchases = await Purchase.find({
      userId: userObjectId,
      archivedAt: null,
    })
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(limit);

    return purchases.map((p) => {
      p.warrantyStatus = calculateWarrantyStatus({
        storedStatus: p.warrantyStatus,
        warrantyExpiryDate: p.warrantyExpiryDate,
      });
      return p;
    });
  }

  static async getUpcomingDeadlines(userId: string, daysWindow: number = 90) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    // Filter only records that have an expiry or return date set (DB-02)
    const purchases = await Purchase.find({
      userId: userObjectId,
      archivedAt: null,
      $or: [
        { warrantyExpiryDate: { $ne: null } },
        { returnDeadline: { $ne: null } },
      ],
    })
      .select('productName brand category warrantyExpiryDate returnDeadline')
      .lean();

    const deadlines: Array<{
      purchaseId: string;
      productName: string;
      brand?: string;
      category: string;
      deadlineType: 'WARRANTY_EXPIRY' | 'RETURN_DEADLINE';
      deadlineDate: string;
      daysRemaining: number;
    }> = [];

    for (const p of purchases) {
      // 1. Warranty Expiry check
      if (p.warrantyExpiryDate) {
        const days = getDaysRemaining(p.warrantyExpiryDate, now);
        if (days >= 0 && days <= daysWindow) {
          deadlines.push({
            purchaseId: p._id.toString(),
            productName: p.productName,
            brand: p.brand,
            category: p.category,
            deadlineType: 'WARRANTY_EXPIRY',
            deadlineDate: p.warrantyExpiryDate.toISOString(),
            daysRemaining: days,
          });
        }
      }

      // 2. Return Deadline check
      if (p.returnDeadline) {
        const days = getDaysRemaining(p.returnDeadline, now);
        if (days >= 0 && days <= daysWindow) {
          deadlines.push({
            purchaseId: p._id.toString(),
            productName: p.productName,
            brand: p.brand,
            category: p.category,
            deadlineType: 'RETURN_DEADLINE',
            deadlineDate: p.returnDeadline.toISOString(),
            daysRemaining: days,
          });
        }
      }
    }

    // Sort chronologically (nearest deadline first)
    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return deadlines;
  }
}
