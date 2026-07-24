'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Edit2,
  Trash2,
  Cpu,
  MapPin,
  Calendar,
  Tag,
  Zap,
  Gauge,
  Activity,
  AlertTriangle,
  Info,
  Loader2,
  Upload,
  Brain,
  Wrench,
  Radio,
  Plus,
  Unlink,
  Layers,
  QrCode,
  Shield,
  GitBranch,
} from 'lucide-react';
import { useMachine } from '@/hooks/useMachine';
import { machinesApi } from '@/api/machines';
import { devicesApi } from '@/api/devices';
import { sensorsApi } from '@/api/sensors';
import { MachineStatusBadge } from '@/components/machines/MachineStatusBadge';
import { AILifecycleBadge } from '@/components/machines/AILifecycleBadge';
import { DataCollectionCard } from '@/components/machines/DataCollectionCard';
import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { AssignDeviceModal } from '@/components/devices/AssignDeviceModal';
import { DigitalTwinCard } from '@/components/machines/DigitalTwinCard';
import { LiveMonitoringTab } from '@/components/telemetry/LiveMonitoringTab';
import { HistoricalDataTab } from '@/components/datasets/HistoricalDataTab';
import { AIModelTab } from '@/components/ai/AIModelTab';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate } from '@/lib/utils';
import { Device, Sensor } from '@/types';

const TABS = [
  'Live Monitoring',
  'Historical Data',
  'AI Model',
  'Overview',
  'Specifications & Limits',
] as const;
type Tab = typeof TABS[number];

function SpecRow({ label, value, unit }: { label: string; value?: string | number | null; unit?: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[oklch(0.17_0.008_240)] last:border-0">
      <span className="text-xs text-[oklch(0.50_0.01_240)]">{label}</span>
      <span className="text-xs font-medium text-white">{value}{unit ? ` ${unit}` : ''}</span>
    </div>
  );
}

function InfoCard({ icon: Icon, color, title, children }: {
  icon: React.ElementType;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0', color)}>
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function MachineDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { machine, isLoading, error, fetchMachine, deleteMachine, uploadImage } = useMachine();
  const [activeTab, setActiveTab] = useState<Tab>('Live Monitoring');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // IoT Device & Sensors State
  const [assignedDevice, setAssignedDevice] = useState<Device | null>(null);
  const [machineSensors, setMachineSensors] = useState<Sensor[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';
  const canWrite = isAdmin || user?.role === 'maintenance_engineer';

  const fetchMachineDevice = useCallback(async () => {
    setLoadingDevice(true);
    try {
      const [devicesRes, sensorsRes] = await Promise.all([
        devicesApi.getAll({ machineId: id }),
        sensorsApi.getByMachine(id),
      ]);
      const devs = devicesRes.data.data ?? [];
      setAssignedDevice(devs.length > 0 ? devs[0] : null);
      setMachineSensors(sensorsRes.data.data ?? []);
    } catch {
      // Non-critical
    } finally {
      setLoadingDevice(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMachine(id);
    fetchMachineDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUnassignDevice = async () => {
    setUnassigning(true);
    try {
      await devicesApi.removeFromMachine(id);
      setAssignedDevice(null);
      setMachineSensors([]);
    } catch {
      // handle error
    } finally {
      setUnassigning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteMachine(id);
    if (result.success) {
      router.push('/machines');
    } else {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    await uploadImage(id, file);
    setImageUploading(false);
  };

  if (isLoading && !machine) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[oklch(0.45_0.01_240)]" />
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="glass rounded-xl p-12 flex flex-col items-center text-center gap-4">
        <AlertTriangle size={36} className="text-red-400" />
        <div>
          <p className="text-white font-semibold">Machine not found</p>
          <p className="text-sm text-[oklch(0.45_0.01_240)] mt-1">{error ?? 'This machine does not exist or you do not have access.'}</p>
        </div>
        <Link href="/machines" className="text-sm text-[oklch(0.62_0.20_240)] hover:underline">← Back to Machines</Link>
      </div>
    );
  }

  const createdByName = typeof machine.createdBy === 'object' ? machine.createdBy.name : 'Unknown';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Breadcrumb & Actions ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/machines" className="p-2 rounded-lg border border-[oklch(0.22_0.01_240)] hover:border-[oklch(0.35_0.015_240)] text-[oklch(0.55_0.01_240)] hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[oklch(0.45_0.01_240)]">Machines /</p>
              <p className="text-xs text-[oklch(0.62_0.20_240)]">{machine.machineCode}</p>
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">{machine.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MachineStatusBadge status={machine.status} size="md" />
          <AILifecycleBadge status={machine.aiLifecycleStatus} size="md" />
          <Link
            href={`/machines/${id}/passport`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 text-xs text-indigo-400 transition-colors"
          >
            <QrCode size={13} /> Passport
          </Link>
          {canWrite && (
            <Link
              href={`/machines/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.28_0.012_240)] bg-[oklch(0.14_0.007_240)] hover:border-[oklch(0.40_0.015_240)] px-3 py-2 text-xs text-white transition-colors"
            >
              <Edit2 size={13} /> Edit
            </Link>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs text-red-400 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* ─── Machine Image + Hero + Digital Twin 3D ─────────────────────── */}
      <div className="glass rounded-2xl p-5 lg:p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border border-[oklch(0.20_0.01_240)]">
        {/* Left & Center: Image + Machine Information */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1 min-w-0">
          {/* Image Card - Fixed Ratio Container matching MachineCard */}
          <div className="relative w-full sm:w-64 md:w-72 h-44 sm:h-48 rounded-xl overflow-hidden shrink-0 border border-[oklch(0.22_0.01_240)] bg-gradient-to-br from-[oklch(0.13_0.008_240)] to-[oklch(0.10_0.006_240)] shadow-lg">
            {machine.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={machine.image}
                alt={machine.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <Cpu size={48} className="text-[oklch(0.28_0.01_240)]" />
                <span className="text-[10px] text-[oklch(0.40_0.01_240)] uppercase tracking-wider font-medium">No Image</span>
              </div>
            )}

            {/* Status Overlay Badge */}
            <div className="absolute top-2.5 right-2.5">
              <MachineStatusBadge status={machine.status} size="sm" />
            </div>

            {/* Type Chip */}
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/80">
                <Tag size={9} />
                {machine.type}
              </span>
            </div>

            {canWrite && (
              <label className="absolute bottom-2.5 right-2.5 cursor-pointer">
                <div className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-sm hover:bg-black/90 text-white text-[10px] px-2.5 py-1 transition-colors font-medium">
                  {imageUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {imageUploading ? 'Uploading...' : 'Change'}
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" disabled={imageUploading} />
              </label>
            )}
          </div>

          {/* Info Content */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[oklch(0.62_0.20_240)] tracking-wider px-2 py-0.5 rounded bg-[oklch(0.52_0.24_240/0.12)] border border-[oklch(0.52_0.24_240/0.25)]">
                  {machine.machineCode}
                </span>
                {machine.manufacturer && (
                  <span className="text-xs text-[oklch(0.55_0.01_240)] font-medium">
                    by {machine.manufacturer}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5 leading-tight">
                {machine.name}
              </h2>
              {machine.modelNumber && (
                <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">
                  Model: <span className="text-white font-mono">{machine.modelNumber}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[oklch(0.50_0.01_240)] pt-2 border-t border-[oklch(0.17_0.008_240)]">
              {(machine.plant || machine.department) && (
                <span className="flex items-center gap-1.5 text-[oklch(0.60_0.01_240)]">
                  <MapPin size={13} className="text-[oklch(0.75_0.18_200)] shrink-0" />
                  {[machine.department, machine.plant].filter(Boolean).join(' · ')}
                </span>
              )}
              {machine.installationDate && (
                <span className="flex items-center gap-1.5 text-[oklch(0.60_0.01_240)]">
                  <Calendar size={13} className="text-[oklch(0.75_0.18_200)] shrink-0" />
                  Installed {formatDate(machine.installationDate)}
                </span>
              )}
            </div>

            {machine.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {machine.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.52_0.24_240/0.12)] border border-[oklch(0.52_0.24_240/0.25)] text-[oklch(0.62_0.20_240)] text-[10px] px-2.5 py-0.5 font-medium">
                    <Tag size={9} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Machine Digital Twin 3D Section */}
        <div className="w-full xl:w-[480px] shrink-0 border-t xl:border-t-0 xl:border-l border-[oklch(0.20_0.01_240)] pt-5 xl:pt-0 xl:pl-6">
          <DigitalTwinCard machine={machine} canWrite={canWrite} onUpdate={() => fetchMachine(id)} />
        </div>
      </div>

      {/* ─── Live Data Acquisition & Recording Control Card ──────────────── */}
      <DataCollectionCard machine={machine} onRefresh={() => fetchMachine(id)} />

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[oklch(0.11_0.006_240)] border border-[oklch(0.18_0.009_240)] rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all',
              activeTab === tab
                ? 'bg-[oklch(0.52_0.24_240/0.2)] border border-[oklch(0.52_0.24_240/0.35)] text-white'
                : 'text-[oklch(0.50_0.01_240)] hover:text-white'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ──────────────────────────────────────────────────── */}
      {activeTab === 'Historical Data' && (
        <div className="animate-fade-in">
          <HistoricalDataTab machineId={id} />
        </div>
      )}

      {activeTab === 'AI Model' && (
        <div className="animate-fade-in">
          <AIModelTab machineId={id} />
        </div>
      )}

      {activeTab === 'Overview' && (
        <div className="space-y-5 animate-fade-in">
          {/* Data Collection & Model Training Overview */}
          <DataCollectionCard machine={machine} onRefresh={() => fetchMachine(id)} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Assigned IoT Device & Hardware Details */}
            <div className="glass rounded-xl p-5 border-[oklch(0.22_0.01_240)]">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg border bg-[oklch(0.52_0.24_240/0.15)] border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.75_0.18_200)]">
                    <Radio size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Assigned IoT Device</h3>
                    <p className="text-[11px] text-[oklch(0.50_0.01_240)]">
                      ESP32 hardware controller and connected sensors
                    </p>
                  </div>
                </div>

                {canWrite && (
                  <div>
                    {assignedDevice ? (
                      <button
                        onClick={handleUnassignDevice}
                        disabled={unassigning}
                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {unassigning ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                        Unassign Device
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="inline-flex items-center gap-1 text-xs text-white bg-[oklch(0.52_0.24_240/0.2)] border border-[oklch(0.52_0.24_240/0.4)] hover:bg-[oklch(0.52_0.24_240/0.3)] px-3 py-1 rounded-lg transition-colors font-medium"
                      >
                        <Plus size={13} />
                        Assign Device
                      </button>
                    )}
                  </div>
                )}
              </div>

              {loadingDevice ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-[oklch(0.45_0.01_240)]" />
                </div>
              ) : assignedDevice ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[oklch(0.16_0.008_240)] border border-[oklch(0.22_0.01_240)] flex items-center justify-center font-mono font-bold text-xs text-[oklch(0.75_0.18_200)]">
                        ESP
                      </div>
                      <div>
                        <Link
                          href={`/devices/${assignedDevice._id}`}
                          className="font-bold text-white text-xs hover:text-[oklch(0.75_0.18_200)] transition-colors"
                        >
                          {assignedDevice.name}
                        </Link>
                        <p className="text-[10px] font-mono text-[oklch(0.50_0.01_240)] mt-0.5">
                          {assignedDevice.deviceId} · FW: {assignedDevice.firmwareVersion || 'v1.0.0'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <DeviceStatusBadge status={assignedDevice.status} size="sm" />
                      <Link
                        href={`/devices/${assignedDevice._id}`}
                        className="text-xs text-[oklch(0.62_0.20_240)] hover:underline"
                      >
                        View Device →
                      </Link>
                    </div>
                  </div>

                  {/* Connected Sensors Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-[oklch(0.45_0.01_240)]">
                        Connected Sensors ({machineSensors.length})
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {machineSensors.map((s) => (
                        <div
                          key={s._id}
                          className="p-2.5 rounded-lg bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate text-[11px]">
                              {s.sensorName.split(' ')[0]}
                            </p>
                            <p className="text-[9px] font-mono text-[oklch(0.45_0.01_240)]">
                              {s.unit} · {s.samplingInterval}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              s.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <Radio size={28} className="mx-auto text-[oklch(0.35_0.01_240)]" />
                  <p className="text-xs text-[oklch(0.50_0.01_240)]">
                    No IoT device assigned to this machine.
                  </p>
                  {canWrite && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="text-xs text-[oklch(0.62_0.20_240)] hover:underline font-medium"
                    >
                      + Assign ESP32 device
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Assign Device Modal */}
            {showAssignModal && (
              <AssignDeviceModal
                machineId={id}
                machineName={machine.name}
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                onAssigned={fetchMachineDevice}
              />
            )}
            <div className="glass rounded-xl p-5 border-dashed opacity-60">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg border bg-[oklch(0.75_0.18_200/0.15)] border-[oklch(0.75_0.18_200/0.3)] flex items-center justify-center">
                  <Wrench size={14} className="text-[oklch(0.75_0.18_200)]" />
                </div>
                <h3 className="text-sm font-semibold text-white">Maintenance</h3>
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-[oklch(0.75_0.18_200/0.2)] text-[oklch(0.75_0.18_200)] border border-[oklch(0.75_0.18_200/0.3)] rounded px-1.5 py-0.5 ml-auto">Soon</span>
              </div>
              <p className="text-xs text-[oklch(0.40_0.01_240)]">Maintenance records and schedules will appear here.</p>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <InfoCard icon={Info} color="bg-[oklch(0.62_0.20_240/0.15)] text-[oklch(0.62_0.20_240)] border-[oklch(0.62_0.20_240/0.3)]" title="Machine Info">
              <SpecRow label="UUID" value={machine.uuid?.slice(0, 8) + '...'} />
              <SpecRow label="Code" value={machine.machineCode} />
              <SpecRow label="Model" value={machine.modelNumber} />
              <SpecRow label="Serial" value={machine.serialNumber} />
              <SpecRow label="Year" value={machine.manufacturingYear} />
              <SpecRow label="Added by" value={createdByName} />
              <SpecRow label="Created" value={formatDate(machine.createdAt)} />
            </InfoCard>

            {/* Digital Twin Coming Soon */}
            <div className="glass rounded-xl p-5 border-dashed opacity-60">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg border bg-[oklch(0.80_0.17_80/0.15)] border-[oklch(0.80_0.17_80/0.3)] flex items-center justify-center">
                  <Brain size={14} className="text-[oklch(0.80_0.17_80)]" />
                </div>
                <h3 className="text-sm font-semibold text-white">Digital Twin</h3>
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-[oklch(0.80_0.17_80/0.2)] text-[oklch(0.80_0.17_80)] border border-[oklch(0.80_0.17_80/0.3)] rounded px-1.5 py-0.5 ml-auto">Soon</span>
              </div>
              <p className="text-xs text-[oklch(0.40_0.01_240)]">AI-powered digital twin simulation coming in a future module.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Specifications & Limits' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in font-mono">
          <InfoCard icon={Zap} color="bg-amber-500/15 text-amber-400 border-amber-500/30" title="Electrical & Acoustic Specs">
            <SpecRow label="Rated Voltage" value={machine.ratedVoltage} unit="V" />
            <SpecRow label="Rated Current" value={machine.ratedCurrent} unit="A" />
            <SpecRow label="Rated Sound Level" value={machine.ratedSound || 65} unit="dB" />
            <SpecRow label="Rated Vibration" value={machine.ratedVibration || 1.2} unit="mm/s" />
          </InfoCard>

          <InfoCard icon={Gauge} color="bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30" title="Mechanical Specs">
            <SpecRow label="Rated RPM" value={machine.ratedRPM} unit="RPM" />
            <SpecRow label="Rated Temperature" value={machine.ratedTemperature} unit="°C" />
          </InfoCard>

          <InfoCard icon={AlertTriangle} color="bg-rose-500/15 text-rose-400 border-rose-500/30" title="Operating Safety Thresholds">
            <SpecRow label="Max Temperature" value={machine.operatingLimits?.maxTemperature || 80} unit="°C" />
            <SpecRow label="Max Vibration" value={machine.operatingLimits?.maxVibration || 2.5} unit="mm/s" />
            <SpecRow label="Max Current" value={machine.operatingLimits?.maxCurrent || 15} unit="A" />
            <SpecRow label="Min RPM" value={machine.operatingLimits?.minRPM || 1000} unit="RPM" />
          </InfoCard>

          <InfoCard icon={Info} color="bg-purple-500/15 text-purple-400 border-purple-500/30" title="Machine Identity">
            <SpecRow label="UUID" value={machine.uuid ? machine.uuid.slice(0, 8) + '...' : undefined} />
            <SpecRow label="Code" value={machine.machineCode} />
            <SpecRow label="Manufacturer" value={machine.manufacturer || 'Industrial Supply Corp'} />
            <SpecRow label="Model Number" value={machine.modelNumber} />
            <SpecRow label="Serial Number" value={machine.serialNumber} />
            <SpecRow label="Manufacturing Year" value={machine.manufacturingYear} />
          </InfoCard>

          <InfoCard icon={Calendar} color="bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30" title="Lifecycle Audit">
            <SpecRow label="Installation Date" value={machine.installationDate ? formatDate(machine.installationDate) : undefined} />
            <SpecRow label="Commissioning Date" value={machine.commissioningDate ? formatDate(machine.commissioningDate) : undefined} />
            <SpecRow label="Created Date" value={formatDate(machine.createdAt)} />
            <SpecRow label="Last Updated" value={formatDate(machine.updatedAt)} />
          </InfoCard>
        </div>
      )}

      {activeTab === 'Live Monitoring' && (
        <div className="animate-fade-in">
          <LiveMonitoringTab
            machineId={machine._id.toString()}
            assignedDevice={assignedDevice}
            operatingLimits={machine.operatingLimits}
          />
        </div>
      )}

      {/* ─── Delete Confirm Modal ──────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative glass rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Delete Machine?</p>
                <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[oklch(0.55_0.01_240)]">
              You are about to delete <span className="text-white font-medium">{machine.name}</span> ({machine.machineCode}). All associated data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-[oklch(0.25_0.01_240)] py-2.5 text-sm text-white hover:border-[oklch(0.35_0.015_240)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 text-sm font-medium py-2.5 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
