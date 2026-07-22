import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isEngineer } from '../../middlewares/role.middleware';
import {
  getMaintenanceOverview,
  getWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus,
} from '../../controllers/maintenance.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', getMaintenanceOverview);
router.get('/work-orders', getWorkOrders);
router.post('/work-orders', isEngineer, createWorkOrder);
router.patch('/work-orders/:id/status', isEngineer, updateWorkOrderStatus);

export default router;
