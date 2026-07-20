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
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useMachine } from '@/hooks/useMachine';
import { machinesApi } from '@/api/machines';
import { MachineStatus, UpdateMachinePayload } from '@/types';
import { cn } from '@/lib/utils';

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

const SECTIONS = ['Basic Info', 'Specs', 'Operating Limits', 'Location', 'Media & Tags'] as const;

export default function EditMachineClient({ id }: { id: string }) {
  const router = useRouter();
  const { machine, isLoading, error: fetchError, fetchMachine, updateMachine } = useMachine();
  const [activeSection, setActiveSection] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [machineTypes, setMachineTypes] = useState<string[]>(PREDEFINED_TYPES);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  });

  const selectedType = watch('type');

  useEffect(() => {
    fetchMachine(id);
    machinesApi.getTypes().then((r) => {
      if (r.data.data) setMachineTypes(r.data.data);
    }).catch(() => {});
  }, [fetchMachine, id]);

  useEffect(() => {
    if (machine) {
      const isCustom = !PREDEFINED_TYPES.includes(machine.type);
      reset({
        machineCode: machine.machineCode,
        name: machine.name,
        type: isCustom ? 'Custom' : machine.type,
        customType: isCustom ? machine.type : '',
        manufacturer: machine.manufacturer || '',
        modelNumber: machine.modelNumber || '',
        serialNumber: machine.serialNumber || '',
        manufacturingYear: machine.manufacturingYear ?? undefined,
        installationDate: machine.installationDate ? new Date(machine.installationDate).toISOString().split('T')[0] : '',
        plant: machine.plant || '',
        department: machine.department || '',
        location: machine.location || '',
        status: machine.status,
        ratedRPM: machine.ratedRPM ?? undefined,
        ratedVoltage: machine.ratedVoltage ?? undefined,
        ratedCurrent: machine.ratedCurrent ?? undefined,
        ratedTemperature: machine.ratedTemperature ?? undefined,
        ratedPower: machine.ratedPower ?? undefined,
        maxTemperature: machine.operatingLimits?.maxTemperature ?? undefined,
        maxVibration: machine.operatingLimits?.maxVibration ?? undefined,
        maxCurrent: machine.operatingLimits?.maxCurrent ?? undefined,
        minRPM: machine.operatingLimits?.minRPM ?? undefined,
        description: machine.description || '',
      });
      setTags(machine.tags || []);
      if (machine.image) setImagePreview(machine.image);
    }
  }, [machine, reset]);

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const machineType = data.type === 'Custom' && data.customType ? data.customType : data.type;

    const payload: UpdateMachinePayload = {
      machineCode: data.machineCode,
      name: data.name,
      type: machineType,
      manufacturer: data.manufacturer || undefined,
      modelNumber: data.modelNumber || undefined,
      serialNumber: data.serialNumber || undefined,
      manufacturingYear: data.manufacturingYear ? Number(data.manufacturingYear) : undefined,
      installationDate: data.installationDate || undefined,
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
      },
      description: data.description || undefined,
      tags,
    };

    const result = await updateMachine(id, payload);
    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to update machine');
      setIsSubmitting(false);
      return;
    }

    if (imageFile) {
      await machinesApi.uploadImage(id, imageFile);
    }

    setIsSubmitting(false);
    router.push(`/machines/${id}`);
  };

  const inputClass = (hasError?: boolean) => cn(
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

  if (fetchError || !machine) {
    return (
      <div className="glass rounded-xl p-12 flex flex-col items-center text-center gap-4">
        <AlertTriangle size={36} className="text-red-400" />
        <div>
          <p className="text-white font-semibold">Machine not found</p>
          <p className="text-sm text-[oklch(0.45_0.01_240)] mt-1">{fetchError ?? 'Could not load machine data.'}</p>
        </div>
        <Link href="/machines" className="text-sm text-[oklch(0.62_0.20_240)] hover:underline">← Back to Machines</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/machines/${id}`} className="p-2 rounded-lg border border-[oklch(0.22_0.01_240)] hover:border-[oklch(0.35_0.015_240)] text-[oklch(0.55_0.01_240)] hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Machine</h1>
          <p className="text-sm text-[oklch(0.50_0.01_240)] mt-0.5">Updating {machine.name} ({machine.machineCode})</p>
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
        {/* Section 1 */}
        {activeSection === 0 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Machine Name *</label>
                <input {...register('name')} className={inputClass(!!errors.name)} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Machine Code *</label>
                <input {...register('machineCode')} className={inputClass(!!errors.machineCode)} />
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
                  <input {...register('customType')} className={inputClass()} />
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
                <input {...register('manufacturer')} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Model Number</label>
                <input {...register('modelNumber')} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Serial Number</label>
                <input {...register('serialNumber')} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Manufacturing Year</label>
                <input type="number" {...register('manufacturingYear')} min={1900} max={new Date().getFullYear()} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Installation Date</label>
                <input type="date" {...register('installationDate')} max={new Date().toISOString().split('T')[0]} className={inputClass()} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea {...register('description')} rows={3} className={cn(inputClass(), 'resize-none')} />
            </div>
          </div>
        )}

        {/* Section 2 */}
        {activeSection === 1 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Electrical & Mechanical Specs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'ratedRPM', label: 'Rated RPM', unit: 'RPM' },
                { key: 'ratedVoltage', label: 'Rated Voltage', unit: 'V' },
                { key: 'ratedCurrent', label: 'Rated Current', unit: 'A' },
                { key: 'ratedTemperature', label: 'Rated Temperature', unit: '°C' },
                { key: 'ratedPower', label: 'Rated Power', unit: 'kW' },
              ].map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <div className="relative">
                    <input type="number" step="any" {...register(field.key as keyof FormData)} className={cn(inputClass(), 'pr-12')} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[oklch(0.45_0.01_240)]">{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 */}
        {activeSection === 2 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Operating Limits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'maxTemperature', label: 'Max Temperature', unit: '°C' },
                { key: 'maxVibration', label: 'Max Vibration', unit: 'mm/s' },
                { key: 'maxCurrent', label: 'Max Current', unit: 'A' },
                { key: 'minRPM', label: 'Min RPM', unit: 'RPM' },
              ].map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <div className="relative">
                    <input type="number" step="any" {...register(field.key as keyof FormData)} className={cn(inputClass(), 'pr-14')} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[oklch(0.45_0.01_240)]">{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4 */}
        {activeSection === 3 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Location & Placement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Plant</label>
                <input {...register('plant')} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <input {...register('department')} className={inputClass()} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Specific Location</label>
                <input {...register('location')} className={inputClass()} />
              </div>
            </div>
          </div>
        )}

        {/* Section 5 */}
        {activeSection === 4 && (
          <div className="glass rounded-xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-white">Image & Tags</h2>
            <div>
              <label className={labelClass}>Machine Image</label>
              <div className="relative border-2 border-dashed border-[oklch(0.22_0.01_240)] rounded-xl overflow-hidden" style={{ minHeight: '180px' }}>
                {imagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <label className="absolute bottom-2 right-2 cursor-pointer bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                      Change Image
                      <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-[oklch(0.14_0.007_240)] transition-colors">
                    <Upload size={28} className="text-[oklch(0.35_0.01_240)] mb-2" />
                    <p className="text-sm text-[oklch(0.50_0.01_240)]">Click to upload machine image</p>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                  className={cn(inputClass(), 'flex-1')}
                />
                <button type="button" onClick={addTag} disabled={tags.length >= 20} className="px-3 py-2.5 rounded-lg bg-[oklch(0.52_0.24_240/0.2)] border border-[oklch(0.52_0.24_240/0.4)] text-[oklch(0.62_0.20_240)] hover:bg-[oklch(0.52_0.24_240/0.3)] transition-colors disabled:opacity-40">
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

        {submitError && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 mt-4">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-2">
            {activeSection > 0 && (
              <button type="button" onClick={() => setActiveSection((p) => p - 1)} className="px-4 py-2.5 rounded-lg border border-[oklch(0.22_0.01_240)] text-sm text-white hover:border-[oklch(0.35_0.015_240)] transition-colors">
                ← Back
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {activeSection < SECTIONS.length - 1 && (
              <button type="button" onClick={() => setActiveSection((p) => p + 1)} className="px-5 py-2.5 rounded-lg bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.35)] text-sm text-white hover:bg-[oklch(0.52_0.24_240/0.25)] transition-colors">
                Next →
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
