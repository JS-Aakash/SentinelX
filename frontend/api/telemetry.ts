import api from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface LiveTelemetryData {
  machineId: string;
  machineName: string;
  deviceId: string | null;
  deviceName: string | null;
  deviceStatus: 'online' | 'offline' | 'maintenance' | string;
  lastSeen: string | null;
  temperature: number | null;
  vibration: number | null;
  current: number | null;
  voltage: number | null;
  rpm: number | null;
  sound: number | null;
}

export interface TelemetryReading {
  id: string | number;
  timestamp: string;
  deviceId: string;
  machineId: string;
  temperature: number | null;
  vibration: number | null;
  current: number | null;
  voltage: number | null;
  rpm: number | null;
  sound: number | null;
}

export interface TelemetryHistoryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const telemetryApi = {
  // Get live sensor telemetry for machine
  getLive: (machineId: string) =>
    api.get<ApiResponse<LiveTelemetryData>>(`/machines/${machineId}/live`),

  // Get paginated sensor reading history for machine
  getHistory: (machineId: string, params?: TelemetryHistoryParams) =>
    api.get<ApiResponse<TelemetryReading[]>>(`/machines/${machineId}/history`, { params }),
};
