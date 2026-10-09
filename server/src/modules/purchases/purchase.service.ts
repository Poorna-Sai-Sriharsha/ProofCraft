import mongoose from 'mongoose';
import { Purchase, IPurchase } from './purchase.model.js';
import { CreatePurchaseInput, UpdatePurchaseInput, ListPurchaseQuery } from './purchase.schema.js';
import {
  normalizeDateOnlyToUtc,
  calculateWarrantyExpiry,
  calculateReturnDeadline,
  calculateWarrantyStatus,
} from '../../utils/dateUtils.js';
import { ApiError } from '../../utils/ApiError.js';

export class PurchaseService {
  static async createPurchase(userId: string, input: CreatePurchaseInput) {
    const purchaseDate = normalizeDateOnlyToUtc(input.purchaseDate);

    const warrantyStartDate = input.warrantyStartDate
      ? normalizeDateOnlyToUtc(input.warrantyStartDate)
      : undefined;

    // Calculate suggested/explicit warranty expiry date
    const warrantyExpiryDate = calculateWarrantyExpiry({
      purchaseDate,
      warrantyStartDate,
      warrantyDurationMonths: input.warrantyDurationMonths,
      explicitExpiryDate: input.warrantyExpiryDate,
    });

    // Calculate suggested/explicit return deadline
    const returnDeadline = calculateReturnDeadline({
      purchaseDate,
      returnWindowDays: input.returnWindowDays,
      explicitReturnDeadline: input.returnDeadline,
    });

    // Derive authoritative dynamic warranty status
    const effectiveStatus = calculateWarrantyStatus({
      storedStatus: input.warrantyStatus,
      warrantyExpiryDate,
    });

    const purchase = await Purchase.create({
      ...input,
      userId: new mongoose.Types.ObjectId(userId),
      purchaseDate,
      warrantyStartDate,
      warrantyExpiryDate,
      returnDeadline,
      warrantyStatus: effectiveStatus,
    });

    return purchase;
  }

  static async getPurchases(userId: string, query: ListPurchaseQuery) {
    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (!query.includeArchived) {
      filter.archivedAt = null;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.status) {
      filter.warrantyStatus = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { productName: searchRegex },
        { brand: searchRegex },
        { modelNumber: searchRegex },
        { serialNumber: searchRegex },
        { retailer: searchRegex },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.purchaseDate = {};
      if (query.startDate) {
        filter.purchaseDate.$gte = normalizeDateOnlyToUtc(query.startDate);
      }
      if (query.endDate) {
        filter.purchaseDate.$lte = normalizeDateOnlyToUtc(query.endDate);
      }
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sortField = query.sortBy || 'purchaseDate';
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [purchases, total] = await Promise.all([
      Purchase.find(filter).sort(sort).skip(skip).limit(limit),
      Purchase.countDocuments(filter),
    ]);

    // Recalculate dynamic status on retrieved records
    const updatedPurchases = purchases.map((p) => {
      const currentStatus = calculateWarrantyStatus({
        storedStatus: p.warrantyStatus,
        warrantyExpiryDate: p.warrantyExpiryDate,
      });
      p.warrantyStatus = currentStatus;
      return p;
    });

    return {
      purchases: updatedPurchases,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getPurchaseById(userId: string, purchaseId: string) {
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      throw ApiError.badRequest('Invalid purchase identifier', 'INVALID_PURCHASE_ID');
    }

    const purchase = await Purchase.findOne({
      _id: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!purchase) {
      throw ApiError.notFound('Purchase record not found', 'PURCHASE_NOT_FOUND');
    }

    purchase.warrantyStatus = calculateWarrantyStatus({
      storedStatus: purchase.warrantyStatus,
      warrantyExpiryDate: purchase.warrantyExpiryDate,
    });

    return purchase;
  }

  static async updatePurchase(userId: string, purchaseId: string, input: UpdatePurchaseInput) {
    const purchase = await this.getPurchaseById(userId, purchaseId);

    if (input.productName !== undefined) purchase.productName = input.productName;
    if (input.brand !== undefined) purchase.brand = input.brand;
    if (input.category !== undefined) purchase.category = input.category;
    if (input.modelNumber !== undefined) purchase.modelNumber = input.modelNumber;
    if (input.serialNumber !== undefined) purchase.serialNumber = input.serialNumber;
    if (input.purchasePrice !== undefined) purchase.purchasePrice = input.purchasePrice;
    if (input.currency !== undefined) purchase.currency = input.currency;
    if (input.retailer !== undefined) purchase.retailer = input.retailer;
    if (input.orderId !== undefined) purchase.orderId = input.orderId;
    if (input.notes !== undefined) purchase.notes = input.notes;
    if (input.returnWindowDays !== undefined) purchase.returnWindowDays = input.returnWindowDays;
    if (input.warrantyDurationMonths !== undefined) purchase.warrantyDurationMonths = input.warrantyDurationMonths;
    if (input.warrantyProvider !== undefined) purchase.warrantyProvider = input.warrantyProvider;

    if (input.purchaseDate) {
      purchase.purchaseDate = normalizeDateOnlyToUtc(input.purchaseDate);
    }
    if (input.warrantyStartDate) {
      purchase.warrantyStartDate = normalizeDateOnlyToUtc(input.warrantyStartDate);
    }
    if (input.warrantyExpiryDate) {
      purchase.warrantyExpiryDate = normalizeDateOnlyToUtc(input.warrantyExpiryDate);
    }
    if (input.returnDeadline) {
      purchase.returnDeadline = normalizeDateOnlyToUtc(input.returnDeadline);
    }

    // Recalculate expiry and deadline if duration or window changed without explicit overrides
    if (input.warrantyDurationMonths !== undefined && !input.warrantyExpiryDate) {
      purchase.warrantyExpiryDate = calculateWarrantyExpiry({
        purchaseDate: purchase.purchaseDate,
        warrantyStartDate: purchase.warrantyStartDate,
        warrantyDurationMonths: purchase.warrantyDurationMonths,
      });
    }

    if (input.returnWindowDays !== undefined && !input.returnDeadline) {
      purchase.returnDeadline = calculateReturnDeadline({
        purchaseDate: purchase.purchaseDate,
        returnWindowDays: purchase.returnWindowDays,
      });
    }

    purchase.warrantyStatus = calculateWarrantyStatus({
      storedStatus: input.warrantyStatus || purchase.warrantyStatus,
      warrantyExpiryDate: purchase.warrantyExpiryDate,
    });

    await purchase.save();
    return purchase;
  }

  static async archivePurchase(userId: string, purchaseId: string) {
    const purchase = await this.getPurchaseById(userId, purchaseId);
    purchase.archivedAt = new Date();
    await purchase.save();
    return purchase;
  }

  static async restorePurchase(userId: string, purchaseId: string) {
    const purchase = await this.getPurchaseById(userId, purchaseId);
    purchase.set('archivedAt', null);
    await purchase.save();
    return purchase;
  }

  static async deletePurchase(userId: string, purchaseId: string) {
    const purchase = await this.getPurchaseById(userId, purchaseId);
    await Purchase.deleteOne({ _id: purchase._id, userId: purchase.userId });
    return { message: 'Purchase and associated history deleted successfully.' };
  }
}
