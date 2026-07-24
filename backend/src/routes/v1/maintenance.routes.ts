import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isEngineer } from '../../middlewares/role.middleware';
import { uploadDisk } from '../../middlewares/upload.middleware';
import {
  getMaintenanceOverview,
  getWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus,
  completeWorkOrder,
  verifyWorkOrder,
  getBlockchainExplorerLogs,
  getMachineHistoryTimeline,
} from '../../controllers/maintenance.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', getMaintenanceOverview);
router.get('/work-orders', getWorkOrders);
router.get('/blockchain/explorer', getBlockchainExplorerLogs);
router.get('/timeline/:machineId', getMachineHistoryTimeline);

router.post('/work-orders', isEngineer, createWorkOrder);
router.patch('/work-orders/:id/status', isEngineer, updateWorkOrderStatus);
router.post('/work-orders/:id/complete', uploadDisk.array('evidenceFiles', 5), completeWorkOrder);
router.post('/work-orders/:id/verify', verifyWorkOrder);

export default router;
