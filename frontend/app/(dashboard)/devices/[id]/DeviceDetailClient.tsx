'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Edit2,
  Trash2,
  Cpu,
  Radio,
  Wifi,
  WifiOff,
  Wrench,
  Layers,
  Clock,
  Settings2,
  AlertTriangle,
  Info,
  Loader2,
  Activity,
  CheckCircle2,
  XCircle,
  Zap,
  Sliders,
  X,
} from 'lucide-react';
import { useDevice } from '@/hooks/useDevice';
import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { SensorCard } from '@/components/devices/SensorCard';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { Sensor, SamplingInterval, SensorStatus } from '@/types';

const SAMPLING_OPTIONS: SamplingInterval[] = ['1s', '5s', '10s', '30s', '60s'];

export default function DeviceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { device, sensors, isLoading, error, fetchDevice, deleteDevice, updateSensor } = useDevice();

  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sensor Config Modal state
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>('active');
  const [samplingInterval, setSamplingInterval] = useState<SamplingInterval>('5s');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  // Threshold form states
  const [maxTemp, setMaxTemp] = useState<string>('');
  const [maxVib, setMaxVib] = useState<string>('');
  const [maxCurr, setMaxCurr] = useState<string>('');
  const [minVolt, setMinVolt] = useState<string>('');
  const [maxVolt, setMaxVolt] = useState<string>('');
  const [minRpm, setMinRpm] = useState<string>('');
  const [maxSound, setMaxSound] = useState<string>('');

  const [savingSensor, setSavingSensor] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';
  const canWrite = isAdmin || user?.role === 'maintenance_engineer';

  useEffect(() => {
    fetchDevice(id);
  }, [fetchDevice, id]);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteDevice(id);
    if (result.success) {
      router.push('/devices');
    } else {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const openSensorConfig = (sensor: Sensor) => {
    setEditingSensor(sensor);
    setSensorStatus(sensor.status);
    setSamplingInterval(sensor.samplingInterval);
    setIsEnabled(sensor.isEnabled);
    setSensorError(null);

    const t = sensor.thresholds || {};
    setMaxTemp(t.maxTemperature != null ? String(t.maxTemperature) : '');
    setMaxVib(t.maxVibration != null ? String(t.maxVibration) : '');
    setMaxCurr(t.maxCurrent != null ? String(t.maxCurrent) : '');
    setMinVolt(t.minVoltage != null ? String(t.minVoltage) : '');
    setMaxVolt(t.maxVoltage != null ? String(t.maxVoltage) : '');
    setMinRpm(t.minRPM != null ? String(t.minRPM) : '');
    setMaxSound(t.maxSound != null ? String(t.maxSound) : '');
  };

  const handleSaveSensorConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSensor) return;

    setSavingSensor(true);
    setSensorError(null);

    const result = await updateSensor(editingSensor._id, {
      status: sensorStatus,
      samplingInterval,
      isEnabled,
      thresholds: {
        maxTemperature: maxTemp ? Number(maxTemp) : null,
        maxVibration: maxVib ? Number(maxVib) : null,
        maxCurrent: maxCurr ? Number(maxCurr) : null,
        minVoltage: minVolt ? Number(minVolt) : null,
        maxVoltage: maxVolt ? Number(maxVolt) : null,
        minRPM: minRpm ? Number(minRpm) : null,
        maxSound: maxSound ? Number(maxSound) : null,
      },
    });

    setSavingSensor(false);
    if (result.success) {
      setEditingSensor(null);
    } else {
      setSensorError(result.error ?? 'Failed to update sensor configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[oklch(0.45_0.01_240)]" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="glass rounded-xl p-12 flex flex-col items-center text-center gap-4">
        <AlertTriangle size={36} className="text-red-400" />
        <div>
          <p className="text-white font-semibold">Device not found</p>
          <p className="text-sm text-[oklch(0.45_0.01_240)] mt-1">
            {error ?? 'This device does not exist or has been deleted.'}
          </p>
        </div>
        <Link href="/devices" className="text-sm text-[oklch(0.62_0.20_240)] hover:underline">
          ← Back to Devices
        </Link>
      </div>
    );
  }

  const assignedMachine = typeof device.machineId === 'object' ? device.machineId : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/devices"
            className="p-2 rounded-lg border border-[oklch(0.22_0.01_240)] hover:border-[oklch(0.35_0.015_240)] text-[oklch(0.55_0.01_240)] hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[oklch(0.45_0.01_240)]">IoT Devices /</p>
              <p className="text-xs font-mono text-[oklch(0.62_0.20_240)]">{device.deviceId}</p>
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">{device.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DeviceStatusBadge status={device.status} size="md" />
          {canWrite && (
            <Link
              href={`/devices/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.28_0.012_240)] bg-[oklch(0.14_0.007_240)] hover:border-[oklch(0.40_0.015_240)] px-3 py-2 text-xs text-white transition-colors"
            >
              <Edit2 size={13} /> Edit Device
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

      {/* Device Overview Hero */}
      <div className="glass rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.20_240)] to-[oklch(0.75_0.18_200)] flex items-center justify-center text-white font-mono font-bold text-sm shadow-lg shadow-[oklch(0.62_0.20_240/0.3)]">
              ESP32
            </div>
            <div>
              <p className="text-lg font-bold text-white">{device.name}</p>
              <p className="text-xs font-mono text-[oklch(0.50_0.01_240)]">
                Device ID: {device.deviceId} · Type: {device.type}
              </p>
            </div>
          </div>

          {device.description && (
            <p className="text-xs text-[oklch(0.60_0.01_240)] leading-relaxed bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] rounded-xl p-3">
              {device.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] rounded-lg p-2.5">
              <p className="text-[10px] text-[oklch(0.45_0.01_240)]">Firmware</p>
              <p className="text-xs font-mono font-semibold text-white mt-0.5">
                {device.firmwareVersion || 'v1.0.0'}
              </p>
            </div>
            <div className="bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] rounded-lg p-2.5">
              <p className="text-[10px] text-[oklch(0.45_0.01_240)]">MAC Address</p>
              <p className="text-xs font-mono font-semibold text-white mt-0.5 truncate">
                {device.macAddress || 'N/A'}
              </p>
            </div>
            <div className="bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] rounded-lg p-2.5">
              <p className="text-[10px] text-[oklch(0.45_0.01_240)]">Serial Number</p>
              <p className="text-xs font-mono font-semibold text-white mt-0.5 truncate">
                {device.serialNumber || 'N/A'}
              </p>
            </div>
            <div className="bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.009_240)] rounded-lg p-2.5">
              <p className="text-[10px] text-[oklch(0.45_0.01_240)]">Last Seen</p>
              <p className="text-xs font-semibold text-white mt-0.5">
                {device.lastSeen ? formatDateTime(device.lastSeen) : 'Never'}
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Machine Info */}
        <div className="glass rounded-xl p-5 flex flex-col justify-between border-[oklch(0.20_0.01_240)]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.50_0.01_240)]">
                Assigned Machine
              </h3>
              <Cpu size={16} className="text-[oklch(0.75_0.18_200)]" />
            </div>

            {assignedMachine ? (
              <div className="space-y-3">
                <div>
                  <Link
                    href={`/machines/${assignedMachine._id}`}
                    className="font-bold text-white text-base hover:text-[oklch(0.75_0.18_200)] transition-colors block"
                  >
                    {assignedMachine.name}
                  </Link>
                  <p className="text-xs font-mono text-[oklch(0.50_0.01_240)] mt-0.5">
                    {assignedMachine.machineCode}
                  </p>
                </div>
                {(assignedMachine.plant || assignedMachine.department) && (
                  <p className="text-xs text-[oklch(0.55_0.01_240)]">
                    {[assignedMachine.department, assignedMachine.plant].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <Cpu size={28} className="mx-auto text-[oklch(0.35_0.01_240)] mb-2" />
                <p className="text-xs text-[oklch(0.50_0.01_240)]">No machine assigned</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[oklch(0.17_0.008_240)] text-[11px] text-[oklch(0.40_0.01_240)]">
            Registered on {formatDate(device.createdAt)}
          </div>
        </div>
      </div>

      {/* ─── Connected Sensors (All 6 Standard ESP32 Sensors) ──────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.62_0.20_240)]">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connected Sensors</h2>
              <p className="text-xs text-[oklch(0.50_0.01_240)]">
                {sensors.length} active sensor channels on this ESP32 microcontroller
              </p>
            </div>
          </div>
        </div>

        {sensors.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-sm text-[oklch(0.45_0.01_240)]">No sensors configured for this device</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensors.map((sensor) => (
              <SensorCard
                key={sensor._id}
                sensor={sensor}
                onConfigure={openSensorConfig}
                canConfigure={canWrite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Telemetry Stream Placeholder Card */}
      <div className="glass rounded-xl p-6 border-dashed opacity-70">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[oklch(0.75_0.18_200/0.15)] border border-[oklch(0.75_0.18_200/0.3)] flex items-center justify-center text-[oklch(0.75_0.18_200)]">
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Live Telemetry Stream</h3>
              <span className="text-[9px] font-semibold uppercase tracking-wider bg-[oklch(0.75_0.18_200/0.2)] text-[oklch(0.75_0.18_200)] border border-[oklch(0.75_0.18_200/0.3)] rounded px-1.5 py-0.5">
                Prepared for Phase 4
              </span>
            </div>
            <p className="text-xs text-[oklch(0.45_0.01_240)] mt-0.5">
              MQTT broker connection and WebSocket live streaming pipeline prepared.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Sensor Threshold Configuration Modal ───────────────────────── */}
      {editingSensor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingSensor(null)} />

          <div className="relative glass rounded-2xl p-6 max-w-lg w-full space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[oklch(0.18_0.009_240)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.62_0.20_240)]">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{editingSensor.sensorName}</h3>
                  <p className="text-xs font-mono text-[oklch(0.50_0.01_240)]">
                    {editingSensor.sensorId} · Unit: {editingSensor.unit}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSensor(null)}
                className="p-1.5 rounded-lg border border-[oklch(0.20_0.01_240)] text-[oklch(0.50_0.01_240)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {sensorError && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <AlertTriangle size={15} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{sensorError}</p>
              </div>
            )}

            <form onSubmit={handleSaveSensorConfig} className="space-y-4">
              {/* Enable / Status Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[oklch(0.55_0.01_240)] mb-1.5 block">
                    Sampling Interval
                  </label>
                  <select
                    value={samplingInterval}
                    onChange={(e) => setSamplingInterval(e.target.value as SamplingInterval)}
                    className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                  >
                    {SAMPLING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[oklch(0.55_0.01_240)] mb-1.5 block">
                    Sensor Status
                  </label>
                  <select
                    value={sensorStatus}
                    onChange={(e) => setSensorStatus(e.target.value as SensorStatus)}
                    className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="fault">Fault</option>
                  </select>
                </div>
              </div>

              {/* Threshold Fields depending on Sensor Type */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Configurable Thresholds ({editingSensor.unit})
                </p>

                {editingSensor.type === 'temperature' && (
                  <div>
                    <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                      Maximum Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 85"
                      value={maxTemp}
                      onChange={(e) => setMaxTemp(e.target.value)}
                      className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                    />
                  </div>
                )}

                {editingSensor.type === 'vibration' && (
                  <div>
                    <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                      Maximum Vibration (m/s²)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 7.5"
                      value={maxVib}
                      onChange={(e) => setMaxVib(e.target.value)}
                      className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                    />
                  </div>
                )}

                {editingSensor.type === 'current' && (
                  <div>
                    <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                      Maximum Current (A)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 20"
                      value={maxCurr}
                      onChange={(e) => setMaxCurr(e.target.value)}
                      className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                    />
                  </div>
                )}

                {editingSensor.type === 'voltage' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                        Minimum Voltage (V)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 380"
                        value={minVolt}
                        onChange={(e) => setMinVolt(e.target.value)}
                        className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                        Maximum Voltage (V)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 440"
                        value={maxVolt}
                        onChange={(e) => setMaxVolt(e.target.value)}
                        className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {editingSensor.type === 'rpm' && (
                  <div>
                    <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                      Minimum RPM
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 1000"
                      value={minRpm}
                      onChange={(e) => setMinRpm(e.target.value)}
                      className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                    />
                  </div>
                )}

                {editingSensor.type === 'sound' && (
                  <div>
                    <label className="text-xs text-[oklch(0.55_0.01_240)] mb-1 block">
                      Maximum Sound Level (dB)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 95"
                      value={maxSound}
                      onChange={(e) => setMaxSound(e.target.value)}
                      className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-xs text-white px-3 py-2 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSensor(null)}
                  className="flex-1 rounded-xl border border-[oklch(0.22_0.01_240)] py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.14_0.007_240)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSensor}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] text-white text-xs font-semibold py-2.5 shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-50 transition-all"
                >
                  {savingSensor ? <Loader2 size={14} className="animate-spin" /> : null}
                  {savingSensor ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative glass rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Delete IoT Device?</p>
                <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">Action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[oklch(0.55_0.01_240)]">
              You are about to delete <span className="text-white font-medium">{device.name}</span> ({device.deviceId}). All 6 attached sensors will also be removed.
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
                {deleting ? 'Deleting...' : 'Delete Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
