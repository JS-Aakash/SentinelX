'use client';

import { useState, useCallback } from 'react';
import { machinesApi } from '@/api/machines';
import { Machine, CreateMachinePayload, UpdateMachinePayload } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

interface UseMachineResult {
  machine: Machine | null;
  isLoading: boolean;
  error: string | null;
  fetchMachine: (id: string) => Promise<void>;
  createMachine: (data: CreateMachinePayload) => Promise<{ success: boolean; machine?: Machine; error?: string }>;
  updateMachine: (id: string, data: UpdateMachinePayload) => Promise<{ success: boolean; machine?: Machine; error?: string }>;
  deleteMachine: (id: string) => Promise<{ success: boolean; error?: string }>;
  uploadImage: (id: string, file: File) => Promise<{ success: boolean; machine?: Machine; error?: string }>;
}

export function useMachine(): UseMachineResult {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMachine = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await machinesApi.getById(id);
      setMachine(response.data.data ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMachine = useCallback(async (data: CreateMachinePayload) => {
    try {
      const response = await machinesApi.create(data);
      const newMachine = response.data.data!;
      setMachine(newMachine);
      return { success: true, machine: newMachine };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const updateMachine = useCallback(async (id: string, data: UpdateMachinePayload) => {
    try {
      const response = await machinesApi.update(id, data);
      const updated = response.data.data!;
      setMachine(updated);
      return { success: true, machine: updated };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const deleteMachine = useCallback(async (id: string) => {
    try {
      await machinesApi.delete(id);
      setMachine(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const uploadImage = useCallback(async (id: string, file: File) => {
    try {
      const response = await machinesApi.uploadImage(id, file);
      const updated = response.data.data!;
      setMachine(updated);
      return { success: true, machine: updated };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  return {
    machine,
    isLoading,
    error,
    fetchMachine,
    createMachine,
    updateMachine,
    deleteMachine,
    uploadImage,
  };
}
