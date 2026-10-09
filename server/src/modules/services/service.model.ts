import mongoose, { Document, Schema, Model } from 'mongoose';

export type WarrantyClaimStatus = 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IServiceRecord extends Document {
  userId: mongoose.Types.ObjectId;
  purchaseId: mongoose.Types.ObjectId;
  serviceDate: Date;
  serviceProvider: string;
  issueDescription: string;
  repairDescription?: string;
  repairCost?: number;
  warrantyClaimStatus: WarrantyClaimStatus;
  createdAt: Date;
  updatedAt: Date;
}

const serviceRecordSchema = new Schema<IServiceRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
      index: true,
    },
    serviceDate: {
      type: Date,
      required: [true, 'Service date is required'],
    },
    serviceProvider: {
      type: String,
      required: [true, 'Service provider is required'],
      trim: true,
      maxlength: [150, 'Service provider name too long'],
    },
    issueDescription: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: [2000, 'Issue description cannot exceed 2000 characters'],
    },
    repairDescription: {
      type: String,
      trim: true,
      maxlength: [2000, 'Repair description cannot exceed 2000 characters'],
    },
    repairCost: {
      type: Number,
      min: [0, 'Repair cost cannot be negative'],
      default: 0,
    },
    warrantyClaimStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NOT_APPLICABLE',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

serviceRecordSchema.index({ userId: 1, serviceDate: -1 });

export const ServiceRecord: Model<IServiceRecord> = mongoose.model<IServiceRecord>(
  'ServiceRecord',
  serviceRecordSchema
);
