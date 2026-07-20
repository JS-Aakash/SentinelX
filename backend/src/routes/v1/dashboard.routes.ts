import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getDashboardOverview } from '../../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', getDashboardOverview);

export default router;
