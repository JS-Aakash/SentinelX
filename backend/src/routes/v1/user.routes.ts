import { Router } from 'express';
import { getProfile, updateProfile, uploadAvatar } from '../../controllers/user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { updateUserSchema } from '../../validators/user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', validate(updateUserSchema), updateProfile);
router.post('/me/avatar', upload.single('avatar'), uploadAvatar);

export default router;
