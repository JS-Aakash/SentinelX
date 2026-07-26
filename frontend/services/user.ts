import api from '@/lib/axios';
import { ApiResponse, User, UpdateProfilePayload } from '@/types';

export const userApi = {
  getProfile: () =>
    api.get<ApiResponse<User>>('/users/me'),

  updateProfile: (data: UpdateProfilePayload) =>
    api.put<ApiResponse<User>>('/users/me', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<ApiResponse<User>>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
