import api from '@/lib/axios';
import { ApiResponse, Sensor, UpdateSensorPayload } from '@/types';

export const sensorsApi = {
  getByDevice: (deviceId: string) =>
    api.get<ApiResponse<Sensor[]>>('/sensors', { params: { deviceId } }),

  getByMachine: (machineId: string) =>
    api.get<ApiResponse<Sensor[]>>('/sensors', { params: { machineId } }),

  getById: (id: string) =>
    api.get<ApiResponse<Sensor>>(`/sensors/${id}`),

  update: (id: string, data: UpdateSensorPayload) =>
    api.put<ApiResponse<Sensor>>(`/sensors/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/sensors/${id}`),
};
