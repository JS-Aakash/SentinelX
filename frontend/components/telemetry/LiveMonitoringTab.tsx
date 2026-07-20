'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  Thermometer,
  Gauge,
  Activity,
  Volume2,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { telemetryApi, LiveTelemetryData } from '@/api/telemetry';
import { Device } from '@/types';
import { cn, formatDate } from '@/lib/utils';

interface LiveMonitoringTabProps {
  machineId: string;
  assignedDevice: Device | null;
  operatingLimits?: {
    maxTemperature?: number;
    maxVibration?: number;
    maxCurrent?: number;
    minRPM?: number;
  };
}

interface TelemetryUpdatePayload {
  deviceId: string;
  machineId?: string;
  timestamp: string;
  temperature: number;
  vibration: number;
  current: number;
  voltage: number;
  rpm: number;
  sound: number;
  status: string;
}

export function LiveMonitoringTab({ machineId, assignedDevice, operatingLimits }: LiveMonitoringTabProps) {
  const [telemetry, setTelemetry] = useState<LiveTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await telemetryApi.getLive(machineId);
      if (res.data.success && res.data.data) {
        setTelemetry(res.data.data);
        if (res.data.data.lastSeen) {
          setLastUpdatedTime(new Date(res.data.data.lastSeen));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load live sensor data');
    } finally {
      setIsLoading(false);
    }
  }, [machineId]);

  // Initial fetch
  useEffect(() => {
    fetchLiveTelemetry();
  }, [fetchLiveTelemetry]);

  // Socket.IO Real-time Subscription
  useEffect(() => {
    const socket = getSocket();

    // Join room for this machine
    socket.emit('join:machine', machineId);
    if (assignedDevice?.deviceId) {
      socket.emit('join:device', assignedDevice.deviceId);
    }

    const handleSensorUpdate = (data: TelemetryUpdatePayload) => {
      // Filter updates relevant to this machine or assigned device
      if (
        data.machineId === machineId ||
        !assignedDevice ||
        (assignedDevice && data.deviceId.toUpperCase() === assignedDevice.deviceId.toUpperCase())
      ) {
        const updateDate = new Date(data.timestamp);
        setLastUpdatedTime(updateDate);
        setTelemetry((prev) => ({
          machineId: machineId,
          machineName: prev?.machineName || '',
          deviceId: data.deviceId,
          deviceName: prev?.deviceName || assignedDevice?.name || null,
          deviceStatus: 'online',
          lastSeen: updateDate.toISOString(),
          temperature: data.temperature,
          vibration: data.vibration,
          current: data.current,
          voltage: data.voltage,
          rpm: data.rpm,
          sound: data.sound,
        }));
      }
    };

    socket.on('sensor:update', handleSensorUpdate);

    return () => {
      socket.off('sensor:update', handleSensorUpdate);
      socket.emit('leave:machine', machineId);
      if (assignedDevice?.deviceId) {
        socket.emit('leave:device', assignedDevice.deviceId);
      }
    };
  }, [machineId, assignedDevice]);

  // Seconds ago ticker
  useEffect(() => {
    if (!lastUpdatedTime) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - lastUpdatedTime.getTime()) / 1000));
      setSecondsAgo(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdatedTime]);

  const isOnline = telemetry?.deviceStatus === 'online' && secondsAgo <= 35;

  // Helper to format sensor status (Normal vs Warning)
  const getSensorStatus = (
    val: number | null,
    limit?: number,
    isMinLimit = false
  ): { status: 'Normal' | 'Warning' | 'No Data'; isWarning: boolean } => {
    if (val === null || val === undefined) return { status: 'No Data', isWarning: false };
    if (limit !== undefined && limit !== null) {
      if (isMinLimit && val < limit) return { status: 'Warning', isWarning: true };
      if (!isMinLimit && val > limit) return { status: 'Warning', isWarning: true };
    }
    return { status: 'Normal', isWarning: false };
  };

  const metricCards = [
    {
      id: 'temperature',
      title: 'Temperature',
      value: telemetry?.temperature != null ? `${telemetry.temperature.toFixed(1)}` : '—',
      unit: '°C',
      icon: Thermometer,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      limitInfo: operatingLimits?.maxTemperature ? `Max Limit: ${operatingLimits.maxTemperature}°C` : null,
      sensorCheck: getSensorStatus(telemetry?.temperature ?? null, operatingLimits?.maxTemperature),
    },
    {
      id: 'current',
      title: 'Current',
      value: telemetry?.current != null ? `${telemetry.current.toFixed(2)}` : '—',
      unit: 'A',
      icon: Zap,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      limitInfo: operatingLimits?.maxCurrent ? `Max Limit: ${operatingLimits.maxCurrent}A` : null,
      sensorCheck: getSensorStatus(telemetry?.current ?? null, operatingLimits?.maxCurrent),
    },
    {
      id: 'voltage',
      title: 'Voltage',
      value: telemetry?.voltage != null ? `${telemetry.voltage.toFixed(1)}` : '—',
      unit: 'V',
      icon: Gauge,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      limitInfo: 'Rated: 220V - 240V',
      sensorCheck: getSensorStatus(telemetry?.voltage ?? null),
    },
    {
      id: 'rpm',
      title: 'Rotational Speed (RPM)',
      value: telemetry?.rpm != null ? `${Math.round(telemetry.rpm)}` : '—',
      unit: 'RPM',
      icon: Activity,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      limitInfo: operatingLimits?.minRPM ? `Min Limit: ${operatingLimits.minRPM} RPM` : null,
      sensorCheck: getSensorStatus(telemetry?.rpm ?? null, operatingLimits?.minRPM, true),
    },
    {
      id: 'vibration',
      title: 'Vibration',
      value: telemetry?.vibration != null ? `${telemetry.vibration.toFixed(2)}` : '—',
      unit: 'mm/s',
      icon: Radio,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      limitInfo: operatingLimits?.maxVibration ? `Max Limit: ${operatingLimits.maxVibration} mm/s` : null,
      sensorCheck: getSensorStatus(telemetry?.vibration ?? null, operatingLimits?.maxVibration),
    },
    {
      id: 'sound',
      title: 'Sound Level',
      value: telemetry?.sound != null ? `${telemetry.sound.toFixed(1)}` : '—',
      unit: 'dB',
      icon: Volume2,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      limitInfo: 'Acoustic Baseline: 60 dB',
      sensorCheck: getSensorStatus(telemetry?.sound ?? null),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Device Connection Banner */}
      {!assignedDevice ? (
        <div className="glass rounded-xl p-6 border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Radio className="text-amber-400" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">No IoT Device Assigned</h4>
              <p className="text-xs text-[oklch(0.55_0.01_240)] mt-0.5">
                Assign an ESP32 or MQTT gateway device to begin streaming real-time telemetry data to SentinelX.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl p-5 border border-[oklch(0.22_0.01_240)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                isOnline
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-500/15 border-slate-500/30 text-slate-400'
              )}
            >
              {isOnline ? <Wifi size={20} className="animate-pulse" /> : <WifiOff size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">{assignedDevice.name}</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[oklch(0.18_0.01_240)] border border-[oklch(0.25_0.01_240)] text-[oklch(0.70_0.01_240)]">
                  {assignedDevice.deviceId}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border',
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                  )}
                >
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-400')}
                  />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-[oklch(0.50_0.01_240)] mt-1 flex items-center gap-1.5">
                <Clock size={12} />
                {lastUpdatedTime
                  ? `Last payload received: ${secondsAgo === 0 ? 'Just now' : `${secondsAgo}s ago`} (${formatDate(
                      lastUpdatedTime
                    )})`
                  : 'Awaiting first telemetry payload...'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchLiveTelemetry}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-[oklch(0.25_0.01_240)] bg-[oklch(0.15_0.008_240)] px-3 py-1.5 text-xs text-white hover:bg-[oklch(0.20_0.01_240)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Live Telemetry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const { status, isWarning } = card.sensorCheck;

          return (
            <div
              key={card.id}
              className="glass rounded-xl p-5 border border-[oklch(0.20_0.01_240)] hover:border-[oklch(0.30_0.015_240)] transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', card.color)}>
                    <Icon size={16} />
                  </div>
                  <h4 className="text-xs font-semibold text-[oklch(0.75_0.01_240)]">{card.title}</h4>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border',
                    isWarning
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : card.value === '—'
                      ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  )}
                >
                  {isWarning ? (
                    <AlertTriangle size={10} />
                  ) : card.value !== '—' ? (
                    <CheckCircle2 size={10} />
                  ) : null}
                  {status}
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-bold tracking-tight text-white">{card.value}</span>
                <span className="text-sm font-medium text-[oklch(0.55_0.01_240)]">{card.unit}</span>
              </div>

              <div className="mt-3 pt-3 border-t border-[oklch(0.16_0.008_240)] flex items-center justify-between text-[11px] text-[oklch(0.50_0.01_240)]">
                <span>{card.limitInfo || 'Operational'}</span>
                <span className="flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-slate-500')} />
                  {isOnline ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
