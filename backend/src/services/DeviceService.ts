import mongoose from 'mongoose';
import { deviceRepository, DeviceStats, DeviceListResult } from '../repositories/DeviceRepository';
import { sensorRepository } from '../repositories/SensorRepository';
import { IDevice } from '../models/Device';
import { ISensor, DEFAULT_ESP32_SENSORS } from '../models/Sensor';
import { ApiError } from '../utils/ApiError';
import { CreateDeviceInput, UpdateDeviceInput, GetDevicesQuery } from '../validators/device.validator';
import { machineRepository } from '../repositories/MachineRepository';

export class DeviceService {
  // ─── Create Device ───────────────────────────────────────────────────────────

  async createDevice(
    data: CreateDeviceInput,
    companyId: string,
    userId: string
  ): Promise<{ device: IDevice; sensors: ISensor[] }> {
    // Check deviceId uniqueness
    const existing = await deviceRepository.findByDeviceId(data.deviceId);
    if (existing) {
      throw ApiError.conflict(`Device with ID "${data.deviceId.toUpperCase()}" already exists`);
    }

    // If machineId provided, check if machine exists and has no assigned device
    if (data.machineId) {
      const machine = await machineRepository.findById(data.machineId, companyId);
      if (!machine) {
        throw ApiError.notFound('Assigned machine not found');
      }

      const existingAssigned = await deviceRepository.findByMachineId(data.machineId, companyId);
      if (existingAssigned) {
        throw ApiError.conflict(
          `Machine "${machine.name}" already has an assigned device (${existingAssigned.deviceId}). Unassign it first.`
        );
      }
    }

    const deviceData: Partial<IDevice> = {
      ...data,
      deviceId: data.deviceId.toUpperCase(),
      macAddress: data.macAddress ? data.macAddress.toUpperCase() : undefined,
      machineId: data.machineId ? new mongoose.Types.ObjectId(data.machineId) : null,
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    const device = await deviceRepository.create(deviceData);

    // Provision default 6 ESP32 sensors automatically
    const defaultSensors: Partial<ISensor>[] = DEFAULT_ESP32_SENSORS.map((s) => ({
      sensorName: s.sensorName,
      sensorId: `${device.deviceId}_${s.sensorIdSuffix}`,
      type: s.type,
      unit: s.unit,
      samplingInterval: s.samplingInterval,
      thresholds: s.thresholds,
      isEnabled: true,
      deviceId: device._id,
      machineId: device.machineId,
      companyId: new mongoose.Types.ObjectId(companyId),
    }));

    const sensors = await sensorRepository.createMany(defaultSensors);

    return { device, sensors };
  }

  // ─── Get Devices ─────────────────────────────────────────────────────────────

  async getDevices(companyId: string, query: GetDevicesQuery): Promise<DeviceListResult> {
    return deviceRepository.findAll(companyId, query);
  }

  // ─── Get Single Device with Sensors ─────────────────────────────────────────

  async getDeviceById(
    id: string,
    companyId: string
  ): Promise<{ device: IDevice; sensors: ISensor[] }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid device Object ID');
    }

    const device = await deviceRepository.findById(id, companyId);
    if (!device) {
      throw ApiError.notFound('Device not found');
    }

    const sensors = await sensorRepository.findByDeviceId(id, companyId);
    return { device, sensors };
  }

  // ─── Update Device ───────────────────────────────────────────────────────────

  async updateDevice(id: string, companyId: string, data: UpdateDeviceInput): Promise<IDevice> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid device ID');
    }

    if (data.deviceId) {
      const existing = await deviceRepository.findByDeviceId(data.deviceId);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict(`Device with ID "${data.deviceId.toUpperCase()}" already exists`);
      }
      data.deviceId = data.deviceId.toUpperCase();
    }

    if (data.machineId !== undefined && data.machineId !== null) {
      const machine = await machineRepository.findById(data.machineId, companyId);
      if (!machine) {
        throw ApiError.notFound('Assigned machine not found');
      }

      const existingAssigned = await deviceRepository.findByMachineId(data.machineId, companyId);
      if (existingAssigned && existingAssigned._id.toString() !== id) {
        throw ApiError.conflict(
          `Machine "${machine.name}" already has an assigned device (${existingAssigned.deviceId})`
        );
      }
    }

    const updateData: Partial<IDevice> = {
      ...data,
      macAddress: data.macAddress ? data.macAddress.toUpperCase() : undefined,
      machineId:
        data.machineId === null
          ? null
          : data.machineId
          ? new mongoose.Types.ObjectId(data.machineId)
          : undefined,
    };

    const device = await deviceRepository.update(id, companyId, updateData);
    if (!device) {
      throw ApiError.notFound('Device not found');
    }

    // Cascade machineId update to all child sensors
    if (data.machineId !== undefined) {
      await sensorRepository.updateMachineIdByDeviceId(id, companyId, data.machineId);
    }

    return device;
  }

  // ─── Delete Device ───────────────────────────────────────────────────────────

  async deleteDevice(id: string, companyId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid device ID');
    }

    const deleted = await deviceRepository.delete(id, companyId);
    if (!deleted) {
      throw ApiError.notFound('Device not found');
    }

    // Clean up child sensors
    await sensorRepository.deleteByDeviceId(id, companyId);
  }

  // ─── Assign Device to Machine ────────────────────────────────────────────────

  async assignDeviceToMachine(
    machineId: string,
    deviceId: string,
    companyId: string
  ): Promise<{ device: IDevice; sensors: ISensor[] }> {
    if (
      !mongoose.Types.ObjectId.isValid(machineId) ||
      !mongoose.Types.ObjectId.isValid(deviceId)
    ) {
      throw ApiError.badRequest('Invalid machine or device ID');
    }

    const machine = await machineRepository.findById(machineId, companyId);
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }

    // Check if machine already has an assigned device
    const existingForMachine = await deviceRepository.findByMachineId(machineId, companyId);
    if (existingForMachine && existingForMachine._id.toString() !== deviceId) {
      throw ApiError.conflict(
        `Machine "${machine.name}" already has assigned device ${existingForMachine.deviceId}. Remove it first.`
      );
    }

    const device = await deviceRepository.update(deviceId, companyId, {
      machineId: new mongoose.Types.ObjectId(machineId),
    });
    if (!device) {
      throw ApiError.notFound('Device not found');
    }

    await sensorRepository.updateMachineIdByDeviceId(deviceId, companyId, machineId);
    const sensors = await sensorRepository.findByDeviceId(deviceId, companyId);

    return { device, sensors };
  }

  // ─── Remove Device from Machine ──────────────────────────────────────────────

  async removeDeviceFromMachine(machineId: string, companyId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(machineId)) {
      throw ApiError.badRequest('Invalid machine ID');
    }

    const device = await deviceRepository.findByMachineId(machineId, companyId);
    if (!device) {
      throw ApiError.notFound('No device is currently assigned to this machine');
    }

    await deviceRepository.update(device._id.toString(), companyId, { machineId: null });
    await sensorRepository.updateMachineIdByDeviceId(device._id.toString(), companyId, null);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  async getStats(companyId: string): Promise<DeviceStats> {
    return deviceRepository.getStats(companyId);
  }
}

export const deviceService = new DeviceService();
