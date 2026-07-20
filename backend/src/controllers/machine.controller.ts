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
