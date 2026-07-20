import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isCompanyAdmin, isEngineer } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
} from '../../controllers/sensor.controller';
import {
  createSensorSchema,
  updateSensorSchema,
  sensorIdParamSchema,
} from '../../validators/sensor.validator';

const router = Router();

router.use(authenticate);

// Read
router.get('/', getSensors);
router.get('/:id', validate(sensorIdParamSchema), getSensorById);

// Write (Admin + Engineer)
router.post('/', isEngineer, validate(createSensorSchema), createSensor);
router.put('/:id', isEngineer, validate(updateSensorSchema), updateSensor);

// Delete (Admin only)
router.delete('/:id', isCompanyAdmin, validate(sensorIdParamSchema), deleteSensor);

export default router;
