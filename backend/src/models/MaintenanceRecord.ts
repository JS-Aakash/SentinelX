import mongoose, { Document, Schema } from 'mongoose';

export enum MaintenanceActivityType {
  INSTALLATION = 'installation',
  INSPECTION = 'inspection',
  REPAIR = 'repair',
  COMPONENT_REPLACEMENT = 'component_replacement',
  CALIBRATION = 'calibration',
  OVERHAUL = 'overhaul',
}

export interface IMaintenanceRecord extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  activityType: MaintenanceActivityType;
  title: string;
  description: string;
  engineerId: mongoose.Types.ObjectId;
  engineerName: string;
  cost: number;
  durationHours: number;
  downtimeHours: number;
  healthScoreBefore: number;
  healthScoreAfter: number;
  partsReplaced: string[];
  ipfsCid: string;
  blockchainTxHash: string;
  blockchainBlockNumber?: number;
  blockchainVerified: boolean;
  etherscanUrl: string;
  evidenceFiles: Array<{ name: string; url: string; ipfsCid: string }>;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRecordSchema = new Schema<IMaintenanceRecord>(
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
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
    },
    activityType: {
      type: String,
      enum: Object.values(MaintenanceActivityType),
      default: MaintenanceActivityType.REPAIR,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    engineerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    engineerName: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
    durationHours: {
      type: Number,
      default: 1,
    },
    downtimeHours: {
      type: Number,
      default: 0,
    },
    healthScoreBefore: {
      type: Number,
      default: 75,
    },
    healthScoreAfter: {
      type: Number,
      default: 95,
    },
    partsReplaced: [{ type: String }],
    ipfsCid: {
      type: String,
      required: true,
      index: true,
    },
    blockchainTxHash: {
      type: String,
      required: true,
      index: true,
    },
    blockchainBlockNumber: {
      type: Number,
      default: null,
    },
    blockchainVerified: {
      type: Boolean,
      default: true,
    },
    etherscanUrl: {
      type: String,
      required: true,
    },
    evidenceFiles: [
      {
        name: { type: String },
        url: { type: String },
        ipfsCid: { type: String },
      },
    ],
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

MaintenanceRecordSchema.index({ machineId: 1, completedAt: -1 });

export const MaintenanceRecord = mongoose.model<IMaintenanceRecord>('MaintenanceRecord', MaintenanceRecordSchema);
