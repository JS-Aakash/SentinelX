import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isCompanyAdmin, isEngineer } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  getMachines,
  getMachineStats,
  getRecentMachines,
  getMachineTypes,
  getFilterOptions,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  uploadMachineImage,
} from '../../controllers/machine.controller';
import {
  assignDeviceToMachine,
  removeDeviceFromMachine,
} from '../../controllers/device.controller';
import {
  createMachineSchema,
  updateMachineSchema,
  getMachinesQuerySchema,
  machineIdParamSchema,
} from '../../validators/machine.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

import {
  getMachineLiveTelemetry,
  getMachineTelemetryHistory,
} from '../../controllers/live.controller';
import { getChartData } from '../../controllers/chart.controller';

// ─── Read-only routes (all authenticated roles) ────────────────────────────────

router.get('/', validate(getMachinesQuerySchema), getMachines);
router.get('/stats', getMachineStats);
router.get('/recent', getRecentMachines);
router.get('/types', getMachineTypes);
router.get('/filter-options', getFilterOptions);
router.get('/:id/live', validate(machineIdParamSchema), getMachineLiveTelemetry);
router.get('/:id/history', validate(machineIdParamSchema), getMachineTelemetryHistory);
router.get('/:id/chart', validate(machineIdParamSchema), getChartData);
router.get('/:id', validate(machineIdParamSchema), getMachineById);

// ─── Write routes (Admin + Engineer) ─────────────────────────────────────────

router.post('/', isEngineer, validate(createMachineSchema), createMachine);
router.put('/:id', isEngineer, validate(updateMachineSchema), updateMachine);
router.post(
  '/:id/image',
  isEngineer,
  upload.single('machine'),
  uploadMachineImage
);

// Device Assignment Routes (Admin + Engineer)
router.post('/:id/device', isEngineer, assignDeviceToMachine);
router.delete('/:id/device', isEngineer, removeDeviceFromMachine);

// ─── Delete (Admin only) ──────────────────────────────────────────────────────

router.delete('/:id', isCompanyAdmin, validate(machineIdParamSchema), deleteMachine);

export default router;
