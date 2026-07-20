import mongoose from 'mongoose';
import { Sensor, ISensor } from '../models/Sensor';

export class SensorRepository {
  async createMany(sensorsData: Partial<ISensor>[]): Promise<ISensor[]> {
    return Sensor.insertMany(sensorsData) as unknown as Promise<ISensor[]>;
  }

  async create(data: Partial<ISensor>): Promise<ISensor> {
    const sensor = new Sensor(data);
    return sensor.save();
  }

  async findById(id: string, companyId: string): Promise<ISensor | null> {
    return Sensor.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
  }

  async findByDeviceId(deviceId: string, companyId: string): Promise<ISensor[]> {
    return Sensor.find({
      deviceId: new mongoose.Types.ObjectId(deviceId),
      companyId: new mongoose.Types.ObjectId(companyId),
    }).sort({ createdAt: 1 });
  }

  async findByMachineId(machineId: string, companyId: string): Promise<ISensor[]> {
    return Sensor.find({
      machineId: new mongoose.Types.ObjectId(machineId),
      companyId: new mongoose.Types.ObjectId(companyId),
    }).sort({ createdAt: 1 });
  }

  async update(id: string, companyId: string, data: Partial<ISensor>): Promise<ISensor | null> {
    return Sensor.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async updateMachineIdByDeviceId(
    deviceId: string,
    companyId: string,
    machineId: string | null
  ): Promise<void> {
    await Sensor.updateMany(
      {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        companyId: new mongoose.Types.ObjectId(companyId),
      },
      {
        $set: {
          machineId: machineId ? new mongoose.Types.ObjectId(machineId) : null,
        },
      }
    );
  }

  async deleteByDeviceId(deviceId: string, companyId: string): Promise<number> {
    const res = await Sensor.deleteMany({
      deviceId: new mongoose.Types.ObjectId(deviceId),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
    return res.deletedCount;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const res = await Sensor.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });
    return res.deletedCount === 1;
  }
}

export const sensorRepository = new SensorRepository();
