import { Request, Response } from 'express';
import { machineService } from '../services/MachineService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { PREDEFINED_MACHINE_TYPES } from '../models/Machine';

// ─── List Machines ────────────────────────────────────────────────────────────

export const getMachines = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await machineService.getMachines(req.user!.companyId, req.query as Record<string, string>);
  new ApiResponse(res, 200, 'Machines retrieved successfully', result.machines)
    .withMeta({
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    })
    .send();
});

// ─── Get Stats ────────────────────────────────────────────────────────────────

export const getMachineStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const stats = await machineService.getStats(req.user!.companyId);
  sendSuccess(res, 'Machine stats retrieved successfully', stats);
});

// ─── Get Recent ───────────────────────────────────────────────────────────────

export const getRecentMachines = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt((req.query as Record<string, string>)['limit'] ?? '5', 10) || 5;
  const machines = await machineService.getRecentMachines(req.user!.companyId, limit);
  sendSuccess(res, 'Recent machines retrieved successfully', machines);
});

// ─── Get Machine Types ────────────────────────────────────────────────────────

export const getMachineTypes = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 'Machine types retrieved successfully', PREDEFINED_MACHINE_TYPES);
});

// ─── Get Filter Options ───────────────────────────────────────────────────────

export const getFilterOptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const options = await machineService.getFilterOptions(req.user!.companyId);
  sendSuccess(res, 'Filter options retrieved successfully', options);
});

// ─── Get Single Machine ───────────────────────────────────────────────────────

export const getMachineById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const machine = await machineService.getMachineById(id, req.user!.companyId);
  sendSuccess(res, 'Machine retrieved successfully', machine);
});

// ─── Create Machine ───────────────────────────────────────────────────────────

export const createMachine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const machine = await machineService.createMachine(
    req.body,
    req.user!.companyId,
    req.user!.userId
  );
  sendCreated(res, 'Machine created successfully', machine);
});

// ─── Update Machine ───────────────────────────────────────────────────────────

export const updateMachine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const machine = await machineService.updateMachine(id, req.user!.companyId, req.body);
  sendSuccess(res, 'Machine updated successfully', machine);
});

// ─── Delete Machine ───────────────────────────────────────────────────────────

export const deleteMachine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  await machineService.deleteMachine(id, req.user!.companyId);
  sendSuccess(res, 'Machine deleted successfully');
});

// ─── Upload Machine Image ─────────────────────────────────────────────────────

export const uploadMachineImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw ApiError.badRequest('No image file provided');
  }
  const { id } = req.params as Record<string, string>;
  const imageUrl = req.file.path; // Cloudinary secure URL
  const machine = await machineService.updateMachineImage(id, req.user!.companyId, imageUrl);
  sendSuccess(res, 'Machine image uploaded successfully', machine);
});

// ─── Toggle Data Recording ON / OFF ──────────────────────────────────────────

export const toggleDataRecording = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { isRecording } = req.body;
  const { Machine } = await import('../models/Machine');

  const machine = await Machine.findOne({ _id: id, companyId: req.user!.companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  machine.isRecording = Boolean(isRecording);

  if (machine.isRecording && !machine.liveDataCollection?.collectionStartDate) {
    if (!machine.liveDataCollection) {
      machine.liveDataCollection = {
        collectedSampleCount: 0,
        recommendedSamplesThreshold: 10000,
        newSamplesSinceLastTraining: 0,
      };
    }
    machine.liveDataCollection.collectionStartDate = new Date();
  }

  await machine.save();
  sendSuccess(res, `Data recording turned ${machine.isRecording ? 'ON' : 'OFF'}`, machine);
});

// ─── Update AI Lifecycle Status / Data Source Preference ─────────────────────

export const updateAILifecycleStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { aiLifecycleStatus, dataSourcePreference } = req.body;
  const { Machine } = await import('../models/Machine');

  const machine = await Machine.findOne({ _id: id, companyId: req.user!.companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  if (aiLifecycleStatus) machine.aiLifecycleStatus = aiLifecycleStatus;
  if (dataSourcePreference) machine.dataSourcePreference = dataSourcePreference;

  await machine.save();
  sendSuccess(res, 'Machine AI settings updated', machine);
});

// ─── Clear Recorded Live Dataset ─────────────────────────────────────────────

export const clearMachineLiveDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { Machine, AILifecycleStatus } = await import('../models/Machine');
  const { DatasetService } = await import('../services/DatasetService');

  const machine = await Machine.findOne({ _id: id, companyId: req.user!.companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  DatasetService.clearLiveDatasetFile(machine._id.toString());

  machine.liveDataCollection = {
    collectedSampleCount: 0,
    collectionStartDate: undefined,
    lastReadingTimestamp: machine.liveDataCollection?.lastReadingTimestamp,
    recommendedSamplesThreshold: machine.liveDataCollection?.recommendedSamplesThreshold || 10000,
    newSamplesSinceLastTraining: 0,
  };
  machine.aiLifecycleStatus = AILifecycleStatus.REGISTERED;

  await machine.save();
  sendSuccess(res, 'Recorded live dataset cleared successfully', machine);
});

// ─── Download Recorded Live Dataset CSV ──────────────────────────────────────

export const downloadMachineLiveDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { Machine } = await import('../models/Machine');
  const { DatasetService } = await import('../services/DatasetService');
  const fs = await import('fs');

  const machine = await Machine.findOne({ _id: id, companyId: req.user!.companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const filePath = DatasetService.getLiveDatasetFilePath(machine._id.toString());
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('No recorded live dataset file found for this machine');
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=live_dataset_${machine.machineCode}.csv`);
  fs.createReadStream(filePath).pipe(res);
});

// ─── Train AI Model from Recorded Live Dataset ────────────────────────────────

export const trainFromLiveDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { Machine, AILifecycleStatus } = await import('../models/Machine');
  const { DatasetService } = await import('../services/DatasetService');
  const { AIService } = await import('../services/AIService');

  const machine = await Machine.findOne({ _id: id, companyId: req.user!.companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  machine.aiLifecycleStatus = AILifecycleStatus.TRAINING;
  await machine.save();

  try {
    // 1. Convert live recorded CSV into engineered Dataset document
    await DatasetService.registerDatasetFromLiveRecording(machine._id.toString(), req.user!.userId);

    // 2. Train per-machine model suite (XGBoost + Isolation Forest)
    const aiModel = await AIService.trainModel(machine._id.toString(), req.user!.userId);

    // 3. Update machine state to ai_ready
    machine.aiLifecycleStatus = AILifecycleStatus.AI_READY;
    if (machine.liveDataCollection) {
      machine.liveDataCollection.newSamplesSinceLastTraining = 0;
    }
    await machine.save();

    sendSuccess(res, 'AI Model trained successfully on live recorded dataset', { machine, aiModel });
  } catch (err: any) {
    machine.aiLifecycleStatus = AILifecycleStatus.READY_FOR_TRAINING;
    await machine.save();
    throw ApiError.internal(`AI Model Training failed: ${err.message}`);
  }
});

