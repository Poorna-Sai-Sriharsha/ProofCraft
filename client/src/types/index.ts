export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'NONE' | 'UNKNOWN';

export interface Purchase {
  _id: string;
  userId: string;
  productName: string;
  brand?: string;
  category: string;
  modelNumber?: string;
  serialNumber?: string;
  purchasePrice: number;
  currency: string;
  purchaseDate: string;
  retailer?: string;
  orderId?: string;
  returnWindowDays?: number;
  returnDeadline?: string;
  warrantyStatus: WarrantyStatus;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  warrantyDurationMonths?: number;
  warrantyProvider?: string;
  notes?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'INVOICE' | 'WARRANTY_CERTIFICATE' | 'SERVICE_RECEIPT' | 'OTHER';

export interface PurchaseDocument {
  _id: string;
  userId: string;
  purchaseId: string;
  documentType: DocumentType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type WarrantyClaimStatus = 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ServiceRecord {
  _id: string;
  userId: string;
  purchaseId: string;
  serviceDate: string;
  serviceProvider: string;
  issueDescription: string;
  repairDescription?: string;
  repairCost?: number;
  warrantyClaimStatus: WarrantyClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'RETURN_DEADLINE' | 'WARRANTY_EXPIRY';

export interface NotificationItem {
  _id: string;
  userId: string;
  purchaseId: {
    _id: string;
    productName: string;
    brand?: string;
  } | string;
  type: NotificationType;
  reminderDaysBefore: number;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalPurchases: number;
  totalSpentByCurrency: Array<{ currency: string; amount: number }>;
  activeWarranties: number;
  expiringSoon: number;
  expiredWarranties: number;
  unknownWarranty: number;
  noWarranty: number;
}
