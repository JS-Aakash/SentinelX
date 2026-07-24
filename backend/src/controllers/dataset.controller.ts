import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DatasetService } from '../services/DatasetService';
import { Dataset } from '../models/Dataset';
import { Machine } from '../models/Machine';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const uploadDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  const { machineId, datasetName } = req.body as Record<string, string>;

  if (!file) {
    throw ApiError.badRequest('No file uploaded. Please upload a CSV or XLSX file.');
  }

  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const companyId = req.user!.companyId.toString();

  const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found or does not belong to your company');
  }

  // 1. Parse file
  const rawRows = await DatasetService.parseUploadedFile(file.path);

  // 2. Validate columns & rows
  const validationResult = DatasetService.validateRawRows(rawRows);

  // 3. Determine version number
  const latestDataset = await Dataset.findOne({ machineId: machine._id })
    .sort({ version: -1 })
    .exec();

  const newVersion = latestDataset ? latestDataset.version + 1 : 1;

  const name = datasetName || `Dataset v${newVersion} (${file.originalname})`;

  const dataset = await Dataset.create({
    machineId: machine._id,
    companyId: req.user!.companyId,
    version: newVersion,
    isActive: true,
    datasetName: name,
    originalFileName: file.originalname,
    originalFilePath: file.path,
    fileSizeBytes: file.size,
    rowCount: rawRows.length,
    startDate: validationResult.startDate,
    endDate: validationResult.endDate,
    samplingInterval: validationResult.samplingInterval,
    status: 'validated',
    uploadedBy: req.user!.userId,
    validationReport: validationResult.report,
    cleaningLog: {
      removedDuplicates: 0,
      interpolatedRows: 0,
      rejectedRows: 0,
      notes: [],
    },
    engineeredFeatures: [],
  });

  sendCreated(res, `Dataset version ${newVersion} uploaded and validated successfully`, dataset);
});

export const getSampleTemplate = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const csvContent = DatasetService.generateSampleCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sentinelx_sample_dataset.csv"');
  res.status(200).send(csvContent);
});

export const getMachineDatasets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const datasets = await Dataset.find({ machineId, companyId })
    .populate('uploadedBy', 'name email')
    .sort({ version: -1 })
    .lean()
    .exec();

  sendSuccess(res, 'Machine datasets retrieved', datasets);
});

export const getDatasetById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId })
    .populate('uploadedBy', 'name email')
    .populate('machineId', 'name machineCode')
    .lean()
    .exec();

  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  sendSuccess(res, 'Dataset details retrieved', dataset);
});

export const getDatasetPreview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { type = 'original', page = '1', limit = '100', search = '' } = req.query as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId }).exec();
  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  let filePath = dataset.originalFilePath;
  if (type === 'cleaned' && dataset.cleanedFilePath) {
    filePath = dataset.cleanedFilePath;
  } else if (type === 'engineered' && dataset.engineeredFilePath) {
    filePath = dataset.engineeredFilePath;
  }

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound(`File for preview type '${type}' not found on server`);
  }

  const allRows = await DatasetService.parseUploadedFile(filePath);

  // Search filter
  let filteredRows = allRows;
  if (search.trim()) {
    const term = search.toLowerCase();
    filteredRows = allRows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(term))
    );
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
  const total = filteredRows.length;
  const totalPages = Math.ceil(total / limitNum);

  const startIndex = (pageNum - 1) * limitNum;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + limitNum);

  const columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];

  sendSuccess(res, 'Dataset preview retrieved', {
    type,
    columns,
    rows: paginatedRows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  });
});

export const cleanDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId }).exec();
  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  const updatedDataset = await DatasetService.cleanDataset(dataset._id.toString());
  sendSuccess(res, 'Dataset cleaned successfully', updatedDataset);
});

export const generateFeatures = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId }).exec();
  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  const updatedDataset = await DatasetService.engineerFeatures(dataset._id.toString());
  sendSuccess(res, 'Dataset feature engineering completed successfully', updatedDataset);
});

export const activateDatasetVersion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { isActive } = req.body as { isActive?: boolean };
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId }).exec();
  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  // Toggle or set isActive status without wiping other datasets in the training pool
  dataset.isActive = typeof isActive === 'boolean' ? isActive : !dataset.isActive;
  await dataset.save();

  sendSuccess(res, `Dataset version v${dataset.version} ${dataset.isActive ? 'added to' : 'removed from'} active training pool`, dataset);
});

export const deleteDataset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId }).exec();
  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  // Remove files
  try {
    if (fs.existsSync(dataset.originalFilePath)) fs.unlinkSync(dataset.originalFilePath);
    if (dataset.cleanedFilePath && fs.existsSync(dataset.cleanedFilePath)) fs.unlinkSync(dataset.cleanedFilePath);
    if (dataset.engineeredFilePath && fs.existsSync(dataset.engineeredFilePath)) fs.unlinkSync(dataset.engineeredFilePath);
  } catch {
    // non-fatal
  }

  const machineId = dataset.machineId;
  await dataset.deleteOne();

  // If active dataset was deleted, set highest remaining version as active
  const nextActive = await Dataset.findOne({ machineId }).sort({ version: -1 }).exec();
  if (nextActive) {
    nextActive.isActive = true;
    await nextActive.save();
  }

  sendSuccess(res, 'Dataset version deleted successfully');
});

export const downloadDatasetFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id, type } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const dataset = await Dataset.findOne({ _id: id, companyId }).exec();
  if (!dataset) {
    throw ApiError.notFound('Dataset not found');
  }

  let filePath = dataset.originalFilePath;
  let fileName = `original_v${dataset.version}_${dataset.originalFileName}`;

  if (type === 'clean' || type === 'cleaned') {
    if (!dataset.cleanedFilePath || !fs.existsSync(dataset.cleanedFilePath)) {
      throw ApiError.notFound('Cleaned dataset file not generated yet');
    }
    filePath = dataset.cleanedFilePath;
    fileName = `cleaned_v${dataset.version}_${dataset.originalFileName}`;
  } else if (type === 'engineered' || type === 'features') {
    if (!dataset.engineeredFilePath || !fs.existsSync(dataset.engineeredFilePath)) {
      throw ApiError.notFound('Engineered feature dataset not generated yet');
    }
    filePath = dataset.engineeredFilePath;
    fileName = `engineered_v${dataset.version}_${dataset.originalFileName}`;
  }

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('Dataset file missing on disk');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'text/csv');
  fs.createReadStream(filePath).pipe(res);
});
