import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum WorkOrderType {
  PREDICTIVE = 'predictive',
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  EMERGENCY = 'emergency',
}

export enum WorkOrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum WorkOrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export interface IEvidenceFile {
  name: string;
  url: string;
  ipfsCid: string;
  fileType: 'image' | 'video' | 'pdf' | 'invoice' | 'certificate' | 'other';
  uploadedAt: Date;
}

export interface IWorkOrder extends Document {
  _id: mongoose.Types.ObjectId;
  uuid: string;
  workOrderNumber: string;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTo?: mongoose.Types.ObjectId;
  dueDate: Date;
  estimatedDurationHours?: number;
  downtimeHours?: number;
  cost?: number;
  problem?: string;
  diagnosis?: string;
  rootCause?: string;
  actionTaken?: string;
  partsReplaced?: string[];
  remarks?: string;
  nextInspectionDate?: Date;
  evidenceFiles?: IEvidenceFile[];
  ipfsCid?: string;
  blockchainTxHash?: string;
  blockchainBlockNumber?: number;
  blockchainVerified?: boolean;
  blockchainVerifiedAt?: Date;
  verifierWallet?: string;
  healthScoreBefore?: number;
  healthScoreAfter?: number;
  aiRecommendationCode?: string;
  healthScoreAtCreation?: number;
  rsotAtCreation?: string;
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkOrderSchema = new Schema<IWorkOrder>(
  {
    uuid: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    workOrderNumber: {
      type: String,
      required: true,
      trim: true,
    },
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: Object.values(WorkOrderType),
      default: WorkOrderType.PREDICTIVE,
    },
    priority: {
      type: String,
      enum: Object.values(WorkOrderPriority),
      default: WorkOrderPriority.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(WorkOrderStatus),
      default: WorkOrderStatus.PENDING,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    estimatedDurationHours: {
      type: Number,
      default: 2,
    },
    downtimeHours: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
    },
    problem: { type: String, default: null },
    diagnosis: { type: String, default: null },
    rootCause: { type: String, default: null },
    actionTaken: { type: String, default: null },
    partsReplaced: [{ type: String }],
    remarks: { type: String, default: null },
    nextInspectionDate: { type: Date, default: null },
    evidenceFiles: [
      {
        name: { type: String },
        url: { type: String },
        ipfsCid: { type: String },
        fileType: { type: String, default: 'image' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    ipfsCid: { type: String, default: null, index: true },
    blockchainTxHash: { type: String, default: null, index: true },
    blockchainBlockNumber: { type: Number, default: null },
    blockchainVerified: { type: Boolean, default: false, index: true },
    blockchainVerifiedAt: { type: Date, default: null },
    verifierWallet: { type: String, default: null },
    healthScoreBefore: { type: Number, default: null },
    healthScoreAfter: { type: Number, default: null },
    aiRecommendationCode: {
      type: String,
      default: null,
    },
    healthScoreAtCreation: {
      type: Number,
      default: null,
    },
    rsotAtCreation: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

WorkOrderSchema.index({ companyId: 1, status: 1 });
WorkOrderSchema.index({ companyId: 1, createdAt: -1 });

export const WorkOrder = mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
