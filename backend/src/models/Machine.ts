import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum MachineStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  FAULT = 'fault',
}

export enum AILifecycleStatus {
  REGISTERED = 'registered',
  COLLECTING_DATA = 'collecting_data',
  READY_FOR_TRAINING = 'ready_for_training',
  TRAINING = 'training',
  AI_READY = 'ai_ready',
  RETRAINING_RECOMMENDED = 'retraining_recommended',
}

export enum DataSourcePreference {
  UPLOAD_HISTORICAL = 'upload_historical',
  COLLECT_LIVE = 'collect_live',
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
  failureTemperature?: number;
  failureVibration?: number;
  failureCurrent?: number;
}

export interface ILiveDataCollection {
  collectedSampleCount: number;
  collectionStartDate?: Date;
  lastReadingTimestamp?: Date;
  recommendedSamplesThreshold: number;
  newSamplesSinceLastTraining: number;
}

export interface IDigitalTwin {
  hasModel: boolean;
  modelName?: string | null;
  modelUrl?: string | null;
  modelFormat?: string | null;
  modelSize?: number;
  uploadedAt?: Date | null;
  uploadedBy?: mongoose.Types.ObjectId | null;
  version: number;
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
  commissioningDate?: Date;
  lastMaintenanceDate?: Date;
  lastMajorOverhaulDate?: Date;
  plant?: string;
  department?: string;
  location?: string;
  status: MachineStatus;
  aiLifecycleStatus: AILifecycleStatus;
  dataSourcePreference: DataSourcePreference;
  isRecording: boolean;
  liveDataCollection: ILiveDataCollection;
  digitalTwin: IDigitalTwin;
  simulationConfig?: ISimulationConfig;
  ratedRPM?: number;
  ratedVoltage?: number;
  ratedCurrent?: number;
  ratedTemperature?: number;
  ratedPower?: number;
  ratedSound?: number;
  ratedVibration?: number;
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
    failureTemperature: { type: Number, min: 0 },
    failureVibration: { type: Number, min: 0 },
    failureCurrent: { type: Number, min: 0 },
  },
  { _id: false }
);

export interface ISimulationConfig {
  isRunning: boolean;
  isPaused: boolean;
  profile: string;
  speed: number;
  overrides?: Record<string, any>;
}

const SimulationConfigSchema = new Schema<ISimulationConfig>(
  {
    isRunning: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    profile: { type: String, default: 'normal_operation' },
    speed: { type: Number, default: 1 },
    overrides: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const DigitalTwinSchema = new Schema<IDigitalTwin>(
  {
    hasModel: { type: Boolean, default: false },
    modelName: { type: String, default: null },
    modelUrl: { type: String, default: null },
    modelFormat: { type: String, default: null },
    modelSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 1 },
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
    commissioningDate: {
      type: Date,
      default: null,
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    lastMajorOverhaulDate: {
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
    aiLifecycleStatus: {
      type: String,
      enum: Object.values(AILifecycleStatus),
      default: AILifecycleStatus.REGISTERED,
    },
    dataSourcePreference: {
      type: String,
      enum: Object.values(DataSourcePreference),
      default: DataSourcePreference.COLLECT_LIVE,
    },
    isRecording: {
      type: Boolean,
      default: false,
    },
    liveDataCollection: {
      collectedSampleCount: { type: Number, default: 0 },
      collectionStartDate: { type: Date, default: null },
      lastReadingTimestamp: { type: Date, default: null },
      recommendedSamplesThreshold: { type: Number, default: 10000 },
      newSamplesSinceLastTraining: { type: Number, default: 0 },
    },
    digitalTwin: {
      type: DigitalTwinSchema,
      default: {
        hasModel: false,
        modelName: null,
        modelUrl: null,
        modelFormat: null,
        modelSize: 0,
        uploadedAt: null,
        uploadedBy: null,
        version: 1,
      },
    },
    simulationConfig: {
      type: SimulationConfigSchema,
      default: {
        isRunning: false,
        isPaused: false,
        profile: 'normal_operation',
        speed: 1,
        overrides: {},
      },
    },
    ratedRPM: { type: Number, min: 0, default: null },
    ratedVoltage: { type: Number, min: 0, default: null },
    ratedCurrent: { type: Number, min: 0, default: null },
    ratedTemperature: { type: Number, min: 0, default: null },
    ratedPower: { type: Number, min: 0, default: null },
    ratedSound: { type: Number, min: 0, default: null },
    ratedVibration: { type: Number, min: 0, default: null },
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
