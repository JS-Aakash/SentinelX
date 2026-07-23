import mongoose, { Schema, Document } from 'mongoose';

export type HealthStatus = 'Excellent' | 'Good' | 'Warning' | 'Critical';

export interface IRecommendation {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action: string;
}

export interface IPredictionHistory extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  modelVersion: number;
  datasetVersion: number;
  timestamp: Date;
  currentReading: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  };
  predictedNext: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  };
  forecastTrajectory: Array<{
    step?: number;
    operatingHours?: number;
    targetDate?: string;
    predictions: Record<string, number>;
  }>;
  machineAgeDays?: number;
  operatingHours?: number;
  remainingOperatingHours?: number | null;
  estimatedMaintenanceDate?: string | null;
  estimatedFailureWindow?: string | null;
  confidenceScore?: number;
  primaryDegradingSensors?: string[];
  rsotSeconds?: number | null;
  rsotFormatted: string;
  breachStep?: number | null;
  violatingSensor?: string | null;
  healthScore: number;
  healthStatus: HealthStatus;
  isAnomaly: boolean;
  anomalyScore: number;
  recommendations: IRecommendation[];
  createdAt: Date;
}

const PredictionHistorySchema = new Schema<IPredictionHistory>(
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
    modelVersion: { type: Number, required: true, default: 1 },
    datasetVersion: { type: Number, required: true, default: 1 },
    timestamp: { type: Date, default: Date.now, index: true },
    currentReading: {
      temperature: { type: Number, default: 0 },
      vibration: { type: Number, default: 0 },
      current: { type: Number, default: 0 },
      voltage: { type: Number, default: 0 },
      rpm: { type: Number, default: 0 },
      sound: { type: Number, default: 0 },
    },
    predictedNext: {
      temperature: { type: Number, default: 0 },
      vibration: { type: Number, default: 0 },
      current: { type: Number, default: 0 },
      voltage: { type: Number, default: 0 },
      rpm: { type: Number, default: 0 },
      sound: { type: Number, default: 0 },
    },
    forecastTrajectory: [
      {
        step: { type: Number },
        operatingHours: { type: Number },
        targetDate: { type: String },
        predictions: { type: Schema.Types.Mixed },
      },
    ],
    machineAgeDays: { type: Number, default: 0 },
    operatingHours: { type: Number, default: 0 },
    remainingOperatingHours: { type: Number, default: null },
    estimatedMaintenanceDate: { type: String, default: null },
    estimatedFailureWindow: { type: String, default: null },
    confidenceScore: { type: Number, default: 95 },
    primaryDegradingSensors: { type: [String], default: [] },
    rsotSeconds: { type: Number, default: null },
    rsotFormatted: { type: String, default: 'Safe' },
    breachStep: { type: Number, default: null },
    violatingSensor: { type: String, default: null },
    healthScore: { type: Number, required: true, default: 100 },
    healthStatus: {
      type: String,
      enum: ['Excellent', 'Good', 'Warning', 'Critical'],
      default: 'Excellent',
    },
    isAnomaly: { type: Boolean, default: false },
    anomalyScore: { type: Number, default: 0 },
    recommendations: [
      {
        code: { type: String },
        severity: { type: String, enum: ['info', 'warning', 'critical'] },
        title: { type: String },
        description: { type: String },
        action: { type: String },
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

PredictionHistorySchema.index({ machineId: 1, timestamp: -1 });

export const PredictionHistory = mongoose.model<IPredictionHistory>(
  'PredictionHistory',
  PredictionHistorySchema
);
