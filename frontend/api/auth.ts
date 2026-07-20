import api from '@/lib/axios';
import {
  RegisterPayload,
  LoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  ApiResponse,
  AuthResponse,
  RefreshTokenResponse,
} from '@/types';

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data),

  logout: () =>
    api.post<ApiResponse>('/auth/logout'),

  refresh: () =>
    api.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh'),

  forgotPassword: (data: ForgotPasswordPayload) =>
    api.post<ApiResponse>('/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post<ApiResponse>('/auth/reset-password', data),

  changePassword: (data: ChangePasswordPayload) =>
    api.put<ApiResponse>('/auth/change-password', data),

  getMe: () =>
    api.get<ApiResponse>('/auth/me'),
};
