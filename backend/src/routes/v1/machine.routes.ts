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
  getMachineConfig,
  createMachine,
  updateMachine,
  deleteMachine,
  uploadMachineImage,
  toggleDataRecording,
  updateAILifecycleStatus,
  clearMachineLiveDataset,
  saveProgressAsDataset,
  downloadMachineLiveDataset,
  trainFromLiveDataset,
  uploadDigitalTwinModel,
  getDigitalTwinModel,
  deleteDigitalTwinModel,
  replaceDigitalTwinModel,
} from '../../controllers/machine.controller';
import { uploadDigitalTwin } from '../../middlewares/upload.middleware';
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
router.get('/:id/config', validate(machineIdParamSchema), getMachineConfig);
router.get('/:id/live', validate(machineIdParamSchema), getMachineLiveTelemetry);
router.get('/:id/history', validate(machineIdParamSchema), getMachineTelemetryHistory);
router.get('/:id/chart', validate(machineIdParamSchema), getChartData);
router.get('/:id/dataset/download', validate(machineIdParamSchema), downloadMachineLiveDataset);
router.get('/:id', validate(machineIdParamSchema), getMachineById);

// ─── Write routes (Admin + Engineer) ─────────────────────────────────────────

router.post('/', isEngineer, validate(createMachineSchema), createMachine);
router.put('/:id', isEngineer, validate(updateMachineSchema), updateMachine);
router.patch('/:id/recording', isEngineer, validate(machineIdParamSchema), toggleDataRecording);
router.patch('/:id/ai-lifecycle', isEngineer, validate(machineIdParamSchema), updateAILifecycleStatus);
router.post('/:id/dataset/clear', isEngineer, validate(machineIdParamSchema), clearMachineLiveDataset);
router.post('/:id/dataset/save-progress', isEngineer, validate(machineIdParamSchema), saveProgressAsDataset);
router.post('/:id/train-live', isEngineer, validate(machineIdParamSchema), trainFromLiveDataset);
router.post(
  '/:id/image',
  isEngineer,
  upload.single('machine'),
  uploadMachineImage
);

// Device Assignment Routes (Admin + Engineer)
router.post('/:id/device', isEngineer, assignDeviceToMachine);
router.delete('/:id/device', isEngineer, removeDeviceFromMachine);

// ─── Digital Twin 3D Model Routes ────────────────────────────────────────────
router.get('/:id/digital-twin', getDigitalTwinModel);
router.post('/:id/digital-twin/upload', isEngineer, uploadDigitalTwin.single('modelFile'), uploadDigitalTwinModel);
router.put('/:id/digital-twin/replace', isEngineer, uploadDigitalTwin.single('modelFile'), replaceDigitalTwinModel);
router.delete('/:id/digital-twin', isEngineer, deleteDigitalTwinModel);

// ─── Delete (Admin only) ──────────────────────────────────────────────────────

router.delete('/:id', isCompanyAdmin, validate(machineIdParamSchema), deleteMachine);

export default router;

