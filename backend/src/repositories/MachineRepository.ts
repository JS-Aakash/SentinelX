import mongoose from 'mongoose';
import { Machine, IMachine, MachineStatus } from '../models/Machine';
import { GetMachinesQuery } from '../validators/machine.validator';

export interface MachineStats {
  total: number;
  active: number;
  idle: number;
  maintenance: number;
  offline: number;
  fault: number;
}

export interface MachineListResult {
  machines: IMachine[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MachineRepository {
  async create(data: Partial<IMachine>): Promise<IMachine> {
    const machine = new Machine(data);
    return machine.save();
  }

  async findById(id: string, companyId: string): Promise<IMachine | null> {
    return Machine.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(companyId),
    }).populate('createdBy', 'name email');
  }

  async findByCode(machineCode: string, companyId: string): Promise<IMachine | null> {
    return Machine.findOne({
      machineCode: machineCode.toUpperCase(),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
  }

  async findAll(companyId: string, query: GetMachinesQuery): Promise<MachineListResult> {
    const {
      search,
      type,
      status,
      plant,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '12',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: mongoose.FilterQuery<IMachine> = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { machineCode: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ];
    }
    if (type) filter.type = { $regex: type, $options: 'i' };
    if (status) filter.status = status as MachineStatus;
    if (plant) filter.plant = { $regex: plant, $options: 'i' };
    if (department) filter.department = { $regex: department, $options: 'i' };

    // Build sort
    const sortField = sortBy === 'name' ? 'name' : sortBy === 'installationDate' ? 'installationDate' : 'createdAt';
    const sort: mongoose.SortOrder = sortOrder === 'asc' ? 1 : -1;

    const [machines, total] = await Promise.all([
      Machine.find(filter)
        .sort({ [sortField]: sort })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name'),
      Machine.countDocuments(filter),
    ]);

    return {
      machines,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<IMachine>
  ): Promise<IMachine | null> {
    return Machine.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await Machine.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
    return result.deletedCount === 1;
  }

  async updateImage(id: string, companyId: string, imageUrl: string): Promise<IMachine | null> {
    return Machine.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      },
      { $set: { image: imageUrl } },
      { new: true }
    );
  }

  async getStats(companyId: string): Promise<MachineStats> {
    const stats = await Machine.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: MachineStats = {
      total: 0,
      active: 0,
      idle: 0,
      maintenance: 0,
      offline: 0,
      fault: 0,
    };

    for (const stat of stats) {
      const key = stat._id as MachineStatus;
      result[key] = stat.count;
      result.total += stat.count;
    }

    return result;
  }

  async getRecent(companyId: string, limit = 5): Promise<IMachine[]> {
    return Machine.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name machineCode type status image plant department createdAt');
  }

  async getDistinctValues(companyId: string, field: string): Promise<string[]> {
    const values = await Machine.distinct(field, {
      companyId: new mongoose.Types.ObjectId(companyId),
      [field]: { $ne: null, $exists: true },
    });
    return values.filter(Boolean).sort() as string[];
  }
}

export const machineRepository = new MachineRepository();
