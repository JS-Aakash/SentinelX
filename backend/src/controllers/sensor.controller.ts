import { Request, Response } from 'express';
import { sensorService } from '../services/SensorService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/ApiResponse';
import { ISensor } from '../models/Sensor';

export const getSensors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { deviceId, machineId } = req.query as Record<string, string>;
  let sensors: ISensor[] = [];
  if (deviceId) {
    sensors = await sensorService.getSensorsByDevice(deviceId, req.user!.companyId);
  } else if (machineId) {
    sensors = await sensorService.getSensorsByMachine(machineId, req.user!.companyId);
  }
  sendSuccess(res, 'Sensors retrieved successfully', sensors);
});

export const getSensorById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const sensor = await sensorService.getSensorById(id, req.user!.companyId);
  sendSuccess(res, 'Sensor retrieved successfully', sensor);
});

export const createSensor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sensor = await sensorService.createSensor(req.body, req.user!.companyId);
  sendCreated(res, 'Sensor created successfully', sensor);
});

export const updateSensor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const sensor = await sensorService.updateSensor(id, req.user!.companyId, req.body);
  sendSuccess(res, 'Sensor updated successfully', sensor);
});

export const deleteSensor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  await sensorService.deleteSensor(id, req.user!.companyId);
  sendSuccess(res, 'Sensor deleted successfully');
});
