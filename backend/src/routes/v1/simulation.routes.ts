import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stopSimulation,
  updateSensorOverrides,
  getSimulationStatus,
  getActiveSimulations,
} from '../../controllers/simulation.controller';

const router = Router();

router.use(authenticate);

router.post('/start', startSimulation);
router.post('/pause', pauseSimulation);
router.post('/resume', resumeSimulation);
router.post('/stop', stopSimulation);
router.post('/update-sensors', updateSensorOverrides);
router.get('/status/:machineId', getSimulationStatus);
router.get('/active', getActiveSimulations);

export default router;
