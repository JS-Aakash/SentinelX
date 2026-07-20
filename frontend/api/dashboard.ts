import api from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface DashboardOverview {
  machines: {
    total: number;
    active: number;
    idle: number;
    offline: number;
    maintenance: number;
    fault: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
  };
  alerts: number;
  todaySensorRecords: number;
  averageTemperature: number | null;
  averagePowerConsumption: number | null;
  machineFleet: MachineFleetItem[];
}

export interface MachineFleetItem {
  _id: string;
  name: string;
  machineCode: string;
  type: string;
  status: string;
  image?: string;
  deviceId: string | null;
  deviceName: string | null;
  deviceStatus: string | null;
  latestTemperature: number | null;
  latestRPM: number | null;
  lastSeen: string | null;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number | null;
}

export const dashboardApi = {
  getOverview: () =>
    api.get<ApiResponse<DashboardOverview>>('/dashboard/overview'),

  getChartData: (machineId: string, metric: string, range: string, startDate?: string, endDate?: string) =>
    api.get<ApiResponse<ChartDataPoint[]>>(`/machines/${machineId}/chart`, {
      params: { metric, range, startDate, endDate },
    }),
};
