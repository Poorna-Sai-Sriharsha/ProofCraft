import { z } from 'zod';

export const createPurchaseSchema = z.object({
  productName: z.string().min(1, 'Product name is required').max(200).trim(),
  brand: z.string().max(100).trim().optional(),
  category: z.string().min(1, 'Category is required').max(100).trim().default('General'),
  modelNumber: z.string().max(100).trim().optional(),
  serialNumber: z.string().max(100).trim().optional(),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  currency: z.string().min(1).max(5).trim().toUpperCase().default('INR'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  retailer: z.string().max(150).trim().optional(),
  orderId: z.string().max(100).trim().optional(),
  returnWindowDays: z.coerce.number().min(0).optional(),
  returnDeadline: z.string().optional(),
  warrantyStatus: z.enum(['ACTIVE', 'EXPIRED', 'NONE', 'UNKNOWN']).default('UNKNOWN'),
  warrantyStartDate: z.string().optional(),
  warrantyExpiryDate: z.string().optional(),
  warrantyDurationMonths: z.coerce.number().min(0).optional(),
  warrantyProvider: z.string().max(150).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const updatePurchaseSchema = createPurchaseSchema.partial();

export const listPurchaseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'NONE', 'UNKNOWN']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z
    .enum(['purchaseDate', 'purchasePrice', 'productName', 'warrantyExpiryDate', 'createdAt'])
    .default('purchaseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: z.coerce.boolean().default(false),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type ListPurchaseQuery = z.infer<typeof listPurchaseQuerySchema>;
