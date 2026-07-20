import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  uploadDataset,
  getSampleTemplate,
  getMachineDatasets,
  getDatasetById,
  getDatasetPreview,
  cleanDataset,
  generateFeatures,
  activateDatasetVersion,
  deleteDataset,
  downloadDatasetFile,
} from '../../controllers/dataset.controller';

const uploadDir = path.join(process.cwd(), 'uploads', 'datasets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `raw_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only CSV and Excel (.xlsx, .xls) files are supported.'));
    }
  },
});

const router = Router();

// Sample template does not require auth so users can preview freely
router.get('/sample-template', getSampleTemplate);

router.use(authenticate);

// Dataset APIs
router.post('/upload', upload.single('file'), uploadDataset);
router.get('/machine/:machineId', getMachineDatasets);
router.get('/:id', getDatasetById);
router.get('/:id/preview', getDatasetPreview);
router.get('/:id/download/:type', downloadDatasetFile);
router.post('/:id/clean', cleanDataset);
router.post('/:id/features', generateFeatures);
router.post('/:id/activate', activateDatasetVersion);
router.post('/:id/restore', activateDatasetVersion); // Alias for restoring version as active
router.delete('/:id', deleteDataset);

export default router;
