import { Request, Response } from 'express';
import { deviceService } from '../services/DeviceService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, ApiResponse } from '../utils/ApiResponse';

export const getDevices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await deviceService.getDevices(req.user!.companyId, req.query as Record<string, string>);
  new ApiResponse(res, 200, 'Devices retrieved successfully', result.devices)
    .withMeta({
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    })
    .send();
});

export const getDeviceStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const stats = await deviceService.getStats(req.user!.companyId);
  sendSuccess(res, 'Device stats retrieved successfully', stats);
});

export const getDeviceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const result = await deviceService.getDeviceById(id, req.user!.companyId);
  sendSuccess(res, 'Device retrieved successfully', result);
});

export const createDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await deviceService.createDevice(req.body, req.user!.companyId, req.user!.userId);
  sendCreated(res, 'Device created successfully with 6 standard sensors', result);
});

export const updateDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const device = await deviceService.updateDevice(id, req.user!.companyId, req.body);
  sendSuccess(res, 'Device updated successfully', device);
});

export const deleteDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  await deviceService.deleteDevice(id, req.user!.companyId);
  sendSuccess(res, 'Device deleted successfully');
});

export const assignDeviceToMachine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id: machineId } = req.params as Record<string, string>;
  const { deviceId } = req.body as { deviceId: string };
  const result = await deviceService.assignDeviceToMachine(machineId, deviceId, req.user!.companyId);
  sendSuccess(res, 'Device assigned to machine successfully', result);
});

export const removeDeviceFromMachine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id: machineId } = req.params as Record<string, string>;
  await deviceService.removeDeviceFromMachine(machineId, req.user!.companyId);
  sendSuccess(res, 'Device removed from machine successfully');
});
