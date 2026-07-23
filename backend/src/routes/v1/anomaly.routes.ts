import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  getLiveAnomalyStatus,
  getAnomalyHistory,
  acknowledgeAnomalyEvent,
  resolveAnomalyEvent,
} from '../../controllers/anomaly.controller';

const router = Router();

router.use(authenticate);

router.get('/live/:machineId', getLiveAnomalyStatus);
router.get('/history/:machineId', getAnomalyHistory);
router.put('/:eventId/acknowledge', acknowledgeAnomalyEvent);
router.put('/:eventId/resolve', resolveAnomalyEvent);

export default router;
