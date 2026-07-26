import api from '@/lib/axios';
import { ApiResponse } from '@/types';

export type AIModelStatus = 'not_trained' | 'training' | 'ready' | 'failed';

export interface TrainingReport {
  totalRows: number;
  featureCount: number;
  modelVersion: number;
  datasetVersion: number;
  status: string;
  trainingTimeSeconds: number;
  modelsCreated: string[];
  notes: string[];
}

export interface AIModelItem {
  _id: string;
  machineId: string;
  companyId: string;
  datasetId: { _id: string; version: number; datasetName: string; rowCount?: number } | string;
  datasetVersion: number;
  modelVersion: number;
  isActive: boolean;
  status: AIModelStatus;
  modelDir: string;
  trainingDurationSeconds: number;
  trainedAt: string;
  featureNames: string[];
  targetSensors: string[];
  modelsCreated: string[];
  trainingReport: TrainingReport;
  createdBy: { _id: string; name: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModelStatusResponse {
  isTrained: boolean;
  status: AIModelStatus;
  activeModel: AIModelItem | null;
  activeDataset: {
    _id: string;
    version: number;
    datasetName: string;
    rowCount: number;
    status: string;
    engineeredFeatures?: string[];
  } | null;
}

export interface Recommendation {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action: string;
}

export interface PredictionRecord {
  _id: string;
  machineId: string;
  companyId: string;
  modelVersion: number;
  datasetVersion: number;
  timestamp: string;
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
  healthStatus: 'Excellent' | 'Good' | 'Warning' | 'Critical';
  isAnomaly: boolean;
  anomalyScore: number;
  recommendations: Recommendation[];
  createdAt: string;
}

export interface AIDashboardResponse {
  machine: {
    _id: string;
    name: string;
    machineCode: string;
    operatingLimits: Record<string, number>;
  };
  isModelReady: boolean;
  activeModel: AIModelItem | null;
  activeDataset: any;
  latestPrediction: PredictionRecord | null;
  recommendations: Recommendation[];
}

export const aiApi = {
  train: (machineId: string, datasetIds?: string[]) =>
    api.post<ApiResponse<AIModelItem>>('/ai/train', { machineId, datasetIds }),

  retrain: (machineId: string, datasetIds?: string[]) =>
    api.post<ApiResponse<AIModelItem>>('/ai/retrain', { machineId, datasetIds }),

  getStatus: (machineId: string) =>
    api.get<ApiResponse<AIModelStatusResponse>>(`/ai/status/${machineId}`),

  getHistory: (machineId: string) =>
    api.get<ApiResponse<AIModelItem[]>>(`/ai/models/history/${machineId}`),

  getReport: (modelId: string) =>
    api.get<ApiResponse<AIModelItem>>(`/ai/report/${modelId}`),

  restoreVersion: (modelId: string) =>
    api.post<ApiResponse<AIModelItem>>(`/ai/restore/${modelId}`),

  deleteVersion: (modelId: string) =>
    api.delete<ApiResponse>(`/ai/model/${modelId}`),

  // Live Inference & Dashboard APIs
  triggerPredict: (machineId: string) =>
    api.post<ApiResponse<PredictionRecord>>(`/ai/predict/${machineId}`),

  getLatestPrediction: (machineId: string) =>
    api.get<ApiResponse<PredictionRecord | null>>(`/ai/latest/${machineId}`),

  getPredictionHistory: (machineId: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<{ history: PredictionRecord[]; pagination: any }>>(`/ai/predictions/history/${machineId}`, { params }),

  getForecast: (machineId: string) =>
    api.get<ApiResponse<{
      machineId: string;
      modelVersion: number;
      timestamp: string;
      rsotSeconds?: number | null;
      rsotFormatted: string;
      violatingSensor?: string | null;
      breachStep?: number | null;
      forecastTrajectory: Array<{ step: number; predictions: Record<string, number> }>;
    }>>(`/ai/forecast/${machineId}`),

  getDashboard: (machineId: string) =>
    api.get<ApiResponse<AIDashboardResponse>>(`/ai/dashboard/${machineId}`),

  getRecommendations: (machineId: string) =>
    api.get<ApiResponse<Recommendation[]>>(`/ai/recommendations/${machineId}`),

  getAlerts: (machineId: string) =>
    api.get<ApiResponse<PredictionRecord[]>>(`/ai/alerts/${machineId}`),
};
