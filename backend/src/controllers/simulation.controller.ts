import { Request, Response } from 'express';
import { SimulationService, SimulationProfile } from '../services/SimulationService';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const startSimulation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId, profile, speed, overrides } = req.body;
  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const session = await SimulationService.startSimulation({
    machineId,
    profile: profile as SimulationProfile,
    speed: speed ? Number(speed) : 1,
    overrides,
  });

  sendSuccess(res, 'Simulation started successfully', session);
});

export const pauseSimulation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.body;
  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const session = SimulationService.pauseSimulation(machineId);
  if (!session) {
    throw ApiError.notFound('No active simulation found for this machine');
  }

  sendSuccess(res, 'Simulation paused', session);
});

export const resumeSimulation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.body;
  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const session = SimulationService.resumeSimulation(machineId);
  if (!session) {
    throw ApiError.notFound('No simulation found to resume');
  }

  sendSuccess(res, 'Simulation resumed', session);
});

export const stopSimulation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.body;
  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const stopped = SimulationService.stopSimulation(machineId);
  if (!stopped) {
    throw ApiError.notFound('No active simulation running for this machine');
  }

  sendSuccess(res, 'Simulation stopped', { machineId, status: 'stopped' });
});

export const updateSensorOverrides = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId, overrides } = req.body;
  if (!machineId) {
    throw ApiError.badRequest('machineId is required');
  }

  const session = await SimulationService.updateSensorOverrides(machineId, overrides || {});
  sendSuccess(res, 'Sensor controls updated', session);
});

export const getSimulationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const machineId = Array.isArray(req.params.machineId) ? req.params.machineId[0] : req.params.machineId;
  if (!machineId || machineId === 'undefined' || machineId === 'null') {
    sendSuccess(res, 'Simulation status fetched', { machineId: machineId || '', status: 'inactive' });
    return;
  }
  const session = SimulationService.getSimulationStatus(machineId);
  sendSuccess(res, 'Simulation status fetched', session || { machineId, status: 'inactive' });
});

export const getActiveSimulations = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const sessions = SimulationService.getAllActiveSimulations();
  sendSuccess(res, 'Active simulations fetched', sessions);
});
