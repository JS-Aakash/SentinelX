'use client';

import { useState, useCallback } from 'react';
import { devicesApi } from '@/api/devices';
import { sensorsApi } from '@/api/sensors';
import { Device, Sensor, CreateDevicePayload, UpdateDevicePayload, UpdateSensorPayload } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

interface UseDeviceResult {
  device: Device | null;
  sensors: Sensor[];
  isLoading: boolean;
  error: string | null;
  fetchDevice: (id: string) => Promise<void>;
  createDevice: (data: CreateDevicePayload) => Promise<{ success: boolean; device?: Device; sensors?: Sensor[]; error?: string }>;
  updateDevice: (id: string, data: UpdateDevicePayload) => Promise<{ success: boolean; device?: Device; error?: string }>;
  deleteDevice: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateSensor: (sensorId: string, data: UpdateSensorPayload) => Promise<{ success: boolean; sensor?: Sensor; error?: string }>;
  assignToMachine: (machineId: string, deviceId: string) => Promise<{ success: boolean; error?: string }>;
  removeFromMachine: (machineId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useDevice(): UseDeviceResult {
  const [device, setDevice] = useState<Device | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevice = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await devicesApi.getById(id);
      const data = response.data.data;
      if (data) {
        setDevice(data.device);
        setSensors(data.sensors ?? []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDevice = useCallback(async (data: CreateDevicePayload) => {
    try {
      const response = await devicesApi.create(data);
      const resData = response.data.data;
      if (resData) {
        setDevice(resData.device);
        setSensors(resData.sensors ?? []);
        return { success: true, device: resData.device, sensors: resData.sensors };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const updateDevice = useCallback(async (id: string, data: UpdateDevicePayload) => {
    try {
      const response = await devicesApi.update(id, data);
      const updated = response.data.data!;
      setDevice(updated);
      return { success: true, device: updated };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const deleteDevice = useCallback(async (id: string) => {
    try {
      await devicesApi.delete(id);
      setDevice(null);
      setSensors([]);
      return { success: true };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const updateSensor = useCallback(async (sensorId: string, data: UpdateSensorPayload) => {
    try {
      const response = await sensorsApi.update(sensorId, data);
      const updatedSensor = response.data.data!;
      setSensors((prev) => prev.map((s) => (s._id === sensorId ? updatedSensor : s)));
      return { success: true, sensor: updatedSensor };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const assignToMachine = useCallback(async (machineId: string, deviceId: string) => {
    try {
      const response = await devicesApi.assignToMachine(machineId, deviceId);
      const resData = response.data.data;
      if (resData) {
        setDevice(resData.device);
        setSensors(resData.sensors);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  const removeFromMachine = useCallback(async (machineId: string) => {
    try {
      await devicesApi.removeFromMachine(machineId);
      setDevice((prev) => (prev ? { ...prev, machineId: null } : null));
      return { success: true };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  }, []);

  return {
    device,
    sensors,
    isLoading,
    error,
    fetchDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    updateSensor,
    assignToMachine,
    removeFromMachine,
  };
}
