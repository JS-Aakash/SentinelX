'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  Save,
  Loader2,
  AlertCircle,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useDevice } from '@/hooks/useDevice';
import { machinesApi } from '@/api/machines';
import { DeviceStatus, UpdateDevicePayload, Machine } from '@/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Required').max(150),
  deviceId: z
    .string()
    .min(1, 'Required')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only'),
  type: z.string().optional(),
  firmwareVersion: z.string().optional(),
  macAddress: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(['online', 'offline', 'maintenance']).optional(),
  machineId: z.string().optional().nullable(),
  description: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditDeviceClient({ id }: { id: string }) {
  const router = useRouter();
  const { device, isLoading, error: fetchError, fetchDevice, updateDevice } = useDevice();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  });

  useEffect(() => {
    fetchDevice(id);
    machinesApi
      .getAll({ limit: 100 })
      .then((res) => {
        if (res.data.data) setMachines(res.data.data);
      })
      .catch(() => {});
  }, [fetchDevice, id]);

  useEffect(() => {
    if (device) {
      const assignedId = typeof device.machineId === 'object' ? device.machineId?._id : device.machineId;
      reset({
        name: device.name,
        deviceId: device.deviceId,
        type: device.type,
        firmwareVersion: device.firmwareVersion || '',
        macAddress: device.macAddress || '',
        serialNumber: device.serialNumber || '',
        status: device.status,
        machineId: assignedId || '',
        description: device.description || '',
      });
    }
  }, [device, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: UpdateDevicePayload = {
      name: data.name,
      deviceId: data.deviceId,
      type: data.type || undefined,
      firmwareVersion: data.firmwareVersion || undefined,
      macAddress: data.macAddress || undefined,
      serialNumber: data.serialNumber || undefined,
      status: data.status as DeviceStatus,
      machineId: data.machineId || null,
      description: data.description || undefined,
    };

    const result = await updateDevice(id, payload);
    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to update device');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.push(`/devices/${id}`);
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full bg-[oklch(0.12_0.007_240)] border rounded-lg text-sm text-white px-3 py-2.5 focus:outline-none transition-colors',
      hasError
        ? 'border-red-500/60 focus:border-red-400'
        : 'border-[oklch(0.20_0.01_240)] focus:border-[oklch(0.45_0.02_240)]',
      'placeholder:text-[oklch(0.35_0.008_240)]'
    );

  const labelClass = 'text-xs font-medium text-[oklch(0.55_0.01_240)] mb-1.5 block';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[oklch(0.45_0.01_240)]" />
      </div>
    );
  }

  if (fetchError || !device) {
    return (
      <div className="glass rounded-xl p-12 flex flex-col items-center text-center gap-4">
        <AlertTriangle size={36} className="text-red-400" />
        <div>
          <p className="text-white font-semibold">Device not found</p>
          <p className="text-sm text-[oklch(0.45_0.01_240)] mt-1">{fetchError}</p>
        </div>
        <Link href="/devices" className="text-sm text-[oklch(0.62_0.20_240)] hover:underline">
          ← Back to Devices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/devices/${id}`}
          className="p-2 rounded-lg border border-[oklch(0.22_0.01_240)] hover:border-[oklch(0.35_0.015_240)] text-[oklch(0.55_0.01_240)] hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit IoT Device</h1>
          <p className="text-sm text-[oklch(0.50_0.01_240)] mt-0.5">
            Updating {device.name} ({device.deviceId})
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="glass rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[oklch(0.17_0.008_240)] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.75_0.18_200)]">
              <Radio size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Device Specifications</h2>
              <p className="text-xs text-[oklch(0.50_0.01_240)]">
                Update device settings and machine assignment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Device Name *</label>
              <input {...register('name')} className={inputClass(!!errors.name)} />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Device ID *</label>
              <input {...register('deviceId')} className={inputClass(!!errors.deviceId)} />
              {errors.deviceId && (
                <p className="text-red-400 text-xs mt-1">{errors.deviceId.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Device Type</label>
              <input {...register('type')} className={inputClass()} />
            </div>

            <div>
              <label className={labelClass}>Firmware Version</label>
              <input {...register('firmwareVersion')} className={inputClass()} />
            </div>

            <div>
              <label className={labelClass}>MAC Address</label>
              <input {...register('macAddress')} className={inputClass()} />
            </div>

            <div>
              <label className={labelClass}>Serial Number</label>
              <input {...register('serialNumber')} className={inputClass()} />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select {...register('status')} className={inputClass()}>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Assigned Machine</label>
              <select {...register('machineId')} className={inputClass()}>
                <option value="">Unassigned</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.machineCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className={cn(inputClass(), 'resize-none')}
            />
          </div>
        </div>

        {submitError && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/devices/${id}`}
            className="px-4 py-2.5 rounded-lg border border-[oklch(0.22_0.01_240)] text-sm text-white hover:bg-[oklch(0.14_0.007_240)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-50 transition-all"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
