import { Router } from 'express';
import { getDeadlines } from '../dashboard/dashboard.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', getDeadlines);

export const deadlineRoutes = router;
