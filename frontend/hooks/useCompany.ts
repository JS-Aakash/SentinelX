'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { companyApi } from '@/api/company';
import { UpdateCompanyPayload } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

export function useCompany() {
  const { company, setCompany } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const updateCompany = useCallback(
    async (data: UpdateCompanyPayload) => {
      setIsLoading(true);
      try {
        const response = await companyApi.updateCompany(data);
        setCompany(response.data.data!);
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      } finally {
        setIsLoading(false);
      }
    },
    [setCompany]
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const response = await companyApi.uploadLogo(file);
        setCompany(response.data.data!);
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      } finally {
        setIsLoading(false);
      }
    },
    [setCompany]
  );

  return { company, isLoading, updateCompany, uploadLogo };
}
