import mongoose, { Schema, Document } from 'mongoose';

export type DatasetStatus =
  | 'uploaded'
  | 'validated'
  | 'cleaned'
  | 'engineered'
  | 'ready_for_training';

export interface IValidationReport {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  missingValues: number;
  invalidValues: number;
  rejectedRows: number;
  errors: string[];
}

export interface ICleaningLog {
  removedDuplicates: number;
  interpolatedRows: number;
  rejectedRows: number;
  notes: string[];
  cleanedAt?: Date;
}

export interface IDataset extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  version: number;
  isActive: boolean;
  datasetName: string;
  originalFileName: string;
  originalFilePath: string;
  cleanedFilePath?: string | null;
  engineeredFilePath?: string | null;
  fileSizeBytes: number;
  rowCount: number;
  startDate?: Date | null;
  endDate?: Date | null;
  samplingInterval?: string | null;
  status: DatasetStatus;
  uploadedBy: mongoose.Types.ObjectId;
  validationReport: IValidationReport;
  cleaningLog: ICleaningLog;
  engineeredFeatures: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema = new Schema<IDataset>(
  {
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    datasetName: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    originalFilePath: {
      type: String,
      required: true,
    },
    cleanedFilePath: {
      type: String,
      default: null,
    },
    engineeredFilePath: {
      type: String,
      default: null,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      default: 0,
    },
    rowCount: {
      type: Number,
      required: true,
      default: 0,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    samplingInterval: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['uploaded', 'validated', 'cleaned', 'engineered', 'ready_for_training'],
      default: 'uploaded',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    validationReport: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      duplicateRows: { type: Number, default: 0 },
      missingValues: { type: Number, default: 0 },
      invalidValues: { type: Number, default: 0 },
      rejectedRows: { type: Number, default: 0 },
      errors: [{ type: String }],
    },
    cleaningLog: {
      removedDuplicates: { type: Number, default: 0 },
      interpolatedRows: { type: Number, default: 0 },
      rejectedRows: { type: Number, default: 0 },
      notes: [{ type: String }],
      cleanedAt: { type: Date },
    },
    engineeredFeatures: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Ensure index on machineId + version
DatasetSchema.index({ machineId: 1, version: 1 }, { unique: true });

export const Dataset = mongoose.model<IDataset>('Dataset', DatasetSchema);
