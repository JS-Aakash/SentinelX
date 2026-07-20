import { Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { AIModel } from '../models/AIModel';
import { Machine } from '../models/Machine';
import { Dataset } from '../models/Dataset';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const trainModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.body as Record<string, string>;

  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const companyId = req.user!.companyId.toString();
  const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const model = await AIService.trainModel(machineId, req.user!.userId.toString(), false);
  sendCreated(res, `AI Model version v${model.modelVersion} trained successfully`, model);
});

export const retrainModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.body as Record<string, string>;

  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const companyId = req.user!.companyId.toString();
  const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const model = await AIService.trainModel(machineId, req.user!.userId.toString(), true);
  sendCreated(res, `AI Model version v${model.modelVersion} retrained successfully`, model);
});

export const getModelStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const activeModel = await AIModel.findOne({ machineId, companyId, isActive: true })
    .populate('datasetId', 'version datasetName rowCount')
    .populate('createdBy', 'name email')
    .lean()
    .exec();

  const activeDataset = await Dataset.findOne({ machineId, companyId, isActive: true })
    .lean()
    .exec();

  sendSuccess(res, 'Model status retrieved', {
    isTrained: !!activeModel,
    status: activeModel ? activeModel.status : 'not_trained',
    activeModel: activeModel || null,
    activeDataset: activeDataset || null,
  });
});

export const getModelHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const history = await AIModel.find({ machineId, companyId })
    .populate('datasetId', 'version datasetName')
    .populate('createdBy', 'name email')
    .sort({ modelVersion: -1 })
    .lean()
    .exec();

  sendSuccess(res, 'Model version history retrieved', history);
});

export const getModelReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { modelId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const model = await AIModel.findOne({ _id: modelId, companyId })
    .populate('datasetId', 'version datasetName rowCount originalFileName')
    .populate('createdBy', 'name email')
    .populate('machineId', 'name machineCode')
    .lean()
    .exec();

  if (!model) {
    throw ApiError.notFound('Model version not found');
  }

  sendSuccess(res, 'Model training report retrieved', model);
});

export const restoreModelVersion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { modelId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const model = await AIModel.findOne({ _id: modelId, companyId }).exec();
  if (!model) {
    throw ApiError.notFound('Model version not found');
  }

  await AIModel.updateMany({ machineId: model.machineId }, { isActive: false });
  model.isActive = true;
  await model.save();

  sendSuccess(res, `Model version v${model.modelVersion} restored as active model`, model);
});

export const deleteModelVersion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { modelId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const model = await AIModel.findOne({ _id: modelId, companyId }).exec();
  if (!model) {
    throw ApiError.notFound('Model version not found');
  }

  const machineId = model.machineId;
  await model.deleteOne();

  // If active version was deleted, set highest remaining version as active
  const nextActive = await AIModel.findOne({ machineId }).sort({ modelVersion: -1 }).exec();
  if (nextActive) {
    nextActive.isActive = true;
    await nextActive.save();
  }

  sendSuccess(res, 'Model version deleted successfully');
});
