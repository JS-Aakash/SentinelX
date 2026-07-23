'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Wifi,
  WifiOff,
  Radio,
  Clock,
  Thermometer,
  Zap,
  Gauge,
  Activity,
  Volume2,
  Brain,
  Sparkles,
  Layers,
  Activity as AnomalyIcon,
  AlertTriangle,
  Terminal,
  Server,
  Download,
} from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { machinesApi } from '@/api/machines';
import { devicesApi } from '@/api/devices';
import { dashboardApi, ChartDataPoint } from '@/api/dashboard';
import { Machine, Device } from '@/types';
import { cn } from '@/lib/utils';

import { SensorCard } from '@/components/monitoring/SensorCard';
import { SensorChart } from '@/components/monitoring/SensorChart';
import { HistoryTable } from '@/components/monitoring/HistoryTable';
import { TimeRangeSelector } from '@/components/monitoring/TimeRangeSelector';

interface TelemetryPayload {
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

const METRICS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#FFB300', icon: Thermometer, warn: 75, crit: 85 },
  { key: 'current', label: 'Current', unit: 'A', color: '#2979FF', icon: Zap, warn: 12, crit: 15 },
  { key: 'voltage', label: 'Voltage', unit: 'V', color: '#9D4EDD', icon: Gauge, warn: 245, crit: 250 },
  { key: 'rpm', label: 'RPM', unit: 'RPM', color: '#00E676', icon: Activity, warn: 3200, crit: 3500 },
  { key: 'vibration', label: 'Vibration', unit: 'g', color: '#00F2FE', icon: Radio, warn: 1.5, crit: 2.5 },
  { key: 'sound', label: 'Sound', unit: 'dB', color: '#FF1744', icon: Volume2, warn: 80, crit: 90 },
];

export default function MonitoringClient({ machineId }: { machineId: string }) {
  const { subscribe, emit } = useSocket();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30m');

  // Live sensor readings
  const [latestReading, setLatestReading] = useState<TelemetryPayload | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [payloadLogs, setPayloadLogs] = useState<TelemetryPayload[]>([]);

  // Time-series chart buffers per metric
  const [chartsData, setChartsData] = useState<Record<string, ChartDataPoint[]>>({
    temperature: [],
    current: [],
    voltage: [],
    rpm: [],
    vibration: [],
    sound: [],
  });

  // Load Machine & Device info
  const loadInfo = useCallback(async () => {
    try {
      setLoading(true);
      const [mRes, dRes] = await Promise.all([
        machinesApi.getById(machineId),
        devicesApi.getAll({ machineId }),
      ]);
      setMachine(mRes.data.data ?? null);
      const devs = dRes.data.data ?? [];
      setDevice(devs.length > 0 ? devs[0] : null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  // Load Historical Charts
  const loadCharts = useCallback(async () => {
    METRICS.forEach(async (m) => {
      try {
        const res = await dashboardApi.getChartData(machineId, m.key, range);
        if (res.data.success && res.data.data) {
          setChartsData((prev) => ({ ...prev, [m.key]: res.data.data ?? [] }));
        }
      } catch {
        // ignore
      }
    });
  }, [machineId, range]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  // Real-time socket subscription
  useEffect(() => {
    emit('join:machine', machineId);
    if (device?.deviceId) {
      emit('join:device', device.deviceId);
    }

    const unsubscribe = subscribe<TelemetryPayload>('sensor:update', (payload) => {
      if (
        payload.machineId === machineId ||
        (device && payload.deviceId?.toUpperCase() === device.deviceId?.toUpperCase())
      ) {
        const ts = new Date(payload.timestamp);
        setLatestReading(payload);
        setLastSeen(ts);
        setPayloadLogs((prev) => [payload, ...prev.slice(0, 19)]); // keep last 20 MQTT packets

        // Append to charts data buffers
        const timeStr = ts.toISOString();
        METRICS.forEach((m) => {
          const val = (payload as any)[m.key];
          if (val != null) {
            setChartsData((prev) => {
              const buf = prev[m.key] || [];
              const updated = [...buf, { timestamp: timeStr, value: Number(val) }];
              return { ...prev, [m.key]: updated.slice(-120) }; // cap at 120 points
            });
          }
        });
      }
    });

    return () => {
      unsubscribe();
      emit('leave:machine', machineId);
      if (device?.deviceId) {
        emit('leave:device', device.deviceId);
      }
    };
  }, [machineId, device, subscribe, emit]);

  // Seconds ago ticker
  useEffect(() => {
    if (!lastSeen) return;
    const interval = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSeen.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  const isOnline = (device?.status === 'online' || secondsAgo <= 35) && lastSeen !== null;

  // Derive historical rows from temperature chart buffer
  const historyRows = (chartsData.temperature || []).map((tPoint, i) => ({
    timestamp: tPoint.timestamp,
    temperature: tPoint.value,
    current: chartsData.current[i]?.value ?? null,
    voltage: chartsData.voltage[i]?.value ?? null,
    rpm: chartsData.rpm[i]?.value ?? null,
    vibration: chartsData.vibration[i]?.value ?? null,
    sound: chartsData.sound[i]?.value ?? null,
  }));

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ─── Header & Controls ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
        <div>
          <Link
            href={`/machines/${machineId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-white transition-colors mb-2"
          >
            <ArrowLeft size={13} /> BACK TO ASSET PROFILE
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {machine ? machine.name.toUpperCase() : 'TELEMETRY MONITORING'}
            </h1>
            {machine && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#161926] border border-[#2B324B] text-[#00F2FE]">
                {machine.machineCode}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TimeRangeSelector value={range} onChange={setRange} />
          <button
            onClick={() => {
              loadInfo();
              loadCharts();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#262A3E] bg-[#141724] text-[#94A3B8] hover:text-white hover:border-[#3B82F6] transition-all"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ─── Device Connection Ribbon ───────────────────────────────────── */}
      {!device ? (
        <div className="rounded-xl border border-[#FFB300]/30 bg-[#1A140A] p-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-[#FFB300] shrink-0" />
            <div>
              <p className="font-bold text-white">NO IOT GATEWAY ASSIGNED</p>
              <p className="text-[#64748B]">Assign an ESP32 device to start receiving real-time telemetry stream.</p>
            </div>
          </div>
          <Link
            href={`/machines/${machineId}`}
            className="px-3 py-1.5 rounded bg-[#FFB300]/15 border border-[#FFB300]/30 text-[#FFB300] font-bold hover:bg-[#FFB300]/25 transition-colors"
          >
            ASSIGN GATEWAY
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4 flex flex-wrap items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded border flex items-center justify-center shrink-0',
                isOnline
                  ? 'bg-[#00E676]/15 border-[#00E676]/30 text-[#00E676]'
                  : 'bg-[#64748B]/15 border-[#64748B]/30 text-[#64748B]'
              )}
            >
              {isOnline ? <Wifi size={18} className="animate-live-dot" /> : <WifiOff size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{device.name}</span>
                <span className="text-xs text-[#00F2FE]">({device.deviceId})</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border',
                    isOnline
                      ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30'
                      : 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/30'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-[#00E676] animate-live-dot' : 'bg-[#64748B]')} />
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-1.5">
                <Clock size={11} />
                {lastSeen
                  ? `LAST PACKET: ${secondsAgo === 0 ? 'JUST NOW' : `${secondsAgo}s AGO`}`
                  : 'AWAITING FIRST PAYLOAD STREAM...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs text-[#64748B]">
            <span>TYPE: <strong className="text-white font-semibold">{device.type}</strong></span>
            <span>FIRMWARE: <strong className="text-white font-semibold">{device.firmwareVersion || 'v1.0.0'}</strong></span>
            <span>MAC: <strong className="text-white font-semibold">{device.macAddress || 'ESP32-WROOM'}</strong></span>
          </div>
        </div>
      )}

      {/* ─── Live Sensor Metric Cards Grid ───────────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-mono font-bold text-[#64748B] mb-3 uppercase tracking-wider">
          LIVE METRIC GAUGES
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {METRICS.map((m) => {
            const rawVal = latestReading ? (latestReading as any)[m.key] : null;
            const val = rawVal != null ? Number(rawVal) : null;

            let status: 'normal' | 'warning' | 'critical' | 'offline' = 'normal';
            if (!isOnline || val == null) {
              status = 'offline';
            } else if (val >= m.crit) {
              status = 'critical';
            } else if (val >= m.warn) {
              status = 'warning';
            }

            return (
              <SensorCard
                key={m.key}
                label={m.label}
                value={val}
                unit={m.unit}
                icon={m.icon}
                status={status}
                trend={val != null ? 'stable' : null}
                lastUpdated={lastSeen?.toISOString()}
              />
            );
          })}
        </div>
      </div>

      {/* ─── Real-Time Telemetry Charts (3 Columns) ───────────────────────── */}
      <div>
        <h2 className="text-[10px] font-mono font-bold text-[#64748B] mb-3 uppercase tracking-wider">
          TIME-SERIES TELEMETRY STREAM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {METRICS.map((m) => (
            <SensorChart
              key={m.key}
              data={chartsData[m.key] || []}
              metric={m.label}
              unit={m.unit}
              color={m.color}
              height={200}
              warningThreshold={m.warn}
              criticalThreshold={m.crit}
            />
          ))}
        </div>
      </div>

      {/* ─── Real-Time MQTT Payload Console Stream (Datadog / Siemens Style) ─── */}
      <div className="rounded-xl border border-[#1B1E2B] bg-[#0A0B10] p-4 font-mono">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#181B28]">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-[#00F2FE]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              REAL-TIME MQTT PACKET INGESTION FEED
            </h3>
          </div>
          <span className="text-[10px] text-[#00E676] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-live-dot" />
            TOPIC: company/{machine?.companyId || 'company'}/device/{device?.deviceId || 'ESP001'}
          </span>
        </div>

        <div className="h-40 overflow-y-auto space-y-1 bg-[#06070B] rounded border border-[#141724] p-3 text-[11px] font-mono text-[#94A3B8]">
          {payloadLogs.length === 0 ? (
            <p className="text-[#475569]">Awaiting incoming MQTT sensor packets from device...</p>
          ) : (
            payloadLogs.map((pkt, idx) => (
              <div key={idx} className="flex items-start gap-3 hover:bg-[#111422] p-1 rounded transition-colors">
                <span className="text-[#475569] shrink-0">
                  [{new Date(pkt.timestamp).toLocaleTimeString('en-US', { hour12: false })}]
                </span>
                <span className="text-[#00E676] font-semibold shrink-0">PUB</span>
                <span className="text-white truncate">
                  {JSON.stringify({
                    deviceId: pkt.deviceId,
                    temp: pkt.temperature,
                    cur: pkt.current,
                    volt: pkt.voltage,
                    rpm: pkt.rpm,
                    vib: pkt.vibration,
                    sound: pkt.sound,
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Historical Telemetry Audit Table ───────────────────────────── */}
      <HistoryTable data={historyRows} />

      {/* ─── AI Intelligence Suite (Active) ───────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 font-mono">
          <Sparkles size={14} className="text-[#00F2FE]" />
          <h2 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
            AI & PREDICTIVE ANALYTICS SUITE (MODULES 6–8)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/machines/${machineId}`}
            className="relative overflow-hidden rounded-xl border border-[oklch(0.17_0.008_240)] bg-[oklch(0.09_0.005_240)] p-5 hover:border-[#00F2FE]/40 transition-colors group block"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Brain size={18} />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                Active
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#00F2FE] transition-colors">Health Index Score</h3>
            <p className="text-xs text-[oklch(0.40_0.01_240)] leading-relaxed">Real-time multi-sensor fusion model evaluating mechanical wear and degradation.</p>
          </Link>

          <Link
            href={`/machines/${machineId}`}
            className="relative overflow-hidden rounded-xl border border-[oklch(0.17_0.008_240)] bg-[oklch(0.09_0.005_240)] p-5 hover:border-[#00F2FE]/40 transition-colors group block"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AnomalyIcon size={18} />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                Active
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#00F2FE] transition-colors">Anomaly Detector</h3>
            <p className="text-xs text-[oklch(0.40_0.01_240)] leading-relaxed">Neural network isolating transient vibration spikes and electrical noise.</p>
          </Link>

          <Link
            href={`/machines/${machineId}`}
            className="relative overflow-hidden rounded-xl border border-[oklch(0.17_0.008_240)] bg-[oklch(0.09_0.005_240)] p-5 hover:border-[#00F2FE]/40 transition-colors group block"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                Active
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#00F2FE] transition-colors">RUL Estimation</h3>
            <p className="text-xs text-[oklch(0.40_0.01_240)] leading-relaxed">Predictive maintenance scheduler calculating Remaining Useful Life.</p>
          </Link>

          <Link
            href={`/machines/${machineId}`}
            className="relative overflow-hidden rounded-xl border border-[oklch(0.17_0.008_240)] bg-[oklch(0.09_0.005_240)] p-5 hover:border-[#00F2FE]/40 transition-colors group block"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Layers size={18} />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
                Active
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#00F2FE] transition-colors">3D Digital Twin</h3>
            <p className="text-xs text-[oklch(0.40_0.01_240)] leading-relaxed">Interactive WebGL spatial twin with thermal heatmap mesh overlay.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
