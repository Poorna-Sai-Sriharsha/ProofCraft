import { z } from 'zod';

export const createServiceRecordSchema = z.object({
  serviceDate: z.string().min(1, 'Service date is required'),
  serviceProvider: z.string().min(1, 'Service provider is required').max(150).trim(),
  issueDescription: z.string().min(1, 'Issue description is required').max(2000).trim(),
  repairDescription: z.string().max(2000).trim().optional(),
  repairCost: z.coerce.number().min(0, 'Repair cost cannot be negative').default(0),
  warrantyClaimStatus: z
    .enum(['NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED'])
    .default('NOT_APPLICABLE'),
});

export const updateServiceRecordSchema = createServiceRecordSchema.partial();

export const listServiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  purchaseId: z.string().optional(),
});

export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>;
export type UpdateServiceRecordInput = z.infer<typeof updateServiceRecordSchema>;
export type ListServiceQuery = z.infer<typeof listServiceQuerySchema>;
