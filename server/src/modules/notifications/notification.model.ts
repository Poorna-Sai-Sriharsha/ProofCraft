import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType = 'RETURN_DEADLINE' | 'WARRANTY_EXPIRY';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  purchaseId: mongoose.Types.ObjectId;
  type: NotificationType;
  reminderDaysBefore: number;
  title: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
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
    type: {
      type: String,
      enum: ['RETURN_DEADLINE', 'WARRANTY_EXPIRY'],
      required: true,
    },
    reminderDaysBefore: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Idempotent reminder uniqueness index per Part 6.5 spec
notificationSchema.index(
  { purchaseId: 1, type: 1, reminderDaysBefore: 1 },
  { unique: true }
);

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
