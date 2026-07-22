import api from '@/lib/axios';
import { ApiResponse, SimulationProfile, SimulationOverride, SimulationSession } from '@/types';

export const simulationApi = {
  start: (params: {
    machineId: string;
    profile?: SimulationProfile;
    speed?: number;
    overrides?: SimulationOverride;
  }) => api.post<ApiResponse<SimulationSession>>('/simulation/start', params, { timeout: 30000 }),

  pause: (machineId: string) =>
    api.post<ApiResponse<SimulationSession>>('/simulation/pause', { machineId }, { timeout: 30000 }),

  resume: (machineId: string) =>
    api.post<ApiResponse<SimulationSession>>('/simulation/resume', { machineId }, { timeout: 30000 }),

  stop: (machineId: string) =>
    api.post<ApiResponse<SimulationSession>>('/simulation/stop', { machineId }, { timeout: 30000 }),

  updateSensors: (machineId: string, overrides: SimulationOverride) =>
    api.post<ApiResponse<SimulationSession>>('/simulation/update-sensors', { machineId, overrides }, { timeout: 30000 }),

  getStatus: (machineId: string) =>
    api.get<ApiResponse<SimulationSession>>(`/simulation/status/${machineId}`, { timeout: 15000 }),

  getActive: () =>
    api.get<ApiResponse<SimulationSession[]>>('/simulation/active', { timeout: 15000 }),
};
