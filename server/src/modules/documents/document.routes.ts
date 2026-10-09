import { Router } from 'express';
import {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
} from './document.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { upload } from '../../middleware/upload.js';

// Router mounted at /api/v1/documents
const documentDirectRouter = Router();
documentDirectRouter.use(authenticate);
documentDirectRouter.get('/:id/download', downloadDocument);
documentDirectRouter.delete('/:id', deleteDocument);

// Router mounted at /api/v1/purchases/:id/documents
const purchaseDocumentRouter = Router({ mergeParams: true });
purchaseDocumentRouter.use(authenticate);
purchaseDocumentRouter.post('/', upload.single('file'), uploadDocument);
purchaseDocumentRouter.get('/', getDocuments);

export const documentRoutes = documentDirectRouter;
export const purchaseDocumentsRoutes = purchaseDocumentRouter;
