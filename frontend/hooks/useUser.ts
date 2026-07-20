'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/api/user';
import { UpdateProfilePayload } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

export function useUser() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const updateProfile = useCallback(
    async (data: UpdateProfilePayload) => {
      setIsLoading(true);
      try {
        const response = await userApi.updateProfile(data);
        setUser(response.data.data!);
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      } finally {
        setIsLoading(false);
      }
    },
    [setUser]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const response = await userApi.uploadAvatar(file);
        setUser(response.data.data!);
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      } finally {
        setIsLoading(false);
      }
    },
    [setUser]
  );

  return { user, isLoading, updateProfile, uploadAvatar };
}
