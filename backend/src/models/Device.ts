import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

export enum DeviceType {
  ESP32 = 'ESP32',
  CUSTOM = 'Custom',
}

export interface IDevice extends Document {
  _id: mongoose.Types.ObjectId;
  uuid: string;
  name: string;
  deviceId: string;
  type: DeviceType | string;
  firmwareVersion?: string;
  macAddress?: string;
  serialNumber?: string;
  status: DeviceStatus;
  lastSeen?: Date;
  machineId?: mongoose.Types.ObjectId | null;
  companyId: mongoose.Types.ObjectId;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    uuid: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
      maxlength: [150, 'Device name cannot exceed 150 characters'],
    },
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    type: {
      type: String,
      default: DeviceType.ESP32,
      trim: true,
    },
    firmwareVersion: {
      type: String,
      trim: true,
      default: 'v1.0.0',
    },
    macAddress: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    serialNumber: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(DeviceStatus),
      default: DeviceStatus.OFFLINE,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
      default: null,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ID is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DeviceSchema.index({ companyId: 1 });
DeviceSchema.index({ machineId: 1 });
DeviceSchema.index({ companyId: 1, status: 1 });
DeviceSchema.index({ companyId: 1, createdAt: -1 });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
