import { machineRepository, MachineStats, MachineListResult } from '../repositories/MachineRepository';
import { IMachine } from '../models/Machine';
import { ApiError } from '../utils/ApiError';
import { CreateMachineInput, UpdateMachineInput, GetMachinesQuery } from '../validators/machine.validator';
import mongoose from 'mongoose';

export class MachineService {
  // ─── Create ─────────────────────────────────────────────────────────────────

  async createMachine(
    data: CreateMachineInput,
    companyId: string,
    userId: string
  ): Promise<IMachine> {
    // Check machine code uniqueness within company
    const existing = await machineRepository.findByCode(data.machineCode, companyId);
    if (existing) {
      throw ApiError.conflict(
        `Machine with code "${data.machineCode.toUpperCase()}" already exists in your company`
      );
    }

    const { DEFAULT_SENSOR_CONFIGS } = await import('../models/Machine');

    const machineData: Partial<IMachine> = {
      ...data,
      machineCode: data.machineCode.toUpperCase(),
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId),
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
      sensors: (data as any).sensors && (data as any).sensors.length > 0 ? (data as any).sensors : DEFAULT_SENSOR_CONFIGS,
    };

    return machineRepository.create(machineData);
  }

  // ─── Get All ─────────────────────────────────────────────────────────────────

  async getMachines(companyId: string, query: GetMachinesQuery): Promise<MachineListResult> {
    return machineRepository.findAll(companyId, query);
  }

  // ─── Get One ─────────────────────────────────────────────────────────────────

  async getMachineById(id: string, companyId: string): Promise<IMachine> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid machine ID');
    }

    const machine = await machineRepository.findById(id, companyId);
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }

    if (!machine.sensors || machine.sensors.length === 0) {
      const { DEFAULT_SENSOR_CONFIGS } = await import('../models/Machine');
      machine.sensors = DEFAULT_SENSOR_CONFIGS;
    }

    return machine;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async updateMachine(
    id: string,
    companyId: string,
    data: UpdateMachineInput
  ): Promise<IMachine> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid machine ID');
    }

    // If changing machine code, ensure uniqueness
    if (data.machineCode) {
      const existing = await machineRepository.findByCode(data.machineCode, companyId);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict(
          `Machine with code "${data.machineCode.toUpperCase()}" already exists in your company`
        );
      }
      data.machineCode = data.machineCode.toUpperCase();
    }

    const updateData: Partial<IMachine> = {
      ...data,
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
    };

    const machine = await machineRepository.update(id, companyId, updateData);
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }
    return machine;
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async deleteMachine(id: string, companyId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid machine ID');
    }

    const deleted = await machineRepository.delete(id, companyId);
    if (!deleted) {
      throw ApiError.notFound('Machine not found');
    }
  }

  // ─── Upload Image ────────────────────────────────────────────────────────────

  async updateMachineImage(id: string, companyId: string, imageUrl: string): Promise<IMachine> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid machine ID');
    }

    const machine = await machineRepository.updateImage(id, companyId, imageUrl);
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }
    return machine;
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  async getStats(companyId: string): Promise<MachineStats> {
    return machineRepository.getStats(companyId);
  }

  // ─── Recent ──────────────────────────────────────────────────────────────────

  async getRecentMachines(companyId: string, limit = 5): Promise<IMachine[]> {
    return machineRepository.getRecent(companyId, limit);
  }

  // ─── Filter Metadata ─────────────────────────────────────────────────────────

  async getFilterOptions(companyId: string): Promise<{
    types: string[];
    plants: string[];
    departments: string[];
  }> {
    const [types, plants, departments] = await Promise.all([
      machineRepository.getDistinctValues(companyId, 'type'),
      machineRepository.getDistinctValues(companyId, 'plant'),
      machineRepository.getDistinctValues(companyId, 'department'),
    ]);
    return { types, plants, departments };
  }

  // ─── Digital Twin 3D Model ───────────────────────────────────────────────────

  async uploadDigitalTwin(
    machineId: string,
    companyId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<IMachine> {
    const machine = await this.getMachineById(machineId, companyId);
    const path = require('path');
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    const modelUrl = `/uploads/digital-twins/${file.filename}`;

    const currentVersion = machine.digitalTwin?.version ?? 1;

    machine.digitalTwin = {
      hasModel: true,
      modelName: file.originalname,
      modelUrl,
      modelFormat: ext.toUpperCase(),
      modelSize: file.size,
      uploadedAt: new Date(),
      uploadedBy: new mongoose.Types.ObjectId(userId),
      version: currentVersion,
    };

    await machine.save();
    return machine;
  }

  async getDigitalTwin(machineId: string, companyId: string) {
    const machine = await this.getMachineById(machineId, companyId);
    return machine.digitalTwin || {
      hasModel: false,
      modelName: null,
      modelUrl: null,
      modelFormat: null,
      modelSize: 0,
      uploadedAt: null,
      uploadedBy: null,
      version: 1,
    };
  }

  async deleteDigitalTwin(machineId: string, companyId: string): Promise<IMachine> {
    const machine = await this.getMachineById(machineId, companyId);
    if (!machine.digitalTwin?.hasModel) {
      throw ApiError.badRequest('Machine does not have an uploaded 3D digital twin model');
    }

    // Try deleting physical file from disk if local path
    if (machine.digitalTwin.modelUrl?.startsWith('/uploads/')) {
      try {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), machine.digitalTwin.modelUrl);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (e) {
        console.warn('[MachineService] Failed to delete digital twin file:', e);
      }
    }

    machine.digitalTwin = {
      hasModel: false,
      modelName: null,
      modelUrl: null,
      modelFormat: null,
      modelSize: 0,
      uploadedAt: null,
      uploadedBy: null,
      version: (machine.digitalTwin.version || 1),
    };

    await machine.save();
    return machine;
  }

  async replaceDigitalTwin(
    machineId: string,
    companyId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<IMachine> {
    const machine = await this.getMachineById(machineId, companyId);
    const path = require('path');
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    const modelUrl = `/uploads/digital-twins/${file.filename}`;

    // Clean up old file if exists
    if (machine.digitalTwin?.modelUrl?.startsWith('/uploads/')) {
      try {
        const fs = require('fs');
        const localPath = path.join(process.cwd(), machine.digitalTwin.modelUrl);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (e) {
        console.warn('[MachineService] Failed to cleanup old digital twin file:', e);
      }
    }

    const newVersion = (machine.digitalTwin?.version || 0) + 1;

    machine.digitalTwin = {
      hasModel: true,
      modelName: file.originalname,
      modelUrl,
      modelFormat: ext.toUpperCase(),
      modelSize: file.size,
      uploadedAt: new Date(),
      uploadedBy: new mongoose.Types.ObjectId(userId),
      version: newVersion,
    };

    await machine.save();
    return machine;
  }
}

export const machineService = new MachineService();

