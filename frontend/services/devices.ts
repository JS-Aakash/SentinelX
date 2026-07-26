import api from '@/lib/axios';
import {
  ApiResponse,
  Device,
  Sensor,
  DeviceStats,
  CreateDevicePayload,
  UpdateDevicePayload,
  DevicesQueryParams,
} from '@/types';

export interface DeviceWithSensorsResponse {
  device: Device;
  sensors: Sensor[];
}

export const devicesApi = {
  getAll: (params?: DevicesQueryParams) =>
    api.get<ApiResponse<Device[]>>('/devices', { params }),

  getStats: () =>
    api.get<ApiResponse<DeviceStats>>('/devices/stats'),

  getById: (id: string) =>
    api.get<ApiResponse<DeviceWithSensorsResponse>>(`/devices/${id}`),

  create: (data: CreateDevicePayload) =>
    api.post<ApiResponse<{ device: Device; sensors: Sensor[] }>>('/devices', data),

  update: (id: string, data: UpdateDevicePayload) =>
    api.put<ApiResponse<Device>>(`/devices/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/devices/${id}`),

  assignToMachine: (machineId: string, deviceId: string) =>
    api.post<ApiResponse<{ device: Device; sensors: Sensor[] }>>(`/machines/${machineId}/device`, { deviceId }),

  removeFromMachine: (machineId: string) =>
    api.delete<ApiResponse>(`/machines/${machineId}/device`),
};
