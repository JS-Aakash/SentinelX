import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum MachineStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  FAULT = 'fault',
}

export const PREDEFINED_MACHINE_TYPES = [
  'AC Motor',
  'DC Motor',
  'Pump',
  'Compressor',
  'Conveyor',
  'Generator',
  'CNC Machine',
  'Lathe',
  'Milling Machine',
  'Fan',
  'Turbine',
  'Gearbox',
  'Custom',
] as const;

export interface IOperatingLimits {
  maxTemperature?: number;
  maxVibration?: number;
  maxCurrent?: number;
  minRPM?: number;
}

export interface IMachine extends Document {
  _id: mongoose.Types.ObjectId;
  uuid: string;
  machineCode: string;
  name: string;
  type: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  manufacturingYear?: number;
  installationDate?: Date;
  plant?: string;
  department?: string;
  location?: string;
  status: MachineStatus;
  ratedRPM?: number;
  ratedVoltage?: number;
  ratedCurrent?: number;
  ratedTemperature?: number;
  ratedPower?: number;
  operatingLimits?: IOperatingLimits;
  description?: string;
  image?: string;
  tags: string[];
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OperatingLimitsSchema = new Schema<IOperatingLimits>(
  {
    maxTemperature: { type: Number, min: 0 },
    maxVibration: { type: Number, min: 0 },
    maxCurrent: { type: Number, min: 0 },
    minRPM: { type: Number, min: 0 },
  },
  { _id: false }
);

const MachineSchema = new Schema<IMachine>(
  {
    uuid: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    machineCode: {
      type: String,
      required: [true, 'Machine code is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true,
      maxlength: [150, 'Machine name cannot exceed 150 characters'],
    },
    type: {
      type: String,
      required: [true, 'Machine type is required'],
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: null,
    },
    modelNumber: {
      type: String,
      trim: true,
      default: null,
    },
    serialNumber: {
      type: String,
      trim: true,
      default: null,
    },
    manufacturingYear: {
      type: Number,
      min: [1900, 'Manufacturing year must be 1900 or later'],
      max: [new Date().getFullYear(), 'Manufacturing year cannot be in the future'],
      default: null,
    },
    installationDate: {
      type: Date,
      default: null,
    },
    plant: {
      type: String,
      trim: true,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(MachineStatus),
      default: MachineStatus.IDLE,
    },
    ratedRPM: { type: Number, min: 0, default: null },
    ratedVoltage: { type: Number, min: 0, default: null },
    ratedCurrent: { type: Number, min: 0, default: null },
    ratedTemperature: { type: Number, min: 0, default: null },
    ratedPower: { type: Number, min: 0, default: null },
    operatingLimits: {
      type: OperatingLimitsSchema,
      default: {},
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
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

// Compound unique index: machine code must be unique within a company
MachineSchema.index({ machineCode: 1, companyId: 1 }, { unique: true });
MachineSchema.index({ companyId: 1 });
MachineSchema.index({ type: 1 });
MachineSchema.index({ status: 1 });
MachineSchema.index({ companyId: 1, status: 1 });
MachineSchema.index({ companyId: 1, createdAt: -1 });

export const Machine = mongoose.model<IMachine>('Machine', MachineSchema);
