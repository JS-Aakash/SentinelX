import { Request, Response } from 'express';
import { InferenceService } from '../services/InferenceService';
import { LiveSensorService } from '../services/LiveSensorService';
import { PredictionHistory } from '../models/PredictionHistory';
import { AIModel } from '../models/AIModel';
import { Dataset } from '../models/Dataset';
import { Machine } from '../models/Machine';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const triggerLiveInference = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  // Get latest telemetry reading from LiveSensorService, with fallback to machine specs
  const latestTelemetry = await LiveSensorService.getLiveTelemetry(machineId, companyId);

  const temperature = (latestTelemetry && latestTelemetry.temperature !== null) ? latestTelemetry.temperature : (machine.ratedTemperature || 42.5);
  const vibration = (latestTelemetry && latestTelemetry.vibration !== null) ? latestTelemetry.vibration : 0.12;
  const current = (latestTelemetry && latestTelemetry.current !== null) ? latestTelemetry.current : (machine.ratedCurrent || 3.5);
  const voltage = (latestTelemetry && latestTelemetry.voltage !== null) ? latestTelemetry.voltage : (machine.ratedVoltage || 230.0);
  const rpm = (latestTelemetry && latestTelemetry.rpm !== null) ? latestTelemetry.rpm : (machine.ratedRPM || 1480);
  const sound = (latestTelemetry && latestTelemetry.sound !== null) ? latestTelemetry.sound : 62.0;

  const result = await InferenceService.processLiveInference({
    machineId,
    companyId,
    temperature,
    vibration,
    current,
    voltage,
    rpm,
    sound,
    timestamp: new Date(),
  });

  sendSuccess(res, 'Live AI inference completed successfully', result);
});

export const getLatestPrediction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const latestPrediction = await PredictionHistory.findOne({ machineId, companyId })
    .sort({ timestamp: -1 })
    .lean()
    .exec();

  sendSuccess(res, 'Latest prediction retrieved', latestPrediction || null);
});

export const getPredictionHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));

  const total = await PredictionHistory.countDocuments({ machineId, companyId });
  const history = await PredictionHistory.find({ machineId, companyId })
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean()
    .exec();

  sendSuccess(res, 'Prediction history retrieved', {
    history,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

export const getActiveForecast = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const latestPrediction = await PredictionHistory.findOne({ machineId, companyId })
    .sort({ timestamp: -1 })
    .lean()
    .exec();

  if (!latestPrediction) {
    sendSuccess(res, 'No active forecast available', {
      machineId,
      forecastTrajectory: [],
      rsotFormatted: 'Safe (> 100 steps)',
    });
    return;
  }

  sendSuccess(res, 'Active forecast trajectory retrieved', {
    machineId,
    modelVersion: latestPrediction.modelVersion,
    timestamp: latestPrediction.timestamp,
    rsotSeconds: latestPrediction.rsotSeconds,
    rsotFormatted: latestPrediction.rsotFormatted,
    violatingSensor: latestPrediction.violatingSensor,
    breachStep: latestPrediction.breachStep,
    forecastTrajectory: latestPrediction.forecastTrajectory || [],
  });
});

export const getAIDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const machine = await Machine.findOne({ _id: machineId, companyId }).lean().exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const activeModel = await AIModel.findOne({ machineId, companyId, isActive: true })
    .populate('datasetId', 'version datasetName rowCount')
    .lean()
    .exec();

  const activeDataset = await Dataset.findOne({ machineId, companyId, isActive: true }).lean().exec();

  const latestPrediction = await PredictionHistory.findOne({ machineId, companyId })
    .sort({ timestamp: -1 })
    .lean()
    .exec();

  const recommendations = latestPrediction?.recommendations || [];

  sendSuccess(res, 'AI Dashboard aggregated data retrieved', {
    machine: {
      _id: machine._id,
      name: machine.name,
      machineCode: machine.machineCode,
      operatingLimits: machine.operatingLimits || {},
    },
    isModelReady: !!activeModel && activeModel.status === 'ready',
    activeModel: activeModel || null,
    activeDataset: activeDataset || null,
    latestPrediction: latestPrediction || null,
    recommendations,
  });
});

export const getRecommendations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const latestPrediction = await PredictionHistory.findOne({ machineId, companyId })
    .sort({ timestamp: -1 })
    .lean()
    .exec();

  sendSuccess(res, 'Recommendations retrieved', latestPrediction?.recommendations || []);
});

export const getAIAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const alertsLog = await PredictionHistory.find({
    machineId,
    companyId,
    $or: [{ healthScore: { $lt: 75 } }, { isAnomaly: true }, { rsotSeconds: { $ne: null } }],
  })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean()
    .exec();

  sendSuccess(res, 'AI alerts log retrieved', alertsLog);
});
