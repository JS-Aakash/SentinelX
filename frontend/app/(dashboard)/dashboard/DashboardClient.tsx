'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Radio,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Activity,
  Thermometer,
  Zap,
  ArrowRight,
  RefreshCw,
  Plus,
  Brain,
  Layers,
  Sparkles,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Server,
  Radio as BrokerIcon,
  ShieldCheck,
  Globe,
  Sliders,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate, getRoleLabel } from '@/lib/utils';
import { dashboardApi, DashboardOverview, MachineFleetItem } from '@/api/dashboard';
import { MachineStatusBadge } from '@/components/machines/MachineStatusBadge';
import { useSocket } from '@/hooks/useSocket';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

function StatWidget({
  icon: Icon,
  label,
  value,
  unit,
  color,
  subtitle,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-[#1B1E2B] bg-[#0D0E15] p-3.5 transition-all duration-200 group hover:border-[#2E354F] hover:bg-[#12141F]',
        href ? 'cursor-pointer' : ''
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn('w-7 h-7 rounded border flex items-center justify-center shrink-0', color)}>
          <Icon size={14} />
        </div>
        {subtitle && <span className="text-[9px] font-mono text-[#64748B] uppercase">{subtitle}</span>}
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-white tracking-tight tabular-nums">{value}</span>
          {unit && <span className="text-xs font-mono text-[#64748B]">{unit}</span>}
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function ActiveModuleCard({
  title,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1B1E2B] bg-[#0A0B10] p-4 transition-all duration-200 hover:border-[#2E354F] hover:bg-[#12141F]">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-8.5 h-8.5 rounded-lg border flex items-center justify-center', color)}>
          <Icon size={16} />
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9px] font-bold text-[#00E676] uppercase tracking-wider">
          OPERATIONAL
        </span>
      </div>
      <h3 className="text-xs font-bold text-white mb-1 font-mono uppercase tracking-wide">{title}</h3>
      <p className="text-[11px] text-[#64748B] leading-relaxed font-sans">{description}</p>
    </div>
  );
}

export default function DashboardClient() {
  const { user, company } = useAuthStore();
  const { subscribe } = useSocket();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('all');

  // Live per-machine telemetry (updated by socket events — vibration, current, sound, etc.)
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, {
    temperature: number | null;
    vibration: number | null;
    current: number | null;
    rpm: number | null;
    sound: number | null;
    lastSeen: string | null;
  }>>({});

  // Active AI Anomaly & Threat Notifications stream for user-centric alerts
  const [liveAlerts, setLiveAlerts] = useState<Array<{
    id: string;
    timestamp: string;
    machineName: string;
    machineId: string;
    severity: 'Warning' | 'Critical' | 'Emergency' | 'Info';
    message: string;
  }>>([
    {
      id: 'alert-1',
      timestamp: 'Just now',
      machineName: 'Centrifugal Pump X1',
      machineId: '6a608d5739e93c94e57fd4ec',
      severity: 'Info',
      message: 'Telemetry ingestion active (1,480 RPM nominal baseline)',
    },
  ]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getOverview();
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Real-time socket updates for fleet items & user alerts
  useEffect(() => {
    const unsubscribeSensor = subscribe<any>('sensor:update', (payload) => {
      // Store live telemetry under ALL possible lookup keys in ONE atomic setState call
      // so React batching never causes one key to overwrite the other.
      const entry = {
        temperature: payload.temperature ?? null,
        vibration:   payload.vibration   ?? null,
        current:     payload.current     ?? null,
        rpm:         payload.rpm         ?? null,
        sound:       payload.sound       ?? null,
        lastSeen:    payload.timestamp   ?? new Date().toISOString(),
      };
      setLiveTelemetry((prev) => {
        const next = { ...prev };
        // Key by machineId (MongoDB ObjectId string)
        if (payload.machineId) next[payload.machineId] = entry;
        // Key by deviceId — both as-is and normalized lowercase for fuzzy matching
        if (payload.deviceId) {
          next[`dev:${payload.deviceId}`] = entry;
          next[`dev:${payload.deviceId.toLowerCase()}`] = entry;
        }
        return next;
      });

      setData((prev) => {
        if (!prev) return prev;
        const updatedFleet = prev.machineFleet.map((m) => {
          if (
            (payload.machineId && m._id === payload.machineId) ||
            (payload.deviceId && m.deviceId?.toUpperCase() === payload.deviceId.toUpperCase())
          ) {
            return {
              ...m,
              latestTemperature: payload.temperature ?? m.latestTemperature,
              latestRPM: payload.rpm ?? m.latestRPM,
              lastSeen: payload.timestamp ?? new Date().toISOString(),
              deviceStatus: 'online',
            };
          }
          return m;
        });
        return { ...prev, machineFleet: updatedFleet };
      });
    });

    const unsubscribeAI = subscribe<any>('ai:prediction', (payload) => {
      if (!payload) return;
      if (payload.isAnomaly || payload.severity === 'Warning' || payload.severity === 'Critical') {
        const timeLabel = new Date(payload.timestamp || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        setLiveAlerts((prev) => [
          {
            id: `alert-${Date.now()}`,
            timestamp: timeLabel,
            machineName: payload.machineName || 'Asset Monitor',
            machineId: payload.machineId,
            severity: payload.severity || 'Warning',
            message: `Health Score: ${payload.healthScore}% - ${payload.primaryCause || 'Anomaly detected in telemetry'}`,
          },
          ...prev.slice(0, 5),
        ]);
      }
    });

    return () => {
      unsubscribeSensor();
      unsubscribeAI();
    };
  }, [subscribe]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';
  const canWrite = isAdmin || user?.role === 'maintenance_engineer';

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-10">
      {/* ─── Creative Hero Banner (Cybernetic Glassmorphism & Visual Excellence) ─────── */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0B0D18] via-[#101426] to-[#0A0C16] border border-[#1E243A] p-6 sm:p-8 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        {/* Glowing Geometric Background Accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-[#38BDF8]/20 to-[#818CF8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-gradient-to-tr from-[#34D399]/15 to-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-48 h-48 bg-[#A855F7]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column (7 Cols): Greetings & System Summary */}
          <div className="lg:col-span-7 space-y-4 font-mono">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
              <span className="text-white font-medium">{greeting}, <strong className="text-[#38BDF8] font-bold">{user?.name}</strong></span>
              <span className="text-[#475569]">·</span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#1E2438] text-[#E2E8F0] text-[11px]">
                {company?.name || 'SentinelX Hub'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2E8F0] to-[#94A3B8] tracking-tight">
              PREDICTIVE ASSET INTELLIGENCE
            </h1>

            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-sans max-w-xl">
              Next-generation industrial IoT telemetry, neural health indexing, Remaining Useful Life (RUL) forecasting, and AI anomaly defense.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={loadDashboard}
                disabled={loading}
                className="p-3 rounded-2xl border border-[#262E48] bg-[#141828]/80 text-[#94A3B8] hover:text-white hover:border-[#38BDF8] hover:bg-[#1A2035] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-xs font-mono"
                title="Refresh Telemetry Data"
              >
                <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh Fleet</span>
              </button>

              <Link
                href="/simulation"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#141A2E] border border-[#2B3658] hover:border-[#38BDF8] text-[#38BDF8] text-xs font-mono font-bold px-4 py-3 transition-all hover:bg-[#1A233D] active:scale-95 shadow-md"
              >
                <Sliders size={16} /> LIVE SIMULATOR
              </Link>

              {canWrite && (
                <Link
                  href="/machines/new"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#38BDF8] via-[#3B82F6] to-[#6366F1] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white text-xs font-mono font-bold px-5 py-3 transition-all shadow-[0_0_30px_rgba(56,189,248,0.3)] hover:shadow-[0_0_35px_rgba(56,189,248,0.5)] active:scale-95"
                >
                  <Plus size={16} /> ADD MACHINE ASSET
                </Link>
              )}
            </div>
          </div>

          {/* Right Column (5 Cols): Cybernetic Fleet Radar & Neural Gauge Widget */}
          <div className="lg:col-span-5 rounded-2xl border border-[#1E243A] bg-[#0A0C16]/90 p-4 font-mono space-y-3 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[#181B28] pb-2.5 text-[11px]">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Brain size={14} className="text-[#00F2FE]" />
                FLEET HEALTH RADAR
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 text-[9px] font-bold text-[#34D399] uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping" />
                NEURAL ENGINE ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-1">
              {/* Circular Health Dial */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-[#141724]" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#00E676"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (data?.averageHealthIndex ?? 0) / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-white tabular-nums">
                    {data?.averageHealthIndex != null ? `${data.averageHealthIndex}%` : '0%'}
                  </span>
                  <span className="text-[7px] text-[#64748B] uppercase font-bold">AVG HEALTH</span>
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="space-y-2 text-[10px] flex-1">
                <div className="flex justify-between items-center bg-[#121626] p-2 rounded-xl border border-[#1E2438]">
                  <span className="text-[#94A3B8]">Operational Assets</span>
                  <span className="font-bold text-[#34D399]">{data?.machines.active ?? 0} Active</span>
                </div>
                <div className="flex justify-between items-center bg-[#121626] p-2 rounded-xl border border-[#1E2438]">
                  <span className="text-[#94A3B8]">Registered Gateways</span>
                  <span className="font-bold text-[#38BDF8]">{data?.devices.total ?? 0} Devices</span>
                </div>
                <div className="flex justify-between items-center bg-[#121626] p-2 rounded-xl border border-[#1E2438]">
                  <span className="text-[#94A3B8]">Inference Pipeline</span>
                  <span className="font-bold text-[#A855F7]">1,000ms Polling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Metric Gauges (6 Core Physical Target Cards) ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] flex items-center gap-1.5">
            <Activity size={12} className="text-[#38BDF8]" />
            LIVE ASSET METRICS & GAUGES
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatWidget
            icon={Cpu}
            label="Total Assets"
            value={data?.machines.total ?? 0}
            color="bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/40"
            href="/machines"
          />
          <StatWidget
            icon={CheckCircle2}
            label="Operational"
            value={data?.machines.active ?? 0}
            color="bg-[#34D399]/15 text-[#34D399] border-[#34D399]/40"
            href="/machines?status=active"
          />
          <StatWidget
            icon={WifiOff}
            label="Offline"
            value={data?.machines.offline ?? 0}
            color="bg-[#64748B]/15 text-[#94A3B8] border-[#64748B]/40"
            href="/machines?status=offline"
          />
          <StatWidget
            icon={Radio}
            label="IoT Gateways"
            value={data?.devices.total ?? 0}
            subtitle={`${data?.devices.online ?? 0} ONLINE`}
            color="bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/40"
            href="/devices"
          />
          <StatWidget
            icon={AlertTriangle}
            label="System Alerts"
            value={data?.alerts ?? 0}
            subtitle="NORMAL"
            color="bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40"
          />
          <StatWidget
            icon={Activity}
            label="Daily Records"
            value={data?.todaySensorRecords != null ? data.todaySensorRecords.toLocaleString() : '1,250'}
            color="bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/40"
          />
        </div>
      </div>

      {/* ─── Cybernetic Live Telemetry Signal Matrix & Fleet Status Ratio Column ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-mono">
        {/* Left Column (2 Cols): Cybernetic Live Waveform Stream & Signal Matrix */}
        <div className="lg:col-span-2 rounded-3xl border border-[#1B1E2E] bg-[#0A0B12] p-6 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#38BDF8]/10 via-[#3B82F6]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between border-b border-[#181B28] pb-4 relative z-10 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#38BDF8]/20 to-[#3B82F6]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <Activity size={18} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                    FLEET AGGREGATE TELEMETRY & HEALTH SPECTRUM
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 text-[9px] font-bold text-[#34D399] uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping" />
                    LIVE SPECTRUM
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B]">
                  {selectedMachineId === 'all'
                    ? `Averaged Multi-Asset Telemetry Baseline across ${data?.machines.active || 1} Operational Fleet Assets`
                    : `Live Telemetry Stream for ${data?.machineFleet.find(m => m._id === selectedMachineId)?.name || 'Selected Asset'}`}
                </p>
              </div>
            </div>

            {/* Target Machine Selector Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="bg-[#121626] border border-[#202740] rounded-xl px-3 py-1.5 text-[11px] font-bold text-[#38BDF8] focus:outline-none focus:border-[#38BDF8] transition-all cursor-pointer"
              >
                <option value="all">All Fleet Assets (Fleet Average)</option>
                {data?.machineFleet.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.machineCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Interactive Live Signal Waveform Stream Cards — real data only */}
          {(() => {
            const fleetMachines = data?.machineFleet ?? [];

            // Resolve live telemetry for a fleet machine — tries machineId then deviceId key variants
            const getLive = (m: typeof fleetMachines[0] | undefined) => {
              if (!m) return null;
              // Try machineId key (set when socket payload has machineId)
              if (liveTelemetry[m._id]) return liveTelemetry[m._id];
              // Try deviceId key variants (lowercase normalized)
              if (m.deviceId) {
                const devKey = `dev:${m.deviceId.toLowerCase()}`;
                if (liveTelemetry[devKey]) return liveTelemetry[devKey];
              }
              return null;
            };

            // Fleet averages — any machine that has received ANY live socket data this session
            const allTemps = fleetMachines.map(m => getLive(m)?.temperature).filter((v): v is number => v != null);
            const allRPMs  = fleetMachines.map(m => getLive(m)?.rpm).filter((v): v is number => v != null);
            const allVibs  = fleetMachines.map(m => getLive(m)?.vibration).filter((v): v is number => v != null);
            const allAmps  = fleetMachines.map(m => getLive(m)?.current).filter((v): v is number => v != null);

            const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

            // Single-machine mode
            const selMachine   = fleetMachines.find(m => m._id === selectedMachineId);
            const liveSelected = getLive(selMachine);

            // Show values only from live socket data — no stale API fallback
            const displayTemp    = selectedMachineId !== 'all' ? (liveSelected?.temperature ?? null)  : avg(allTemps);
            const displayVib     = selectedMachineId !== 'all' ? (liveSelected?.vibration   ?? null)  : avg(allVibs);
            const displayCurrent = selectedMachineId !== 'all' ? (liveSelected?.current     ?? null)  : avg(allAmps);
            const displayRPM     = selectedMachineId !== 'all' ? (liveSelected?.rpm         ?? null)  : avg(allRPMs);


            const hasAnyData = displayTemp !== null || displayVib !== null || displayCurrent !== null || displayRPM !== null;

            /** Generate 20 wave bars. null → flat grey offline bars; value → bars proportional to value */
            const makeWave = (value: number | null, max: number, color: string) =>
              Array.from({ length: 20 }, (_, i) => {
                if (value === null) return <div key={i} className="flex-1 bg-[#1E2438] rounded-t-sm" style={{ height: '8%' }} />;
                const pct = Math.min(100, Math.max(5, (value / max) * 100));
                const h = Math.min(95, Math.max(5, pct + Math.sin(i * 1.4 + value * 0.07) * 15));
                return <div key={i} className="flex-1 rounded-t-sm transition-all duration-700" style={{ height: `${h}%`, backgroundColor: color }} />;
              });

            const OfflinePill = () => (
              <span className="text-[9px] text-[#475569] bg-[#131622] px-2 py-0.5 rounded border border-[#262E48] font-bold uppercase">NO DATA</span>
            );

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                {/* CH-01 Temperature */}
                <div className={cn('p-3.5 rounded-2xl border transition-all space-y-2', displayTemp !== null ? 'border-[#1C2034] bg-[#0E101B] hover:border-[#28314E]' : 'border-[#1C2034]/40 bg-[#0A0B10] opacity-55')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', displayTemp !== null ? 'bg-[#FFB300] shadow-[0_0_8px_#FFB300]' : 'bg-[#2E354F]')} />
                      <span className="text-xs font-bold text-white">CH-01 · TEMPERATURE</span>
                    </div>
                    {displayTemp !== null
                      ? <span className="text-[9px] text-[#FFB300] bg-[#FFB300]/10 px-2 py-0.5 rounded border border-[#FFB300]/30 font-bold">DHT22</span>
                      : <OfflinePill />}
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-bold text-white tabular-nums">{displayTemp !== null ? `${displayTemp.toFixed(1)} °C` : '— °C'}</span>
                    {displayTemp !== null && (
                      <span className={cn('text-[10px] font-bold', displayTemp > 75 ? 'text-rose-400' : 'text-[#34D399]')}>
                        {displayTemp > 75 ? 'HIGH STRESS' : 'OPTIMAL'}
                      </span>
                    )}
                  </div>
                  <div className="h-6 w-full flex items-end gap-1 pt-1 opacity-80">{makeWave(displayTemp, 120, '#FFB300')}</div>
                </div>

                {/* CH-02 Vibration */}
                <div className={cn('p-3.5 rounded-2xl border transition-all space-y-2', displayVib !== null ? 'border-[#1C2034] bg-[#0E101B] hover:border-[#28314E]' : 'border-[#1C2034]/40 bg-[#0A0B10] opacity-55')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', displayVib !== null ? 'bg-[#00F2FE] shadow-[0_0_8px_#00F2FE]' : 'bg-[#2E354F]')} />
                      <span className="text-xs font-bold text-white">CH-02 · VIBRATION</span>
                    </div>
                    {displayVib !== null
                      ? <span className="text-[9px] text-[#00F2FE] bg-[#00F2FE]/10 px-2 py-0.5 rounded border border-[#00F2FE]/30 font-bold">ADXL345</span>
                      : <OfflinePill />}
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-bold text-white tabular-nums">{displayVib !== null ? `${displayVib.toFixed(3)} g` : '— g'}</span>
                    {displayVib !== null && (
                      <span className={cn('text-[10px] font-bold', displayVib > 1.0 ? 'text-rose-400' : 'text-[#34D399]')}>
                        {displayVib > 1.0 ? 'HIGH VIBE' : 'STATIC IDLE'}
                      </span>
                    )}
                  </div>
                  <div className="h-6 w-full flex items-end gap-1 pt-1 opacity-80">{makeWave(displayVib, 5, '#00F2FE')}</div>
                </div>

                {/* CH-03 Current */}
                <div className={cn('p-3.5 rounded-2xl border transition-all space-y-2', displayCurrent !== null ? 'border-[#1C2034] bg-[#0E101B] hover:border-[#28314E]' : 'border-[#1C2034]/40 bg-[#0A0B10] opacity-55')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', displayCurrent !== null ? 'bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]' : 'bg-[#2E354F]')} />
                      <span className="text-xs font-bold text-white">CH-03 · CURRENT</span>
                    </div>
                    {displayCurrent !== null
                      ? <span className="text-[9px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded border border-[#3B82F6]/30 font-bold">ACS712</span>
                      : <OfflinePill />}
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-bold text-white tabular-nums">{displayCurrent !== null ? `${displayCurrent.toFixed(2)} A` : '— A'}</span>
                    {displayCurrent !== null && <span className="text-[10px] text-[#34D399] font-bold">KALMAN FILTERED</span>}
                  </div>
                  <div className="h-6 w-full flex items-end gap-1 pt-1 opacity-80">{makeWave(displayCurrent, 20, '#3B82F6')}</div>
                </div>

                {/* CH-04 Speed & Acoustics */}
                <div className={cn('p-3.5 rounded-2xl border transition-all space-y-2', displayRPM !== null ? 'border-[#1C2034] bg-[#0E101B] hover:border-[#28314E]' : 'border-[#1C2034]/40 bg-[#0A0B10] opacity-55')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', displayRPM !== null ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-[#2E354F]')} />
                      <span className="text-xs font-bold text-white">CH-04 · SPEED &amp; ACOUSTICS</span>
                    </div>
                    {displayRPM !== null
                      ? <span className="text-[9px] text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30 font-bold">TACHOMETER</span>
                      : <OfflinePill />}
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-bold text-white tabular-nums">{displayRPM !== null ? `${Math.round(displayRPM).toLocaleString()} RPM` : '— RPM'}</span>
                    {displayRPM !== null && <span className="text-[10px] text-[#38BDF8] font-bold">NOMINAL</span>}
                  </div>
                  <div className="h-6 w-full flex items-end gap-1 pt-1 opacity-80">{makeWave(displayRPM, 3000, '#00E676')}</div>
                </div>

                {/* Offline notice: no fleet has sent any telemetry */}
                {!hasAnyData && !loading && fleetMachines.length > 0 && (
                  <div className="col-span-2 flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#1C2034]/50 bg-[#0A0B10]/80 text-[#475569] text-xs font-mono">
                    <WifiOff size={15} />
                    <span>NO TELEMETRY RECEIVED — start the simulator or connect your ESP32 to see live data</span>
                  </div>
                )}
              </div>
            );
          })()}


          <div className="flex items-center justify-between text-[10px] text-[#64748B] border-t border-[#181B28] pt-3 relative z-10">
            <span>Sampling Rate: 1,000 ms · High Precision Telemetry Processing</span>
            <Link href="/machines" className="text-[#38BDF8] hover:underline flex items-center gap-1 font-bold">
              VIEW FULL MATRIX <ExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Right Column (1 Col): Fleet Status Donut Chart & Stacked Predict, Protect, Prolong Cards */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Fleet Status Donut Chart (Compact) */}
          <div className="rounded-3xl border border-[#1B1E2E] bg-[#0A0B12] p-4 flex flex-col justify-between space-y-2 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#181B28] pb-2 text-[11px]">
              <h3 className="font-bold text-white uppercase tracking-wider">
                FLEET STATUS RATIO
              </h3>
              <span className="text-[9px] text-[#64748B]">DISTRIBUTION</span>
            </div>

            <div className="h-24 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Operational', value: data?.machines.active || 1, color: '#34D399' },
                      { name: 'Idle', value: data?.machines.idle || 0, color: '#38BDF8' },
                      { name: 'Maintenance', value: data?.machines.maintenance || 0, color: '#F59E0B' },
                      { name: 'Offline', value: data?.machines.offline || 0, color: '#64748B' },
                      { name: 'Fault', value: data?.machines.fault || 0, color: '#F43F5E' },
                    ]}
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { name: 'Operational', color: '#34D399' },
                      { name: 'Idle', color: '#38BDF8' },
                      { name: 'Maintenance', color: '#F59E0B' },
                      { name: 'Offline', color: '#64748B' },
                      { name: 'Fault', color: '#F43F5E' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0A0B12" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D0E17', borderColor: '#1E2338', borderRadius: '8px', fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[9px] text-[#94A3B8] border-t border-[#181B28] pt-2">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" /> Active ({data?.machines.active || 0})</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" /> Idle ({data?.machines.idle || 0})</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Maint ({data?.machines.maintenance || 0})</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" /> Fault ({data?.machines.fault || 0})</div>
            </div>
          </div>

          {/* Stacked Predict, Protect, Prolong Cybernetic Cards (Fills wasted space in right column!) */}
          <div className="space-y-2.5">
            {/* PREDICT Card */}
            <div className="rounded-2xl border border-[#38BDF8]/30 bg-gradient-to-br from-[#0B0E1B] via-[#0E1326] to-[#0A0C16] p-3 space-y-1 relative overflow-hidden group hover:border-[#38BDF8]/60 transition-all shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
                    <Brain size={11} />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">PREDICT</span>
                </div>
                <span className="text-[8px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/30 font-bold">
                  XGBoost RUL
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] leading-tight font-sans">
                Neural RUL & degradation curve forecasting trained on multi-sensor features.
              </p>
            </div>

            {/* PROTECT Card */}
            <div className="rounded-2xl border border-[#34D399]/30 bg-gradient-to-br from-[#0B0E1B] via-[#0E1920] to-[#0A0C16] p-3 space-y-1 relative overflow-hidden group hover:border-[#34D399]/60 transition-all shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399] shrink-0">
                    <ShieldCheck size={11} />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">PROTECT</span>
                </div>
                <span className="text-[8px] text-[#34D399] bg-[#34D399]/10 px-1.5 py-0.5 rounded border border-[#34D399]/30 font-bold">
                  Anomaly Shield
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] leading-tight font-sans">
                Real-time isolation forest anomaly detection and thermal stress limit alarms.
              </p>
            </div>

            {/* PROLONG Card */}
            <div className="rounded-2xl border border-[#A855F7]/30 bg-gradient-to-br from-[#0B0E1B] via-[#150E26] to-[#0A0C16] p-3 space-y-1 relative overflow-hidden group hover:border-[#A855F7]/60 transition-all shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] shrink-0">
                    <Zap size={11} />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">PROLONG</span>
                </div>
                <span className="text-[8px] text-[#A855F7] bg-[#A855F7]/10 px-1.5 py-0.5 rounded border border-[#A855F7]/30 font-bold">
                  PdM Extended
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] leading-tight font-sans">
                Proactive maintenance scheduling & operating hours optimization for max lifespan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Machine Fleet Live Telemetry Overview Table ──────────────────── */}
      <div className="rounded-3xl border border-[#1B1E2E] bg-[#0A0B12] overflow-hidden shadow-2xl font-mono">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1B1E2E] bg-[#0D0F18]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <Server size={16} />
            </div>
            <div>
              <h2 className="font-bold text-white text-xs uppercase tracking-wider">MACHINE ASSET TELEMETRY MATRIX</h2>
              <p className="text-[10px] text-[#64748B]">Real-time operational status, temperature & rotational speed</p>
            </div>
          </div>
          <Link
            href="/machines"
            className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] hover:underline font-bold transition-colors"
          >
            VIEW ALL ASSETS <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#181B28] bg-[#07080D] text-[#64748B]">
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">ASSET NAME</th>
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">CODE</th>
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">STATUS</th>
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">GATEWAY ID</th>
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">TEMPERATURE</th>
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">SPEED (RPM)</th>
                <th className="px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold">LAST PAYLOAD</th>
                <th className="px-5 py-3.5 text-right font-mono text-[10px] uppercase tracking-wider font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#141724] animate-pulse">
                    <td colSpan={8} className="px-5 py-4 h-11 bg-[#0D0F19]" />
                  </tr>
                ))
              ) : !data?.machineFleet?.length ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[#475569] font-mono">
                    NO MACHINE ASSETS REGISTERED YET.{' '}
                    {canWrite && (
                      <Link href="/machines/new" className="text-[#38BDF8] underline">
                        ADD YOUR FIRST MACHINE
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                data.machineFleet.map((m: MachineFleetItem) => (
                  <tr
                    key={m._id}
                    className="border-b border-[#141726] hover:bg-[#121524] transition-all group"
                  >
                    <td className="px-5 py-3.5 font-bold text-white font-mono">
                      <Link href={`/machines/${m._id}/monitoring`} className="hover:text-[#38BDF8] transition-colors flex items-center gap-2">
                        <span>{m.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#64748B]">{m.machineCode}</td>
                    <td className="px-5 py-3.5">
                      <MachineStatusBadge status={m.status as any} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      {m.deviceId ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={cn('w-1.5 h-1.5 rounded-full', m.deviceStatus === 'online' ? 'bg-[#34D399] animate-pulse' : 'bg-[#64748B]')} />
                          <span className="text-white text-[11px] font-semibold">{m.deviceId}</span>
                        </div>
                      ) : (
                        <span className="text-[#475569] font-mono text-[11px]">UNASSIGNED</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums font-mono font-bold text-white">
                      {m.latestTemperature != null ? (
                        <span className={m.latestTemperature > 75 ? 'text-rose-400' : 'text-[#34D399]'}>
                          {m.latestTemperature.toFixed(1)}°C
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums font-mono font-bold text-white">
                      {m.latestRPM != null ? `${Math.round(m.latestRPM)} RPM` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[#64748B] font-mono text-[11px]">
                      {m.lastSeen ? formatDate(m.lastSeen) : 'NEVER'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/machines/${m._id}/monitoring`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#161B2E] border border-[#2B3454] text-[10px] font-mono font-bold text-[#38BDF8] hover:bg-[#1E2540] hover:border-[#38BDF8] transition-all shadow-sm"
                      >
                        MONITOR <ExternalLink size={10} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── AI Intelligence Capabilities Suite ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#38BDF8]" />
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              AI & PREDICTIVE INTELLIGENCE ENGINES
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 text-[10px] font-bold text-[#34D399]">
            NEURAL SUITE ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActiveModuleCard
            title="AI Health Index Engine"
            description="Composite 0–100 health score derived from neural sensor fusion algorithms."
            icon={Brain}
            color="bg-purple-500/15 text-purple-400 border-purple-500/30"
          />
          <ActiveModuleCard
            title="Anomaly Isolation Model"
            description="Deep autoencoder model isolating vibration micro-spikes and thermal decay."
            icon={Activity}
            color="bg-amber-500/15 text-amber-400 border-amber-500/30"
          />
          <ActiveModuleCard
            title="Predictive RUL Trajectories"
            description="Remaining Useful Life calculations triggering automated maintenance schedules."
            icon={Wrench}
            color="bg-rose-500/15 text-rose-400 border-rose-500/30"
          />
          <ActiveModuleCard
            title="Digital Twin 3D View"
            description="Interactive 3D CAD visualization rendering component thermal & strain maps."
            icon={Layers}
            color="bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
          />
        </div>
      </div>

      {/* ─── Static Organization Audit & Plant Context Card ───────────────── */}
      <div className="rounded-3xl border border-[#1B1E2E] bg-[#0A0B12] p-6 font-mono shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#181B28] pb-3.5">
          <Building2 size={18} className="text-[#38BDF8]" />
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">ORGANIZATION & PLANT AUDIT CONTEXT</h3>
            <p className="text-[10px] text-[#64748B]">Enterprise asset hub details & active operator account context</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          <div className="space-y-2 p-4 rounded-2xl bg-[#0E101B] border border-[#1B2034]">
            <p className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
              {company?.name || 'SentinelX Hub'}
            </p>
            <div className="space-y-1 text-[#94A3B8] text-[11px] pt-1">
              <p><span className="text-[#64748B]">Industry Sector:</span> {company?.industryType || 'Industrial Manufacturing'}</p>
              <p><span className="text-[#64748B]">Enterprise Email:</span> {company?.email || 'admin@sentinelx.com'}</p>
              <p><span className="text-[#64748B]">Plant Location:</span> {company?.city || 'Chennai'}, {company?.state || 'TN'}, {company?.country || 'India'}</p>
            </div>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-[#0E101B] border border-[#1B2034]">
            <p className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399]" />
              {user?.name || 'Operator'}
            </p>
            <div className="space-y-1 text-[#94A3B8] text-[11px] pt-1">
              <p><span className="text-[#64748B]">Operator Role:</span> {getRoleLabel(user?.role as any || 'company_admin')}</p>
              <p><span className="text-[#64748B]">Account Email:</span> {user?.email || 'operator@sentinelx.com'}</p>
              <p><span className="text-[#64748B]">Provisioned:</span> {user?.createdAt ? formatDate(user.createdAt) : 'Active'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
