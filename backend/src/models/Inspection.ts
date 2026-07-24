import mongoose, { Document, Schema } from 'mongoose';

export enum InspectionType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export enum InspectionItemStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
  NA = 'na',
}

export interface IChecklistItem {
  parameter: string;
  status: InspectionItemStatus;
  value?: string;
  remarks?: string;
}

export interface IInspection extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  type: InspectionType;
  scheduledDate: Date;
  completedDate?: Date;
  inspectorId: mongoose.Types.ObjectId;
  checklist: IChecklistItem[];
  overallResult: 'pass' | 'fail' | 'warning';
  remarks?: string;
  signatureName?: string;
  ipfsCid?: string;
  ipfsUrl?: string;
  blockchainTxHash?: string;
  blockchainVerified?: boolean;
  documents: { name: string; ipfsCid: string; ipfsUrl: string; uploadedAt: Date }[];
  calibrationRecords?: {
    sensorName: string;
    calibrationDate: Date;
    technicianName: string;
    certificateCid?: string;
    deviation?: number;
    nextCalibrationDate: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    parameter: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(InspectionItemStatus),
      default: InspectionItemStatus.NA,
    },
    value: { type: String, default: null },
    remarks: { type: String, default: null },
  },
  { _id: false }
);

const InspectionSchema = new Schema<IInspection>(
  {
    machineId: { type: Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: { type: String, enum: Object.values(InspectionType), required: true },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date, default: null },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checklist: { type: [ChecklistItemSchema], default: [] },
    overallResult: { type: String, enum: ['pass', 'fail', 'warning'], default: 'pass' },
    remarks: { type: String, default: null },
    signatureName: { type: String, default: null },
    ipfsCid: { type: String, default: null },
    ipfsUrl: { type: String, default: null },
    blockchainTxHash: { type: String, default: null },
    blockchainVerified: { type: Boolean, default: false },
    documents: [
      {
        name: { type: String },
        ipfsCid: { type: String },
        ipfsUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    calibrationRecords: [
      {
        sensorName: { type: String },
        calibrationDate: { type: Date },
        technicianName: { type: String },
        certificateCid: { type: String, default: null },
        deviation: { type: Number, default: null },
        nextCalibrationDate: { type: Date },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Default checklist parameters
export const DEFAULT_CHECKLIST_PARAMS = [
  'Temperature',
  'Vibration',
  'Current',
  'RPM',
  'Lubrication',
  'Alignment',
  'Leakage',
  'Electrical',
  'Mechanical',
];

InspectionSchema.index({ machineId: 1, scheduledDate: -1 });
InspectionSchema.index({ companyId: 1, type: 1 });

export const Inspection = mongoose.model<IInspection>('Inspection', InspectionSchema);
