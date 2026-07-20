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

    const machineData: Partial<IMachine> = {
      ...data,
      machineCode: data.machineCode.toUpperCase(),
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId),
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
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
}

export const machineService = new MachineService();
