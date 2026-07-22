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
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
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
