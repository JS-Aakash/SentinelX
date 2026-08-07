import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  getLiveAnomalyStatus,
  getAnomalyHistory,
  acknowledgeAnomalyEvent,
  resolveAnomalyEvent,
  clearAnomalyHistory,
} from '../../controllers/anomaly.controller';

const router = Router();

router.use(authenticate);

router.get('/live/:machineId', getLiveAnomalyStatus);
router.get('/history/:machineId', getAnomalyHistory);
router.delete('/history/:machineId/clear', clearAnomalyHistory);
router.post('/history/:machineId/clear', clearAnomalyHistory);
router.put('/:eventId/acknowledge', acknowledgeAnomalyEvent);
router.put('/:eventId/resolve', resolveAnomalyEvent);

export default router;
