'use client';

import { useState, useCallback, useEffect } from 'react';
import { machinesApi } from '@/api/machines';
import { Machine, MachinesQueryParams, MachineFilterOptions } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

interface UseMachinesState {
  machines: Machine[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  filterOptions: MachineFilterOptions | null;
}

export function useMachines(initialParams?: MachinesQueryParams) {
  const [params, setParams] = useState<MachinesQueryParams>({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialParams,
  });

  const [state, setState] = useState<UseMachinesState>({
    machines: [],
    total: 0,
    page: 1,
    totalPages: 1,
    isLoading: true,
    error: null,
    filterOptions: null,
  });

  const fetchMachines = useCallback(async (query: MachinesQueryParams) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await machinesApi.getAll(query);
      const { data, meta } = response.data;
      setState((prev) => ({
        ...prev,
        machines: data ?? [],
        total: (meta?.total as number) ?? 0,
        page: (meta?.page as number) ?? 1,
        totalPages: (meta?.totalPages as number) ?? 1,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: getApiErrorMessage(err),
      }));
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await machinesApi.getFilterOptions();
      setState((prev) => ({ ...prev, filterOptions: response.data.data ?? null }));
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchMachines(params);
  }, [fetchMachines, params]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const updateParams = useCallback((updates: Partial<MachinesQueryParams>) => {
    setParams((prev) => ({
      ...prev,
      ...updates,
      // Reset to page 1 on any filter/search change
      page: updates.page !== undefined ? updates.page : 1,
    }));
  }, []);

  const refresh = useCallback(() => {
    fetchMachines(params);
  }, [fetchMachines, params]);

  return {
    ...state,
    params,
    updateParams,
    refresh,
  };
}
