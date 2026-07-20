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
  Cpu,
  Radio,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useDevice } from '@/hooks/useDevice';
import { machinesApi } from '@/api/machines';
import { DeviceStatus, CreateDevicePayload, Machine } from '@/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Required').max(150),
  deviceId: z
    .string()
    .min(1, 'Required')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only'),
  type: z.string().default('ESP32'),
  firmwareVersion: z.string().optional(),
  macAddress: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(['online', 'offline', 'maintenance']).optional(),
  machineId: z.string().optional().nullable(),
  description: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

const STANDARD_SENSORS = [
  { name: 'Temperature Sensor (DS18B20)', unit: '°C', defaultInterval: '5s' },
  { name: 'Vibration Sensor (MPU6050)', unit: 'm/s²', defaultInterval: '1s' },
  { name: 'Current Sensor (ACS712)', unit: 'A', defaultInterval: '5s' },
  { name: 'Voltage Sensor', unit: 'V', defaultInterval: '5s' },
  { name: 'RPM Sensor', unit: 'RPM', defaultInterval: '1s' },
  { name: 'Sound Sensor (MAX4466)', unit: 'dB', defaultInterval: '5s' },
];

export default function NewDeviceClient() {
  const router = useRouter();
  const { createDevice } = useDevice();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'ESP32',
      firmwareVersion: 'v1.0.0',
      status: 'offline',
      machineId: '',
    },
  });

  useEffect(() => {
    machinesApi
      .getAll({ limit: 100 })
      .then((res) => {
        if (res.data.data) setMachines(res.data.data);
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreateDevicePayload = {
      name: data.name,
      deviceId: data.deviceId,
      type: data.type || 'ESP32',
      firmwareVersion: data.firmwareVersion || 'v1.0.0',
      macAddress: data.macAddress || undefined,
      serialNumber: data.serialNumber || undefined,
      status: data.status as DeviceStatus,
      machineId: data.machineId || null,
      description: data.description || undefined,
    };

    const result = await createDevice(payload);
    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to register device');
      setIsSubmitting(false);
      return;
    }

    const createdDeviceId = result.device?._id || result.device?.id;

    setIsSubmitting(false);
    if (createdDeviceId) {
      router.push(`/devices/${createdDeviceId}`);
    } else {
      router.push('/devices');
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/devices"
          className="p-2 rounded-lg border border-[oklch(0.22_0.01_240)] hover:border-[oklch(0.35_0.015_240)] text-[oklch(0.55_0.01_240)] hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Register IoT Device</h1>
          <p className="text-sm text-[oklch(0.50_0.01_240)] mt-0.5">
            Add a new ESP32 microcontroller to monitor industrial sensors
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Device Details */}
        <div className="glass rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[oklch(0.17_0.008_240)] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.75_0.18_200)]">
              <Radio size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Device Specifications</h2>
              <p className="text-xs text-[oklch(0.50_0.01_240)]">
                ESP32 hardware identity and identification
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Device Name *</label>
              <input
                {...register('name')}
                placeholder="e.g. Pump Line 1 ESP32 Controller"
                className={inputClass(!!errors.name)}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Device ID (Unique) *</label>
              <input
                {...register('deviceId')}
                placeholder="e.g. ESP32_PUMP_01"
                className={inputClass(!!errors.deviceId)}
              />
              {errors.deviceId && (
                <p className="text-red-400 text-xs mt-1">{errors.deviceId.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Device Type</label>
              <input {...register('type')} value="ESP32" readOnly className={inputClass()} />
            </div>

            <div>
              <label className={labelClass}>Firmware Version</label>
              <input
                {...register('firmwareVersion')}
                placeholder="v1.0.0"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass}>MAC Address</label>
              <input
                {...register('macAddress')}
                placeholder="e.g. 24:6F:28:AB:CD:EF"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass}>Serial Number</label>
              <input
                {...register('serialNumber')}
                placeholder="e.g. SN-ESP32-98765"
                className={inputClass()}
              />
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
                <option value="">Unassigned (Select later)</option>
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
              placeholder="Optional notes or configuration details..."
              className={cn(inputClass(), 'resize-none')}
            />
          </div>
        </div>

        {/* Automatic Sensor Provisioning Notice */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Automatic Sensor Provisioning
              </h3>
              <p className="text-xs text-[oklch(0.50_0.01_240)]">
                The platform will automatically initialize all 6 standard industrial sensors for
                this ESP32
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {STANDARD_SENSORS.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] p-3"
              >
                <div className="w-6 h-6 rounded-full bg-[oklch(0.52_0.24_240/0.2)] text-[oklch(0.62_0.20_240)] font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{s.name}</p>
                  <p className="text-[10px] font-mono text-[oklch(0.45_0.01_240)]">
                    Unit: {s.unit} · Interval: {s.defaultInterval}
                  </p>
                </div>
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {submitError && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/devices"
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
            {isSubmitting ? 'Registering...' : 'Register Device & Provision Sensors'}
          </button>
        </div>
      </form>
    </div>
  );
}
