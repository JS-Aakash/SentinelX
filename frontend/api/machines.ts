import api from '@/lib/axios';
import {
  ApiResponse,
  Machine,
  MachineStats,
  CreateMachinePayload,
  UpdateMachinePayload,
  MachinesQueryParams,
  MachineFilterOptions,
} from '@/types';

export const machinesApi = {
  // List with search/filter/sort/pagination
  getAll: (params?: MachinesQueryParams) =>
    api.get<ApiResponse<Machine[]>>('/machines', { params }),

  // Stats for dashboard
  getStats: () =>
    api.get<ApiResponse<MachineStats>>('/machines/stats'),

  // Recent machines
  getRecent: (limit = 5) =>
    api.get<ApiResponse<Machine[]>>('/machines/recent', { params: { limit } }),

  // Predefined machine types list
  getTypes: () =>
    api.get<ApiResponse<string[]>>('/machines/types'),

  // Filter options (distinct types/plants/departments in this company)
  getFilterOptions: () =>
    api.get<ApiResponse<MachineFilterOptions>>('/machines/filter-options'),

  // Single machine
  getById: (id: string) =>
    api.get<ApiResponse<Machine>>(`/machines/${id}`),

  // Create
  create: (data: CreateMachinePayload) =>
    api.post<ApiResponse<Machine>>('/machines', data),

  // Update
  update: (id: string, data: UpdateMachinePayload) =>
    api.put<ApiResponse<Machine>>(`/machines/${id}`, data),

  // Delete
  delete: (id: string) =>
    api.delete<ApiResponse>(`/machines/${id}`),

  // Upload machine image
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('machine', file);
    return api.post<ApiResponse<Machine>>(`/machines/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Toggle Live Data Recording ON / OFF
  toggleRecording: (id: string, isRecording: boolean) =>
    api.patch<ApiResponse<Machine>>(`/machines/${id}/recording`, { isRecording }),

  // Update AI Lifecycle status / Data Source preference
  updateAILifecycle: (id: string, data: { aiLifecycleStatus?: string; dataSourcePreference?: string }) =>
    api.patch<ApiResponse<Machine>>(`/machines/${id}/ai-lifecycle`, data),

  // Clear recorded live dataset file
  clearLiveDataset: (id: string) =>
    api.post<ApiResponse<Machine>>(`/machines/${id}/dataset/clear`),

  // Download recorded live dataset CSV
  downloadLiveDataset: async (id: string, filename = 'live_dataset.csv') => {
    const response = await api.get(`/machines/${id}/dataset/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Train AI Model from recorded live dataset
  trainFromLiveDataset: (id: string) =>
    api.post<ApiResponse<{ machine: Machine; aiModel: any }>>(`/machines/${id}/train-live`),
};
