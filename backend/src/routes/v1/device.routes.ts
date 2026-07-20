import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isCompanyAdmin, isEngineer } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getDevices,
  getDeviceStats,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
} from '../../controllers/device.controller';
import {
  createDeviceSchema,
  updateDeviceSchema,
  getDevicesQuerySchema,
  deviceIdParamSchema,
} from '../../validators/device.validator';

const router = Router();

router.use(authenticate);

// Read routes (all authenticated users)
router.get('/', validate(getDevicesQuerySchema), getDevices);
router.get('/stats', getDeviceStats);
router.get('/:id', validate(deviceIdParamSchema), getDeviceById);

// Write routes (Admin + Engineer)
router.post('/', isEngineer, validate(createDeviceSchema), createDevice);
router.put('/:id', isEngineer, validate(updateDeviceSchema), updateDevice);

// Delete route (Admin only)
router.delete('/:id', isCompanyAdmin, validate(deviceIdParamSchema), deleteDevice);

export default router;
