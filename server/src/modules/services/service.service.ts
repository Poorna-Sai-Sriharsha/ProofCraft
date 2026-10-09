import mongoose from 'mongoose';
import { ServiceRecord } from './service.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { CreateServiceRecordInput, UpdateServiceRecordInput, ListServiceQuery } from './service.schema.js';
import { normalizeDateOnlyToUtc } from '../../utils/dateUtils.js';
import { ApiError } from '../../utils/ApiError.js';

export class ServiceRecordService {
  static async createServiceRecord(
    userId: string,
    purchaseId: string,
    input: CreateServiceRecordInput
  ) {
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      throw ApiError.badRequest('Invalid purchase identifier', 'INVALID_PURCHASE_ID');
    }

    // Verify ownership of the target purchase
    const purchase = await Purchase.findOne({
      _id: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!purchase) {
      throw ApiError.notFound('Purchase record not found', 'PURCHASE_NOT_FOUND');
    }

    const serviceDate = normalizeDateOnlyToUtc(input.serviceDate);

    const record = await ServiceRecord.create({
      ...input,
      serviceDate,
      userId: new mongoose.Types.ObjectId(userId),
      purchaseId: new mongoose.Types.ObjectId(purchaseId),
    });

    return record;
  }

  static async getServiceRecordsByPurchase(userId: string, purchaseId: string) {
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      throw ApiError.badRequest('Invalid purchase identifier', 'INVALID_PURCHASE_ID');
    }

    // Verify ownership
    const purchase = await Purchase.findOne({
      _id: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!purchase) {
      throw ApiError.notFound('Purchase record not found', 'PURCHASE_NOT_FOUND');
    }

    return ServiceRecord.find({
      purchaseId: new mongoose.Types.ObjectId(purchaseId),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ serviceDate: -1 });
  }

  static async getAllServiceRecords(userId: string, query: ListServiceQuery) {
    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (query.purchaseId) {
      if (!mongoose.Types.ObjectId.isValid(query.purchaseId)) {
        throw ApiError.badRequest('Invalid purchase identifier', 'INVALID_PURCHASE_ID');
      }
      filter.purchaseId = new mongoose.Types.ObjectId(query.purchaseId);
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      ServiceRecord.find(filter)
        .populate('purchaseId', 'productName brand category')
        .sort({ serviceDate: -1 })
        .skip(skip)
        .limit(limit),
      ServiceRecord.countDocuments(filter),
    ]);

    return {
      records,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getServiceRecordById(userId: string, serviceId: string) {
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw ApiError.badRequest('Invalid service record identifier', 'INVALID_SERVICE_ID');
    }

    const record = await ServiceRecord.findOne({
      _id: new mongoose.Types.ObjectId(serviceId),
      userId: new mongoose.Types.ObjectId(userId),
    }).populate('purchaseId', 'productName brand category');

    if (!record) {
      throw ApiError.notFound('Service record not found', 'SERVICE_RECORD_NOT_FOUND');
    }

    return record;
  }

  static async updateServiceRecord(
    userId: string,
    serviceId: string,
    input: UpdateServiceRecordInput
  ) {
    const record = await this.getServiceRecordById(userId, serviceId);

    if (input.serviceProvider !== undefined) record.serviceProvider = input.serviceProvider;
    if (input.issueDescription !== undefined) record.issueDescription = input.issueDescription;
    if (input.repairDescription !== undefined) record.repairDescription = input.repairDescription;
    if (input.repairCost !== undefined) record.repairCost = input.repairCost;
    if (input.warrantyClaimStatus !== undefined) record.warrantyClaimStatus = input.warrantyClaimStatus;
    if (input.serviceDate) {
      record.serviceDate = normalizeDateOnlyToUtc(input.serviceDate);
    }

    await record.save();
    return record;
  }

  static async deleteServiceRecord(userId: string, serviceId: string) {
    const record = await this.getServiceRecordById(userId, serviceId);
    await ServiceRecord.deleteOne({ _id: record._id, userId: record.userId });
    return { message: 'Service record deleted successfully.' };
  }
}
