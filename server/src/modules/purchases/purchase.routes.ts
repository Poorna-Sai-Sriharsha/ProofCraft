import { Router } from 'express';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  archivePurchase,
  restorePurchase,
  deletePurchase,
} from './purchase.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  createPurchaseSchema,
  updatePurchaseSchema,
  listPurchaseQuerySchema,
} from './purchase.schema.js';
import { purchaseDocumentsRoutes } from '../documents/document.routes.js';
import { purchaseServiceRoutes } from '../services/service.routes.js';

const router = Router();

// All purchase routes require authentication
router.use(authenticate);

// Mount nested document and service routes
router.use('/:id/documents', purchaseDocumentsRoutes);
router.use('/:id/services', purchaseServiceRoutes);

router.post('/', validate({ body: createPurchaseSchema }), createPurchase);
router.get('/', validate({ query: listPurchaseQuerySchema }), getPurchases);
router.get('/:id', getPurchaseById);
router.patch('/:id', validate({ body: updatePurchaseSchema }), updatePurchase);
router.patch('/:id/archive', archivePurchase);
router.patch('/:id/restore', restorePurchase);
router.delete('/:id', deletePurchase);

export const purchaseRoutes = router;
