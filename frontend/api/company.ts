import api from '@/lib/axios';
import { ApiResponse, Company, UpdateCompanyPayload } from '@/types';

export const companyApi = {
  getCompany: () =>
    api.get<ApiResponse<Company>>('/company'),

  updateCompany: (data: UpdateCompanyPayload) =>
    api.put<ApiResponse<Company>>('/company', data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post<ApiResponse<Company>>('/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
