'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  Save,
  Loader2,
  Upload,
  X,
  Plus,
  AlertCircle,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useMachine } from '@/hooks/useMachine';
import { machinesApi } from '@/api/machines';
import { MachineStatus, CreateMachinePayload } from '@/types';
import { cn } from '@/lib/utils';

// ─── Zod schema (client-side) ─────────────────────────────────────────────────
const numOptional = (schema: z.ZodNumber) =>
  z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), schema.optional());

const schema = z.object({
  machineCode: z.string().min(1, 'Required').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only'),
  name: z.string().min(1, 'Required').max(150),
  type: z.string().min(1, 'Required'),
  customType: z.string().optional(),
  manufacturer: z.string().max(100).optional(),
  modelNumber: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  manufacturingYear: numOptional(z.number().int().min(1900).max(new Date().getFullYear())),
  installationDate: z.string().optional(),
  commissioningDate: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  plant: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  status: z.enum(['active', 'idle', 'maintenance', 'offline', 'fault']).optional(),
  ratedRPM: numOptional(z.number().positive()),
  ratedVoltage: numOptional(z.number().positive()),
  ratedCurrent: numOptional(z.number().positive()),
  ratedTemperature: numOptional(z.number().positive()),
  ratedPower: numOptional(z.number().positive()),
  maxTemperature: numOptional(z.number().nonnegative()),
  maxVibration: numOptional(z.number().nonnegative()),
  maxCurrent: numOptional(z.number().nonnegative()),
  minRPM: numOptional(z.number().nonnegative()),
  failureTemperature: numOptional(z.number().nonnegative()),
  failureVibration: numOptional(z.number().nonnegative()),
  failureCurrent: numOptional(z.number().nonnegative()),
  description: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

const PREDEFINED_TYPES = [
  'AC Motor', 'DC Motor', 'Pump', 'Compressor', 'Conveyor',
  'Generator', 'CNC Machine', 'Lathe', 'Milling Machine',
  'Fan', 'Turbine', 'Gearbox', 'Custom',
];

const STATUS_OPTIONS: { value: MachineStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'idle', label: 'Idle' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
  { value: 'fault', label: 'Fault' },
];

const SECTIONS = ['Basic Info', 'Specs', 'Operating Limits', 'Sensor Configuration', 'Location', 'Media & Tags'] as const;

export interface SensorFormItem {
  sensorKey: string;
  type: string;
  displayName: string;
  unit: string;
  order: number;
  enabled: boolean;
  minLimit?: number;
  ratedValue?: number;
  maxLimit?: number;
  weight?: number;
  criticality?: 'Low' | 'Medium' | 'High' | 'Critical';
}

const DEFAULT_SENSORS_FORM: SensorFormItem[] = [
  { sensorKey: 'temperature', type: 'Temperature', displayName: 'Temperature', unit: '°C', order: 1, enabled: true, minLimit: 0, ratedValue: 45, maxLimit: 80, weight: 20, criticality: 'High' },
  { sensorKey: 'vibration', type: 'Vibration', displayName: 'Vibration', unit: 'g', order: 2, enabled: true, minLimit: 0, ratedValue: 0.15, maxLimit: 2.5, weight: 20, criticality: 'Critical' },
  { sensorKey: 'current', type: 'Current', displayName: 'Current', unit: 'A', order: 3, enabled: true, minLimit: 0, ratedValue: 3.0, maxLimit: 15, weight: 20, criticality: 'High' },
  { sensorKey: 'voltage', type: 'Voltage', displayName: 'Voltage', unit: 'V', order: 4, enabled: true, minLimit: 180, ratedValue: 230, maxLimit: 260, weight: 15, criticality: 'Medium' },
  { sensorKey: 'rpm', type: 'RPM', displayName: 'RPM', unit: 'RPM', order: 5, enabled: true, minLimit: 1000, ratedValue: 1500, maxLimit: 3000, weight: 15, criticality: 'Medium' },
  { sensorKey: 'sound', type: 'Sound', displayName: 'Sound Level', unit: 'dB', order: 6, enabled: true, minLimit: 0, ratedValue: 60, maxLimit: 85, weight: 10, criticality: 'Low' },
];

export default function NewMachineClient() {
  const router = useRouter();
  const { createMachine } = useMachine();
  const [activeSection, setActiveSection] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [machineTypes, setMachineTypes] = useState<string[]>(PREDEFINED_TYPES);
  const [sensors, setSensors] = useState<SensorFormItem[]>(DEFAULT_SENSORS_FORM);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'idle', type: '' },
  });

  const selectedType = watch('type');

  useEffect(() => {
    machinesApi.getTypes().then((r) => {
      if (r.data.data) setMachineTypes(r.data.data);
    }).catch(() => {});
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 20) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const addSensorItem = useCallback(() => {
    const idNum = sensors.length + 1;
    const newSensor: SensorFormItem = {
      sensorKey: `custom_sensor_${idNum}`,
      type: 'Custom',
      displayName: `Custom Sensor ${idNum}`,
      unit: '%',
      order: idNum,
      enabled: true,
      minLimit: 0,
      ratedValue: 50,
      maxLimit: 100,
      weight: 0,
      criticality: 'Medium',
    };
    setSensors((prev) => [...prev, newSensor]);
  }, [sensors.length]);

  const removeSensorItem = useCallback((index: number) => {
    setSensors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSensorItem = useCallback((index: number, field: keyof SensorFormItem, value: any) => {
    setSensors((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const machineType = data.type === 'Custom' && data.customType ? data.customType : data.type;

    const payload: any = {
      machineCode: data.machineCode,
      name: data.name,
      type: machineType,
      manufacturer: data.manufacturer || undefined,
      modelNumber: data.modelNumber || undefined,
      serialNumber: data.serialNumber || undefined,
      manufacturingYear: data.manufacturingYear ? Number(data.manufacturingYear) : undefined,
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
      commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : undefined,
      lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : undefined,
      plant: data.plant || undefined,
      department: data.department || undefined,
      location: data.location || undefined,
      status: data.status,
      ratedRPM: data.ratedRPM ? Number(data.ratedRPM) : undefined,
      ratedVoltage: data.ratedVoltage ? Number(data.ratedVoltage) : undefined,
      ratedCurrent: data.ratedCurrent ? Number(data.ratedCurrent) : undefined,
      ratedTemperature: data.ratedTemperature ? Number(data.ratedTemperature) : undefined,
      ratedPower: data.ratedPower ? Number(data.ratedPower) : undefined,
      operatingLimits: {
        maxTemperature: data.maxTemperature ? Number(data.maxTemperature) : undefined,
        maxVibration: data.maxVibration ? Number(data.maxVibration) : undefined,
        maxCurrent: data.maxCurrent ? Number(data.maxCurrent) : undefined,
        minRPM: data.minRPM ? Number(data.minRPM) : undefined,
        failureTemperature: data.failureTemperature ? Number(data.failureTemperature) : undefined,
        failureVibration: data.failureVibration ? Number(data.failureVibration) : undefined,
        failureCurrent: data.failureCurrent ? Number(data.failureCurrent) : undefined,
      },
      sensors,
      description: data.description || undefined,
      tags,
    };

    const result = await createMachine(payload);
    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to create machine');
      setIsSubmitting(false);
      return;
    }

    const createdMachineId = result.machine?._id ? String(result.machine._id) : (result.machine?.id ? String(result.machine.id) : '');

    // Upload image if selected
    if (imageFile && createdMachineId) {
      await machinesApi.uploadImage(createdMachineId, imageFile);
    }

    setIsSubmitting(false);
    if (createdMachineId) {
      router.push(`/machines/${createdMachineId}`);
    } else {
      router.push('/machines');
    }
  };

  const inputClass = (hasError?: boolean) => cn(
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
        <Link href="/machines" className="p-2 rounded-lg border border-[oklch(0.22_0.01_240)] hover:border-[oklch(0.35_0.015_240)] text-[oklch(0.55_0.01_240)] hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New Machine</h1>
          <p className="text-sm text-[oklch(0.50_0.01_240)] mt-0.5">Register a new industrial machine</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-[oklch(0.11_0.006_240)] border border-[oklch(0.18_0.009_240)] rounded-xl p-1 overflow-x-auto">
        {SECTIONS.map((section, i) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(i)}
            className={cn(
              'flex-1 min-w-fit text-xs font-semibold px-3 py-2 rounded-lg transition-all whitespace-nowrap',
              activeSection === i
                ? 'bg-[oklch(0.52_0.24_240/0.2)] border border-[oklch(0.52_0.24_240/0.35)] text-white'
                : 'text-[oklch(0.50_0.01_240)] hover:text-white'
            )}
          >
            {i + 1}. {section}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ─── Section 1: Basic Info ─────────────────────────────────────── */}
        {activeSection === 0 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Machine Name *</label>
                <input {...register('name')} placeholder="e.g. Primary Cooling Pump" className={inputClass(!!errors.name)} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Machine Code *</label>
                <input {...register('machineCode')} placeholder="e.g. PCP-001" className={inputClass(!!errors.machineCode)} />
                {errors.machineCode && <p className="text-red-400 text-xs mt-1">{errors.machineCode.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Machine Type *</label>
                <select {...register('type')} className={inputClass(!!errors.type)}>
                  <option value="">Select type...</option>
                  {machineTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.type && <p className="text-red-400 text-xs mt-1">{errors.type.message}</p>}
              </div>

              {selectedType === 'Custom' && (
                <div>
                  <label className={labelClass}>Custom Type Name *</label>
                  <input {...register('customType')} placeholder="Enter custom machine type" className={inputClass()} />
                </div>
              )}

              <div>
                <label className={labelClass}>Status</label>
                <select {...register('status')} className={inputClass()}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Manufacturer</label>
                <input {...register('manufacturer')} placeholder="e.g. Grundfos" className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Model Number</label>
                <input {...register('modelNumber')} placeholder="e.g. CM5-6 A-R-G-E-AQQE" className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Serial Number</label>
                <input {...register('serialNumber')} placeholder="e.g. SN-2024-001234" className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Manufacturing Year</label>
                <input type="number" {...register('manufacturingYear')} placeholder={String(new Date().getFullYear())} min={1900} max={new Date().getFullYear()} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Installation Date</label>
                <input type="date" {...register('installationDate')} max={new Date().toISOString().split('T')[0]} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Commissioning Date</label>
                <input type="date" {...register('commissioningDate')} max={new Date().toISOString().split('T')[0]} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Last Maintenance Date</label>
                <input type="date" {...register('lastMaintenanceDate')} max={new Date().toISOString().split('T')[0]} className={inputClass()} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Optional description of this machine..."
                className={cn(inputClass(), 'resize-none')}
              />
            </div>
          </div>
        )}

        {/* ─── Section 2: Specs ──────────────────────────────────────────── */}
        {activeSection === 1 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Electrical & Mechanical Specs</h2>
              <span className="text-[10px] text-[oklch(0.50_0.01_240)] bg-[oklch(0.15_0.008_240)] border border-[oklch(0.22_0.01_240)] rounded px-2 py-0.5">Optional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'ratedRPM', label: 'Rated RPM', unit: 'RPM', placeholder: '1450' },
                { key: 'ratedVoltage', label: 'Rated Voltage', unit: 'V', placeholder: '415' },
                { key: 'ratedCurrent', label: 'Rated Current', unit: 'A', placeholder: '12.5' },
                { key: 'ratedTemperature', label: 'Rated Temperature', unit: '°C', placeholder: '80' },
                { key: 'ratedPower', label: 'Rated Power', unit: 'kW', placeholder: '5.5' },
              ].map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      {...register(field.key as keyof FormData)}
                      placeholder={field.placeholder}
                      className={cn(inputClass(), 'pr-12')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[oklch(0.45_0.01_240)]">{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Section 3: Operating Limits ───────────────────────────────── */}
        {activeSection === 2 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Operating Limits</h2>
                <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">Alert thresholds for predictive maintenance</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-[oklch(0.62_0.20_240/0.08)] border border-[oklch(0.62_0.20_240/0.2)] rounded-lg px-3 py-2.5">
              <Info size={14} className="text-[oklch(0.62_0.20_240)] shrink-0 mt-0.5" />
              <p className="text-xs text-[oklch(0.60_0.01_240)]">These limits will be used to trigger alerts when sensor readings exceed safe operating boundaries.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'maxTemperature', label: 'Max Temperature (Warning)', unit: '°C', placeholder: '80' },
                { key: 'failureTemperature', label: 'Failure Temperature (Emergency)', unit: '°C', placeholder: '100' },
                { key: 'maxVibration', label: 'Max Vibration (Warning)', unit: 'g', placeholder: '2.5' },
                { key: 'failureVibration', label: 'Failure Vibration (Emergency)', unit: 'g', placeholder: '3.5' },
                { key: 'maxCurrent', label: 'Max Current (Warning)', unit: 'A', placeholder: '15' },
                { key: 'failureCurrent', label: 'Failure Current (Emergency)', unit: 'A', placeholder: '20' },
                { key: 'minRPM', label: 'Min Safe RPM', unit: 'RPM', placeholder: '1000' },
              ].map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      {...register(field.key as keyof FormData)}
                      placeholder={field.placeholder}
                      className={cn(inputClass(), 'pr-14')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[oklch(0.45_0.01_240)]">{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Section 4: Sensor Configuration ──────────────────────────── */}
        {activeSection === 3 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Sensor Configuration</h2>
                <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">Define installed sensors, types, units, thresholds, and importance weights.</p>
              </div>
              <button
                type="button"
                onClick={addSensorItem}
                className="px-3 py-1.5 rounded-lg bg-[oklch(0.52_0.24_240/0.2)] border border-[oklch(0.52_0.24_240/0.4)] text-[oklch(0.65_0.20_240)] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Add Sensor
              </button>
            </div>

            <div className="space-y-3">
              {sensors.map((sensor, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[oklch(0.20_0.01_240)] bg-[oklch(0.10_0.005_240)] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sensor.enabled}
                        onChange={(e) => updateSensorItem(idx, 'enabled', e.target.checked)}
                        className="rounded border-[oklch(0.30_0.01_240)] accent-[oklch(0.52_0.24_240)] w-4 h-4"
                      />
                      <input
                        type="text"
                        value={sensor.displayName}
                        onChange={(e) => updateSensorItem(idx, 'displayName', e.target.value)}
                        placeholder="Sensor Display Name"
                        className="bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2.5 py-1 font-semibold"
                      />
                      <span className="text-[10px] text-[oklch(0.50_0.01_240)] font-mono">#{idx + 1}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSensorItem(idx)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] text-[oklch(0.50_0.01_240)] block mb-1">Type</label>
                      <select
                        value={sensor.type}
                        onChange={(e) => updateSensorItem(idx, 'type', e.target.value)}
                        className="w-full bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2 py-1"
                      >
                        {['Temperature', 'Vibration', 'Current', 'Voltage', 'RPM', 'Sound', 'Pressure', 'Flow', 'Oil Level', 'Humidity', 'Custom'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[oklch(0.50_0.01_240)] block mb-1">Unit</label>
                      <input
                        type="text"
                        value={sensor.unit}
                        onChange={(e) => updateSensorItem(idx, 'unit', e.target.value)}
                        placeholder="e.g. °C, bar, g"
                        className="w-full bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2 py-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[oklch(0.50_0.01_240)] block mb-1">Rated Value</label>
                      <input
                        type="number"
                        step="any"
                        value={sensor.ratedValue ?? ''}
                        onChange={(e) => updateSensorItem(idx, 'ratedValue', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="45"
                        className="w-full bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2 py-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[oklch(0.50_0.01_240)] block mb-1">Max Limit</label>
                      <input
                        type="number"
                        step="any"
                        value={sensor.maxLimit ?? ''}
                        onChange={(e) => updateSensorItem(idx, 'maxLimit', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="80"
                        className="w-full bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2 py-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[oklch(0.50_0.01_240)] block mb-1">Weight (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={sensor.weight ?? ''}
                        onChange={(e) => updateSensorItem(idx, 'weight', e.target.value ? Number(e.target.value) : 0)}
                        placeholder="20"
                        className="w-full bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2 py-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[oklch(0.50_0.01_240)] block mb-1">Criticality</label>
                      <select
                        value={sensor.criticality || 'Medium'}
                        onChange={(e) => updateSensorItem(idx, 'criticality', e.target.value)}
                        className="w-full bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded text-xs text-white px-2 py-1"
                      >
                        {['Low', 'Medium', 'High', 'Critical'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[oklch(0.20_0.01_240)] bg-[oklch(0.12_0.006_240)] text-xs">
              <span className="text-[oklch(0.55_0.01_240)]">Total Dynamic Sensor Weight Sum:</span>
              <span className={cn('font-bold font-mono', sensors.filter(s => s.enabled).reduce((a, b) => a + (b.weight || 0), 0) === 100 ? 'text-emerald-400' : 'text-amber-400')}>
                {sensors.filter(s => s.enabled).reduce((a, b) => a + (b.weight || 0), 0)}%
              </span>
            </div>
          </div>
        )}

        {/* ─── Section 5: Location ───────────────────────────────────────── */}
        {activeSection === 4 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Location & Placement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Plant</label>
                <input {...register('plant')} placeholder="e.g. Plant A" className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <input {...register('department')} placeholder="e.g. Production" className={inputClass()} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Specific Location</label>
                <input {...register('location')} placeholder="e.g. Section B, Bay 3, Level 2" className={inputClass()} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Section 6: Media & Tags ──────────────────────────────────── */}
        {activeSection === 5 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Image & Tags</h2>

            {/* Image Upload */}
            <div>
              <label className={labelClass}>Machine Image</label>
              <div
                className="relative border-2 border-dashed border-[oklch(0.22_0.01_240)] rounded-xl overflow-hidden"
                style={{ minHeight: '180px' }}
              >
                {imagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-[oklch(0.14_0.007_240)] transition-colors">
                    <Upload size={28} className="text-[oklch(0.35_0.01_240)] mb-2" />
                    <p className="text-sm text-[oklch(0.50_0.01_240)]">Click to upload machine image</p>
                    <p className="text-xs text-[oklch(0.38_0.008_240)] mt-1">JPEG, PNG, WebP · Max 5MB</p>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                  </label>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelClass}>Tags <span className="text-[oklch(0.40_0.01_240)]">(max 20)</span></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="e.g. critical, line-1..."
                  className={cn(inputClass(), 'flex-1')}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={tags.length >= 20}
                  className="px-3 py-2.5 rounded-lg bg-[oklch(0.52_0.24_240/0.2)] border border-[oklch(0.52_0.24_240/0.4)] text-[oklch(0.62_0.20_240)] hover:bg-[oklch(0.52_0.24_240/0.3)] transition-colors disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.52_0.24_240/0.12)] border border-[oklch(0.52_0.24_240/0.25)] text-[oklch(0.62_0.20_240)] text-xs px-2.5 py-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors ml-0.5">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Error ───────────────────────────────────────────────────────── */}
        {submitError && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        {/* ─── Navigation ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {activeSection > 0 && (
              <button type="button" onClick={() => setActiveSection((p) => p - 1)} className="px-4 py-2.5 rounded-lg border border-[oklch(0.22_0.01_240)] text-sm text-white hover:border-[oklch(0.35_0.015_240)] transition-colors">
                ← Back
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {activeSection < SECTIONS.length - 1 ? (
              <button type="button" onClick={() => setActiveSection((p) => p + 1)} className="px-5 py-2.5 rounded-lg bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.35)] text-sm text-white hover:bg-[oklch(0.52_0.24_240/0.25)] transition-colors">
                Next →
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? 'Creating...' : 'Create Machine'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
