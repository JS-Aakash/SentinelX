'use client';

import { useState, useCallback, useEffect } from 'react';
import { devicesApi } from '@/api/devices';
import { Device, DevicesQueryParams, DeviceStats } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

interface UseDevicesState {
  devices: Device[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  stats: DeviceStats | null;
}

export function useDevices(initialParams?: DevicesQueryParams) {
  const [params, setParams] = useState<DevicesQueryParams>({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialParams,
  });

  const [state, setState] = useState<UseDevicesState>({
    devices: [],
    total: 0,
    page: 1,
    totalPages: 1,
    isLoading: true,
    error: null,
    stats: null,
  });

  const fetchDevices = useCallback(async (query: DevicesQueryParams) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await devicesApi.getAll(query);
      const { data, meta } = response.data;
      setState((prev) => ({
        ...prev,
        devices: data ?? [],
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

  const fetchStats = useCallback(async () => {
    try {
      const response = await devicesApi.getStats();
      setState((prev) => ({ ...prev, stats: response.data.data ?? null }));
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchDevices(params);
  }, [fetchDevices, params]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const updateParams = useCallback((updates: Partial<DevicesQueryParams>) => {
    setParams((prev) => ({
      ...prev,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1,
    }));
  }, []);

  const refresh = useCallback(() => {
    fetchDevices(params);
    fetchStats();
  }, [fetchDevices, fetchStats, params]);

  return {
    ...state,
    params,
    updateParams,
    refresh,
  };
}
