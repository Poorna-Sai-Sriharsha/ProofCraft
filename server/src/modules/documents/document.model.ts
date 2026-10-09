import mongoose, { Document, Schema, Model } from 'mongoose';

export type DocumentType = 'INVOICE' | 'WARRANTY_CERTIFICATE' | 'SERVICE_RECEIPT' | 'OTHER';

export interface IPurchaseDocument extends Document {
  userId: mongoose.Types.ObjectId;
  purchaseId: mongoose.Types.ObjectId;
  documentType: DocumentType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseDocumentSchema = new Schema<IPurchaseDocument>(
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
    documentType: {
      type: String,
      enum: ['INVOICE', 'WARRANTY_CERTIFICATE', 'SERVICE_RECEIPT', 'OTHER'],
      required: true,
      default: 'INVOICE',
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    storageProvider: {
      type: String,
      required: true,
      default: 'local',
    },
    storageKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        // Never expose internal storageKey to client
        delete ret.storageKey;
        return ret;
      },
    },
  }
);

purchaseDocumentSchema.index({ purchaseId: 1, documentType: 1 });

export const PurchaseDocument: Model<IPurchaseDocument> = mongoose.model<IPurchaseDocument>(
  'PurchaseDocument',
  purchaseDocumentSchema
);
