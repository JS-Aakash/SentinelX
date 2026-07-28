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

// ─── Save Current Live Recording Progress as Bundled Dataset ─────────────────
// Converts the current partial recording (e.g. 5000/10000 samples) into a
// persisted Dataset document (cleaned + feature engineered), then resets the
// live recording counter to 0 so collection restarts fresh.

export const saveProgressAsDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { Machine, AILifecycleStatus } = await import('../models/Machine');
  const { DatasetService } = await import('../services/DatasetService');
  const fs = await import('fs');

  const machine = await Machine.findOne({ _id: id, companyId: req.user!.companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const filePath = DatasetService.getLiveDatasetFilePath(machine._id.toString());
  if (!fs.existsSync(filePath)) {
    throw ApiError.badRequest('No live recorded data exists yet. Turn on data collection first.');
  }

  // Check there are enough rows
  const rawRows = await DatasetService.parseUploadedFile(filePath);
  if (!rawRows || rawRows.length < 5) {
    throw ApiError.badRequest(`Not enough data to save: only ${rawRows?.length ?? 0} samples recorded. Minimum 5 required.`);
  }

  // 1. Register the current live CSV as a proper Dataset document
  const dataset = await DatasetService.registerDatasetFromLiveRecording(
    machine._id.toString(),
    req.user!.userId
  );

  // 2. Reset the live recording counter + clear the live CSV file so collection restarts at 0
  DatasetService.clearLiveDatasetFile(machine._id.toString());

  machine.liveDataCollection = {
    collectedSampleCount: 0,
    collectionStartDate: machine.isRecording ? new Date() : machine.liveDataCollection?.collectionStartDate,
    lastReadingTimestamp: machine.liveDataCollection?.lastReadingTimestamp,
    recommendedSamplesThreshold: machine.liveDataCollection?.recommendedSamplesThreshold || 10000,
    newSamplesSinceLastTraining: 0,
  };

  // If machine was already at ready_for_training or ai_ready, keep it, otherwise set collecting_data
  if (
    machine.aiLifecycleStatus !== AILifecycleStatus.AI_READY &&
    machine.aiLifecycleStatus !== AILifecycleStatus.READY_FOR_TRAINING
  ) {
    machine.aiLifecycleStatus = machine.isRecording
      ? AILifecycleStatus.COLLECTING_DATA
      : AILifecycleStatus.REGISTERED;
  }

  await machine.save();

  sendSuccess(res, `Dataset v${dataset.version} saved successfully (${rawRows.length} samples). Collection counter reset to 0.`, {
    machine,
    dataset: {
      _id: dataset._id,
      version: dataset.version,
      datasetName: dataset.datasetName,
      rowCount: dataset.rowCount,
      status: dataset.status,
      engineeredFilePath: !!dataset.engineeredFilePath,
    },
  });
});

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

  const { datasetIds } = req.body as { datasetIds?: string[] };

  try {
    // 1. Convert live recorded CSV into engineered Dataset document if present
    try {
      await DatasetService.registerDatasetFromLiveRecording(machine._id.toString(), req.user!.userId);
    } catch {}

    // 2. Train per-machine model suite (XGBoost + Isolation Forest)
    const aiModel = await AIService.trainModel(machine._id.toString(), req.user!.userId, false, datasetIds);

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

// ─── Digital Twin 3D Model ───────────────────────────────────────────────────

export const uploadDigitalTwinModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  if (!req.file) {
    throw ApiError.badRequest('No 3D model file provided. Supported formats: .glb, .gltf, .fbx, .obj');
  }
  const machine = await machineService.uploadDigitalTwin(id, req.user!.companyId, req.file, req.user!.userId);
  sendSuccess(res, '3D Digital Twin model uploaded successfully', machine);
});

export const getDigitalTwinModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const digitalTwin = await machineService.getDigitalTwin(id, req.user!.companyId);
  sendSuccess(res, 'Digital twin model metadata retrieved successfully', digitalTwin);
});

export const deleteDigitalTwinModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const machine = await machineService.deleteDigitalTwin(id, req.user!.companyId);
  sendSuccess(res, '3D Digital Twin model deleted successfully', machine);
});

export const replaceDigitalTwinModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  if (!req.file) {
    throw ApiError.badRequest('No 3D model file provided for replacement');
  }
  const machine = await machineService.replaceDigitalTwin(id, req.user!.companyId, req.file, req.user!.userId);
  sendSuccess(res, '3D Digital Twin model replaced successfully', machine);
});

