import mongoose from 'mongoose';
import { Device, IDevice, DeviceStatus } from '../models/Device';
import { GetDevicesQuery } from '../validators/device.validator';

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
}

export interface DeviceListResult {
  devices: IDevice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class DeviceRepository {
  async create(data: Partial<IDevice>): Promise<IDevice> {
    const device = new Device(data);
    return device.save();
  }

  async findById(id: string, companyId: string): Promise<IDevice | null> {
    return Device.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(companyId),
    }).populate('machineId', 'name machineCode plant department location status');
  }

  async findByDeviceId(deviceId: string): Promise<IDevice | null> {
    return Device.findOne({ deviceId: deviceId.toUpperCase() });
  }

  async findByMachineId(machineId: string, companyId: string): Promise<IDevice | null> {
    return Device.findOne({
      machineId: new mongoose.Types.ObjectId(machineId),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
  }

  async findAll(companyId: string, query: GetDevicesQuery): Promise<DeviceListResult> {
    const {
      search,
      status,
      machineId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '12',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: mongoose.FilterQuery<IDevice> = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { deviceId: { $regex: search, $options: 'i' } },
        { macAddress: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status as DeviceStatus;
    if (machineId) filter.machineId = new mongoose.Types.ObjectId(machineId);

    const sortField = sortBy === 'name' ? 'name' : sortBy === 'lastSeen' ? 'lastSeen' : 'createdAt';
    const sort: mongoose.SortOrder = sortOrder === 'asc' ? 1 : -1;

    const [devices, total] = await Promise.all([
      Device.find(filter)
        .sort({ [sortField]: sort })
        .skip(skip)
        .limit(limitNum)
        .populate('machineId', 'name machineCode plant department status'),
      Device.countDocuments(filter),
    ]);

    return {
      devices,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async update(id: string, companyId: string, data: Partial<IDevice>): Promise<IDevice | null> {
    return Device.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('machineId', 'name machineCode plant department status');
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await Device.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
    return result.deletedCount === 1;
  }

  async getStats(companyId: string): Promise<DeviceStats> {
    const stats = await Device.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: DeviceStats = { total: 0, online: 0, offline: 0, maintenance: 0 };
    for (const s of stats) {
      const key = s._id as DeviceStatus;
      result[key] = s.count;
      result.total += s.count;
    }
    return result;
  }
}

export const deviceRepository = new DeviceRepository();
