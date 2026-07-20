import { Router } from 'express';
import {
  getCompany,
  updateCompany,
  uploadCompanyLogo,
} from '../../controllers/company.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { isCompanyAdmin } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { updateCompanySchema } from '../../validators/company.validator';

const router = Router();

// All company routes require authentication
router.use(authenticate);

router.get('/', getCompany);
router.put('/', isCompanyAdmin, validate(updateCompanySchema), updateCompany);
router.post('/logo', isCompanyAdmin, upload.single('logo'), uploadCompanyLogo);

export default router;
