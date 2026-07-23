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
  Droplets,
  Cpu,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { telemetryApi, LiveTelemetryData } from '@/api/telemetry';
import { Device } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

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
  humidity?: number;
  vibration: number;
  acceleration?: { x: number; y: number; z: number };
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
  const [history, setHistory] = useState<Array<{
    time: string;
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  }>>(() => {
    const now = Date.now();
    return Array.from({ length: 10 }).map((_, i) => ({
      time: new Date(now - (10 - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature: 42.0,
      vibration: 0.14,
      current: 3.5,
      voltage: 230.0,
      rpm: 1480,
      sound: 58.0,
    }));
  });

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

        const timeLabel = updateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistory((prev) => [
          ...prev.slice(-19),
          {
            time: timeLabel,
            temperature: data.temperature ?? 45,
            vibration: data.vibration ?? 0.15,
            current: data.current ?? 3.5,
            voltage: data.voltage ?? 230,
            rpm: data.rpm ?? 1480,
            sound: data.sound ?? 58,
          },
        ]);

        setTelemetry((prev) => ({
          machineId: machineId,
          machineName: prev?.machineName || '',
          deviceId: data.deviceId,
          deviceName: prev?.deviceName || assignedDevice?.name || null,
          deviceStatus: 'online',
          lastSeen: updateDate.toISOString(),
          temperature: data.temperature,
          humidity: data.humidity ?? prev?.humidity ?? 58.2,
          vibration: data.vibration,
          acceleration: data.acceleration ?? prev?.acceleration ?? { x: 0.02, y: -0.01, z: 1.01 },
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
      title: 'Temperature (DHT22)',
      dataKey: 'temperature',
      colorHex: '#F59E0B',
      value: telemetry?.temperature != null ? `${telemetry.temperature.toFixed(1)}` : '—',
      unit: '°C',
      icon: Thermometer,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      limitInfo: operatingLimits?.maxTemperature ? `Max Limit: ${operatingLimits.maxTemperature}°C` : null,
      sensorCheck: getSensorStatus(telemetry?.temperature ?? null, operatingLimits?.maxTemperature),
    },
    {
      id: 'current',
      title: 'Current (Kalman ACS712)',
      dataKey: 'current',
      colorHex: '#3B82F6',
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
      dataKey: 'voltage',
      colorHex: '#A855F7',
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
      dataKey: 'rpm',
      colorHex: '#10B981',
      value: telemetry?.rpm != null ? `${Math.round(telemetry.rpm)}` : '—',
      unit: 'RPM',
      icon: Activity,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      limitInfo: operatingLimits?.minRPM ? `Min Limit: ${operatingLimits.minRPM} RPM` : null,
      sensorCheck: getSensorStatus(telemetry?.rpm ?? null, operatingLimits?.minRPM, true),
    },
    {
      id: 'vibration',
      title: 'Vibration (ADXL345 3-Axis)',
      dataKey: 'vibration',
      colorHex: '#06B6D4',
      value: telemetry?.vibration != null ? `${telemetry.vibration.toFixed(2)}` : '—',
      unit: 'g',
      icon: Radio,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      limitInfo: telemetry?.acceleration
        ? `X: ${telemetry.acceleration.x}g | Y: ${telemetry.acceleration.y}g | Z: ${telemetry.acceleration.z}g`
        : operatingLimits?.maxVibration
        ? `Max Limit: ${operatingLimits.maxVibration} g`
        : 'X: 0.02g | Y: -0.01g | Z: 1.01g',
      sensorCheck: getSensorStatus(telemetry?.vibration ?? null, operatingLimits?.maxVibration),
    },
    {
      id: 'sound',
      title: 'Sound Level',
      dataKey: 'sound',
      colorHex: '#F43F5E',
      value: telemetry?.sound != null ? `${telemetry.sound.toFixed(1)}` : '—',
      unit: 'dB / ADC',
      icon: Volume2,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      limitInfo: 'Acoustic Baseline: 60 dB',
      sensorCheck: getSensorStatus(telemetry?.sound ?? null),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      {telemetry && (
        <div className="glass rounded-xl p-5 border border-[oklch(0.20_0.01_240)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
              )}
            >
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {assignedDevice ? assignedDevice.name : 'Virtual Ingestion Gateway'}
                </h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border',
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                  )}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-[oklch(0.50_0.01_240)] mt-1">
                {lastUpdatedTime
                  ? `Last payload received: ${secondsAgo === 0 ? 'Just now' : `${secondsAgo}s ago`} (${formatDate(lastUpdatedTime)})`
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

      {/* Live Telemetry Individual Graphs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const { status, isWarning } = card.sensorCheck;

          return (
            <div
              key={card.id}
              className="glass rounded-xl p-5 border border-[oklch(0.20_0.01_240)] hover:border-[oklch(0.32_0.015_240)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', card.color)}>
                      <Icon size={16} />
                    </div>
                    <h4 className="text-xs font-semibold text-[oklch(0.85_0.01_240)]">{card.title}</h4>
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

                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">{card.value}</span>
                  <span className="text-xs font-semibold text-[oklch(0.60_0.01_240)]">{card.unit}</span>
                </div>
              </div>

              {/* INDIVIDUAL DEDICATED GRAPH FOR THIS METRIC */}
              <div className="h-28 w-full my-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={card.colorHex} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={card.colorHex} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0D0E15', borderColor: '#1E2235', borderRadius: '6px', fontSize: '11px', color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey={card.dataKey}
                      name={`${card.title} (${card.unit})`}
                      stroke={card.colorHex}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#grad-${card.id})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-[oklch(0.16_0.008_240)] flex items-center justify-between text-[11px] text-[oklch(0.50_0.01_240)] font-mono">
                <span>{card.limitInfo || 'Nominal Range'}</span>
                <span className="flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-slate-500')} />
                  {isOnline ? 'Live Stream' : 'Offline'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
