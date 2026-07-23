import mongoose, { Schema, Document } from 'mongoose';

export type AnomalySeverity = 'Normal' | 'Watch' | 'Warning' | 'Critical' | 'Emergency';
export type AnomalyStatus = 'Active' | 'Acknowledged' | 'Resolved';

export interface ISensorDeviation {
  sensor: string;
  expected: number;
  actual: number;
  deviation: number;
  unit: string;
}

export interface IAnomalyEvent extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  timestamp: Date;
  severity: AnomalySeverity;
  anomalyScore: number;
  confidenceScore: number;
  affectedSensors: string[];
  sensorDeviations: ISensorDeviation[];
  primaryCause: string;
  secondaryCause?: string;
  supportingCause?: string;
  recommendedAction: string;
  operatingHours: number;
  machineAgeDays: number;
  status: AnomalyStatus;
  consecutiveAbnormalCount: number;
  durationSeconds: number;
  firstDetectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SensorDeviationSchema = new Schema<ISensorDeviation>(
  {
    sensor: { type: String, required: true },
    expected: { type: Number, required: true },
    actual: { type: Number, required: true },
    deviation: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const AnomalyEventSchema = new Schema<IAnomalyEvent>(
  {
    machineId: { type: Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    severity: {
      type: String,
      enum: ['Normal', 'Watch', 'Warning', 'Critical', 'Emergency'],
      default: 'Normal',
      index: true,
    },
    anomalyScore: { type: Number, required: true, min: 0, max: 1 },
    confidenceScore: { type: Number, required: true, default: 92 },
    affectedSensors: [{ type: String }],
    sensorDeviations: [SensorDeviationSchema],
    primaryCause: { type: String, required: true },
    secondaryCause: { type: String },
    supportingCause: { type: String },
    recommendedAction: { type: String, required: true },
    operatingHours: { type: Number, default: 0 },
    machineAgeDays: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Active', 'Acknowledged', 'Resolved'],
      default: 'Active',
      index: true,
    },
    consecutiveAbnormalCount: { type: Number, default: 1 },
    durationSeconds: { type: Number, default: 0 },
    firstDetectedAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

AnomalyEventSchema.index({ machineId: 1, status: 1, timestamp: -1 });

export const AnomalyEvent = mongoose.model<IAnomalyEvent>('AnomalyEvent', AnomalyEventSchema);
