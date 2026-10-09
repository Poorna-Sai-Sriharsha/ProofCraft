import mongoose, { Document, Schema, Model } from 'mongoose';

export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'NONE' | 'UNKNOWN';

export interface IPurchase extends Document {
  userId: mongoose.Types.ObjectId;
  productName: string;
  brand?: string;
  category: string;
  modelNumber?: string;
  serialNumber?: string;
  purchasePrice: number;
  currency: string;
  purchaseDate: Date;
  retailer?: string;
  orderId?: string;
  returnWindowDays?: number;
  returnDeadline?: Date;
  warrantyStatus: WarrantyStatus;
  warrantyStartDate?: Date;
  warrantyExpiryDate?: Date;
  warrantyDurationMonths?: number;
  warrantyProvider?: string;
  notes?: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Purchase must belong to a user'],
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'General',
    },
    modelNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Model number cannot exceed 100 characters'],
    },
    serialNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Serial number cannot exceed 100 characters'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      trim: true,
      uppercase: true,
      default: 'INR',
      maxlength: [5, 'Currency code must be standard ISO format'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
    },
    retailer: {
      type: String,
      trim: true,
      maxlength: [150, 'Retailer cannot exceed 150 characters'],
    },
    orderId: {
      type: String,
      trim: true,
      maxlength: [100, 'Order ID cannot exceed 100 characters'],
    },
    returnWindowDays: {
      type: Number,
      min: [0, 'Return window days cannot be negative'],
    },
    returnDeadline: {
      type: Date,
    },
    warrantyStatus: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'NONE', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    warrantyStartDate: {
      type: Date,
    },
    warrantyExpiryDate: {
      type: Date,
    },
    warrantyDurationMonths: {
      type: Number,
      min: [0, 'Warranty duration cannot be negative'],
    },
    warrantyProvider: {
      type: String,
      trim: true,
      maxlength: [150, 'Warranty provider cannot exceed 150 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    archivedAt: {
      type: Date,
      default: null,
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

// High performance compound indexes per Part 6.2 spec
purchaseSchema.index({ userId: 1, purchaseDate: -1 });
purchaseSchema.index({ userId: 1, warrantyExpiryDate: 1 });
purchaseSchema.index({ userId: 1, category: 1 });
purchaseSchema.index({ userId: 1, archivedAt: 1 });

export const Purchase: Model<IPurchase> = mongoose.model<IPurchase>('Purchase', purchaseSchema);
