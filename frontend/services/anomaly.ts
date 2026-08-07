import api from '@/lib/axios';

export type AnomalySeverity = 'Normal' | 'Watch' | 'Warning' | 'Critical' | 'Emergency';
export type AnomalyStatus = 'Active' | 'Acknowledged' | 'Resolved';

export interface SensorDeviation {
  sensor: string;
  expected: number;
  actual: number;
  deviation: number;
  unit: string;
}

export interface AnomalyEventRecord {
  _id: string;
  machineId: string;
  companyId: string;
  timestamp: string;
  severity: AnomalySeverity;
  anomalyScore: number;
  confidenceScore: number;
  affectedSensors: string[];
  sensorDeviations: SensorDeviation[];
  primaryCause: string;
  secondaryCause?: string;
  supportingCause?: string;
  recommendedAction: string;
  operatingHours: number;
  machineAgeDays: number;
  status: AnomalyStatus;
  consecutiveAbnormalCount: number;
  durationSeconds: number;
  firstDetectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface LiveAnomalyResponse {
  machineId: string;
  activeEvent: AnomalyEventRecord | null;
  severity: AnomalySeverity;
  anomalyScore: number;
  status: string;
}

export interface AnomalyHistoryResponse {
  events: AnomalyEventRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const anomalyApi = {
  getLiveStatus: (machineId: string) =>
    api.get<{ success: boolean; message: string; data: LiveAnomalyResponse }>(`/anomalies/live/${machineId}`),

  getHistory: (machineId: string, params?: { page?: number; limit?: number; severity?: string; status?: string; search?: string }) =>
    api.get<{ success: boolean; message: string; data: AnomalyHistoryResponse }>(`/anomalies/history/${machineId}`, { params }),

  acknowledge: (eventId: string) =>
    api.put<{ success: boolean; message: string; data: AnomalyEventRecord }>(`/anomalies/${eventId}/acknowledge`),

  resolve: (eventId: string, resolutionNotes?: string) =>
    api.put<{ success: boolean; message: string; data: AnomalyEventRecord }>(`/anomalies/${eventId}/resolve`, { resolutionNotes }),

  clearHistory: (machineId: string) =>
    api.delete<{ success: boolean; message: string }>(`/anomalies/history/${machineId}/clear`),
};
