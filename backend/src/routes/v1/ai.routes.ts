import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  trainModel,
  retrainModel,
  getModelStatus,
  getModelHistory,
  getModelReport,
  restoreModelVersion,
  deleteModelVersion,
} from '../../controllers/ai.controller';
import {
  triggerLiveInference,
  getLatestPrediction,
  getPredictionHistory,
  getActiveForecast,
  getAIDashboard,
  getRecommendations,
  getAIAlerts,
  clearPredictionHistory,
} from '../../controllers/inference.controller';

const router = Router();

router.use(authenticate);

// Model Training & Versioning APIs
router.post('/train', trainModel);
router.post('/retrain', retrainModel);
router.get('/status/:machineId', getModelStatus);
router.get('/models/history/:machineId', getModelHistory);
router.get('/report/:modelId', getModelReport);
router.post('/restore/:modelId', restoreModelVersion);
router.delete('/model/:modelId', deleteModelVersion);

// Live Inference, Forecasting & Dashboard APIs
router.post('/predict/:machineId', triggerLiveInference);
router.get('/latest/:machineId', getLatestPrediction);
router.get('/predictions/history/:machineId', getPredictionHistory);
router.delete('/predictions/history/:machineId/clear', clearPredictionHistory);
router.post('/predictions/history/:machineId/clear', clearPredictionHistory);
router.get('/history/:machineId', getPredictionHistory); // Fallback alias
router.get('/forecast/:machineId', getActiveForecast);
router.get('/dashboard/:machineId', getAIDashboard);
router.get('/recommendations/:machineId', getRecommendations);
router.get('/alerts/:machineId', getAIAlerts);

export default router;
