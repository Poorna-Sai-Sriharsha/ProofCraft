import { Router } from 'express';
import {
  getSummary,
  getSpending,
  getWarranties,
  getRecentPurchases,
} from './dashboard.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/summary', getSummary);
router.get('/spending', getSpending);
router.get('/warranties', getWarranties);
router.get('/recent-purchases', getRecentPurchases);

export const dashboardRoutes = router;
