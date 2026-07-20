import mongoose from 'mongoose';
import { sensorRepository } from '../repositories/SensorRepository';
import { ISensor } from '../models/Sensor';
import { ApiError } from '../utils/ApiError';
import { CreateSensorInput, UpdateSensorInput } from '../validators/sensor.validator';

export class SensorService {
  async createSensor(data: CreateSensorInput, companyId: string): Promise<ISensor> {
    if (!mongoose.Types.ObjectId.isValid(data.deviceId)) {
      throw ApiError.badRequest('Invalid device ID');
    }

    const sensorData: Partial<ISensor> = {
      ...data,
      sensorId: data.sensorId.toUpperCase(),
      deviceId: new mongoose.Types.ObjectId(data.deviceId),
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    return sensorRepository.create(sensorData);
  }

  async getSensorsByDevice(deviceId: string, companyId: string): Promise<ISensor[]> {
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw ApiError.badRequest('Invalid device ID');
    }
    return sensorRepository.findByDeviceId(deviceId, companyId);
  }

  async getSensorsByMachine(machineId: string, companyId: string): Promise<ISensor[]> {
    if (!mongoose.Types.ObjectId.isValid(machineId)) {
      throw ApiError.badRequest('Invalid machine ID');
    }
    return sensorRepository.findByMachineId(machineId, companyId);
  }

  async getSensorById(id: string, companyId: string): Promise<ISensor> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid sensor ID');
    }

    const sensor = await sensorRepository.findById(id, companyId);
    if (!sensor) {
      throw ApiError.notFound('Sensor not found');
    }
    return sensor;
  }

  async updateSensor(id: string, companyId: string, data: UpdateSensorInput): Promise<ISensor> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid sensor ID');
    }

    const currentSensor = await sensorRepository.findById(id, companyId);
    if (!currentSensor) {
      throw ApiError.notFound('Sensor not found');
    }

    const mergedThresholds: Record<string, number | undefined> = {
      ...currentSensor.thresholds,
    };

    if (data.thresholds) {
      for (const [key, val] of Object.entries(data.thresholds)) {
        if (val === null) {
          delete mergedThresholds[key];
        } else if (val !== undefined) {
          mergedThresholds[key] = val;
        }
      }
    }

    const updateData: Partial<ISensor> = {
      ...data,
      thresholds: mergedThresholds,
    };

    const updated = await sensorRepository.update(id, companyId, updateData);
    if (!updated) {
      throw ApiError.notFound('Sensor not found');
    }
    return updated;
  }

  async deleteSensor(id: string, companyId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid sensor ID');
    }

    const deleted = await sensorRepository.delete(id, companyId);
    if (!deleted) {
      throw ApiError.notFound('Sensor not found');
    }
  }
}

export const sensorService = new SensorService();
