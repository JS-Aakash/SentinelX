import mongoose, { Schema, Document } from 'mongoose';

export type AIModelStatus = 'not_trained' | 'training' | 'ready' | 'failed';

export interface ITrainingReport {
  totalRows: number;
  featureCount: number;
  modelVersion: number;
  datasetVersion: number;
  status: string;
  trainingTimeSeconds: number;
  modelsCreated: string[];
  notes: string[];
}

export interface IAIModel extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  datasetId: mongoose.Types.ObjectId;
  datasetVersion: number;
  modelVersion: number;
  isActive: boolean;
  status: AIModelStatus;
  modelDir: string;
  trainingDurationSeconds: number;
  trainedAt: Date;
  featureNames: string[];
  targetSensors: string[];
  modelsCreated: string[];
  trainingReport: ITrainingReport;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIModelSchema = new Schema<IAIModel>(
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
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
    },
    datasetVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    modelVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['not_trained', 'training', 'ready', 'failed'],
      default: 'not_trained',
    },
    modelDir: {
      type: String,
      required: true,
    },
    trainingDurationSeconds: {
      type: Number,
      default: 0,
    },
    trainedAt: {
      type: Date,
      default: Date.now,
    },
    featureNames: [{ type: String }],
    targetSensors: [{ type: String }],
    modelsCreated: [{ type: String }],
    trainingReport: {
      totalRows: { type: Number, default: 0 },
      featureCount: { type: Number, default: 0 },
      modelVersion: { type: Number, default: 1 },
      datasetVersion: { type: Number, default: 1 },
      status: { type: String, default: 'ready' },
      trainingTimeSeconds: { type: Number, default: 0 },
      modelsCreated: [{ type: String }],
      notes: [{ type: String }],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AIModelSchema.index({ machineId: 1, modelVersion: 1 }, { unique: true });

export const AIModel = mongoose.model<IAIModel>('AIModel', AIModelSchema);
