import { Router } from 'express';
import {
  createServiceRecord,
  getPurchaseServiceRecords,
  getAllServiceRecords,
  getServiceRecordById,
  updateServiceRecord,
  deleteServiceRecord,
} from './service.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  createServiceRecordSchema,
  updateServiceRecordSchema,
  listServiceQuerySchema,
} from './service.schema.js';

// Global router mounted at /api/v1/services
const serviceDirectRouter = Router();
serviceDirectRouter.use(authenticate);
serviceDirectRouter.get('/', validate({ query: listServiceQuerySchema }), getAllServiceRecords);
serviceDirectRouter.get('/:id', getServiceRecordById);
serviceDirectRouter.patch('/:id', validate({ body: updateServiceRecordSchema }), updateServiceRecord);
serviceDirectRouter.delete('/:id', deleteServiceRecord);

// Nested router mounted at /api/v1/purchases/:id/services
const purchaseServiceRouter = Router({ mergeParams: true });
purchaseServiceRouter.use(authenticate);
purchaseServiceRouter.post('/', validate({ body: createServiceRecordSchema }), createServiceRecord);
purchaseServiceRouter.get('/', getPurchaseServiceRecords);

export const serviceRoutes = serviceDirectRouter;
export const purchaseServiceRoutes = purchaseServiceRouter;
