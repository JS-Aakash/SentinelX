import api from '@/lib/axios';
import { ApiResponse } from '@/types';

export type DatasetStatus =
  | 'uploaded'
  | 'validated'
  | 'cleaned'
  | 'engineered'
  | 'ready_for_training';

export interface ValidationReport {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  missingValues: number;
  invalidValues: number;
  rejectedRows: number;
  errors: string[];
}

export interface CleaningLog {
  removedDuplicates: number;
  interpolatedRows: number;
  rejectedRows: number;
  notes: string[];
  cleanedAt?: string;
}

export interface DatasetItem {
  _id: string;
  machineId: string;
  companyId: string;
  version: number;
  isActive: boolean;
  datasetName: string;
  originalFileName: string;
  originalFilePath: string;
  cleanedFilePath?: string | null;
  engineeredFilePath?: string | null;
  fileSizeBytes: number;
  rowCount: number;
  startDate?: string | null;
  endDate?: string | null;
  samplingInterval?: string | null;
  status: DatasetStatus;
  uploadedBy: { _id: string; name: string; email: string } | string;
  validationReport: ValidationReport;
  cleaningLog: CleaningLog;
  engineeredFeatures: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DatasetPreviewResponse {
  type: 'original' | 'cleaned' | 'engineered';
  columns: string[];
  rows: Record<string, any>[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const datasetsApi = {
  upload: (formData: FormData) =>
    api.post<ApiResponse<DatasetItem>>('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getByMachine: (machineId: string) =>
    api.get<ApiResponse<DatasetItem[]>>(`/datasets/machine/${machineId}`),

  getById: (id: string) =>
    api.get<ApiResponse<DatasetItem>>(`/datasets/${id}`),

  getPreview: (id: string, params?: { type?: string; page?: number; limit?: number; search?: string }) =>
    api.get<ApiResponse<DatasetPreviewResponse>>(`/datasets/${id}/preview`, { params }),

  clean: (id: string) =>
    api.post<ApiResponse<DatasetItem>>(`/datasets/${id}/clean`),

  generateFeatures: (id: string) =>
    api.post<ApiResponse<DatasetItem>>(`/datasets/${id}/features`),

  activateVersion: (id: string) =>
    api.post<ApiResponse<DatasetItem>>(`/datasets/${id}/activate`),

  restoreVersion: (id: string) =>
    api.post<ApiResponse<DatasetItem>>(`/datasets/${id}/restore`),

  deleteVersion: (id: string) =>
    api.delete<ApiResponse>(`/datasets/${id}`),

  getSampleTemplateUrl: () =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/datasets/sample-template`,

  getDownloadUrl: (id: string, type: 'original' | 'clean' | 'engineered') =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/datasets/${id}/download/${type}`,

  // Authenticated file download via Axios Blob
  downloadFile: async (id: string, type: 'original' | 'clean' | 'engineered' = 'original', filename = 'dataset.csv') => {
    const response = await api.get(`/datasets/${id}/download/${type}`, {
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
};
