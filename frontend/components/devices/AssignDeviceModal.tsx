'use client';

import { useState, useEffect } from 'react';
import { Cpu, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { devicesApi } from '@/api/devices';
import { Device } from '@/types';
import { DeviceStatusBadge } from './DeviceStatusBadge';

interface AssignDeviceModalProps {
  machineId: string;
  machineName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignDeviceModal({
  machineId,
  machineName,
  isOpen,
  onClose,
  onAssigned,
}: AssignDeviceModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      // Fetch available devices
      devicesApi
        .getAll({ limit: 50 })
        .then((res) => {
          const all = res.data.data ?? [];
          // Filter devices that are unassigned OR assigned to this machine
          const available = all.filter(
            (d) =>
              !d.machineId ||
              (typeof d.machineId === 'object' && d.machineId?._id === machineId) ||
              d.machineId === machineId
          );
          setDevices(available);
          if (available.length > 0) {
            setSelectedDeviceId(available[0]._id);
          }
        })
        .catch(() => setError('Failed to load available devices'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, machineId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await devicesApi.assignToMachine(machineId, selectedDeviceId);
      onAssigned();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Failed to assign device');
      } else {
        setError('Failed to assign device');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass rounded-2xl p-6 max-w-md w-full space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center">
              <Cpu size={18} className="text-[oklch(0.62_0.20_240)]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Assign IoT Device</h3>
              <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">
                Target Machine: <span className="text-white font-medium">{machineName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[oklch(0.20_0.01_240)] hover:text-white text-[oklch(0.50_0.01_240)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[oklch(0.45_0.01_240)]" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Cpu size={32} className="mx-auto text-[oklch(0.35_0.01_240)]" />
            <p className="text-sm text-white font-medium">No available devices found</p>
            <p className="text-xs text-[oklch(0.45_0.01_240)]">
              All devices are currently assigned or none have been registered yet. Please add a new ESP32 device first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[oklch(0.55_0.01_240)] mb-2 block uppercase tracking-wider">
                Select ESP32 Device
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {devices.map((device) => {
                  const isSelected = selectedDeviceId === device._id;
                  return (
                    <div
                      key={device._id}
                      onClick={() => setSelectedDeviceId(device._id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[oklch(0.52_0.24_240/0.18)] border-[oklch(0.52_0.24_240/0.5)] text-white'
                          : 'bg-[oklch(0.12_0.007_240)] border-[oklch(0.18_0.009_240)] text-[oklch(0.60_0.01_240)] hover:text-white hover:border-[oklch(0.25_0.01_240)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[oklch(0.16_0.008_240)] border border-[oklch(0.22_0.01_240)] flex items-center justify-center font-mono text-xs font-bold text-[oklch(0.75_0.18_200)]">
                          ESP
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{device.name}</p>
                          <p className="text-[10px] font-mono text-[oklch(0.50_0.01_240)] mt-0.5">
                            {device.deviceId} · {device.firmwareVersion || 'v1.0.0'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DeviceStatusBadge status={device.status} size="sm" />
                        {isSelected && <CheckCircle2 size={16} className="text-[oklch(0.75_0.18_200)]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[oklch(0.22_0.01_240)] py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.14_0.007_240)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedDeviceId}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] text-white text-xs font-semibold py-2.5 shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-50 transition-all"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
