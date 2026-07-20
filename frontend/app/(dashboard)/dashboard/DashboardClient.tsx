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
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate, getRoleLabel } from '@/lib/utils';
import { dashboardApi, DashboardOverview, MachineFleetItem } from '@/api/dashboard';
import { ComingSoonCard } from '@/components/monitoring/ComingSoonCard';
import { MachineStatusBadge } from '@/components/machines/MachineStatusBadge';
import { useSocket } from '@/hooks/useSocket';

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

export default function DashboardClient() {
  const { user, company } = useAuthStore();
  const { subscribe } = useSocket();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

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

  // Real-time socket updates for fleet items
  useEffect(() => {
    const unsubscribe = subscribe<any>('sensor:update', (payload) => {
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

    return () => unsubscribe();
  }, [subscribe]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';
  const canWrite = isAdmin || user?.role === 'maintenance_engineer';

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ─── Top Command Ribbon (Palantir Foundry / Siemens Style) ─────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0D0E15] via-[#111422] to-[#0A0B10] border border-[#1E2235] p-6 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#00F2FE]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] mb-1">
              <Globe size={13} className="text-[#00F2FE]" />
              <span>{greeting}, <strong className="text-white">{user?.name}</strong></span>
              <span>·</span>
              <span className="text-[#00E676]">{company?.name || 'Enterprise Asset Hub'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
              INDUSTRIAL OPERATIONS CENTER
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Real-time telemetry stream, TimescaleDB historical analytics, and active IoT gateway monitoring.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="p-2.5 rounded-xl border border-[#262A3E] bg-[#141724] text-[#94A3B8] hover:text-white hover:border-[#3B82F6] transition-all"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            </button>

            {canWrite && (
              <Link
                href="/machines/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3B82F6] text-white text-xs font-mono font-semibold px-4 py-2.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                <Plus size={15} /> PROPOSE MACHINE
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── System Summary Metrics (8 Cards) ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
            SYSTEM METRIC GAUGE SUMMARY
          </p>
          <span className="text-[10px] text-[#00E676] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-live-dot" />
            LIVE TELEMETRY STREAM
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatWidget
            icon={Cpu}
            label="Total Machines"
            value={data?.machines.total ?? 0}
            color="bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30"
            href="/machines"
          />
          <StatWidget
            icon={CheckCircle2}
            label="Active"
            value={data?.machines.active ?? 0}
            color="bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30"
            href="/machines?status=active"
          />
          <StatWidget
            icon={WifiOff}
            label="Offline"
            value={data?.machines.offline ?? 0}
            color="bg-[#64748B]/10 text-[#64748B] border-[#64748B]/30"
            href="/machines?status=offline"
          />
          <StatWidget
            icon={Radio}
            label="Active Devices"
            value={data?.devices.online ?? 0}
            subtitle={`/ ${data?.devices.total ?? 0}`}
            color="bg-[#00F2FE]/10 text-[#00F2FE] border-[#00F2FE]/30"
            href="/devices"
          />
          <StatWidget
            icon={AlertTriangle}
            label="Total Alerts"
            value={data?.alerts ?? 0}
            subtitle="SYS-OK"
            color="bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30"
          />
          <StatWidget
            icon={Activity}
            label="Today Records"
            value={data?.todaySensorRecords != null ? data.todaySensorRecords.toLocaleString() : '0'}
            color="bg-[#9D4EDD]/10 text-[#9D4EDD] border-[#9D4EDD]/30"
          />
          <StatWidget
            icon={Thermometer}
            label="Avg Temp"
            value={data?.averageTemperature != null ? data.averageTemperature : '--'}
            unit="°C"
            color="bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30"
          />
          <StatWidget
            icon={Zap}
            label="Avg Power"
            value={data?.averagePowerConsumption != null ? data.averagePowerConsumption : '--'}
            unit="W"
            color="bg-[#00F2FE]/10 text-[#00F2FE] border-[#00F2FE]/30"
          />
        </div>
      </div>

      {/* ─── Machine Fleet Live Telemetry Overview ───────────────────────── */}
      <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden font-mono">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B1E2B] bg-[#0D0E15]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <Server size={16} />
            </div>
            <div>
              <h2 className="font-bold text-white text-xs uppercase tracking-wider">MACHINE FLEET TELEMETRY MATRIX</h2>
              <p className="text-[10px] text-[#64748B]">Real-time status, temperature readings & rotational speed across assets</p>
            </div>
          </div>
          <Link
            href="/machines"
            className="inline-flex items-center gap-1 text-xs text-[#00F2FE] hover:underline transition-colors"
          >
            ALL ASSETS <ArrowRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">MACHINE ASSET</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">CODE</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">STATUS</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">GATEWAY ID</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">TEMP (°C)</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">SPEED (RPM)</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">LAST PAYLOAD</th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#141724] animate-pulse">
                    <td colSpan={8} className="px-4 py-4 h-10 bg-[#0E1019]" />
                  </tr>
                ))
              ) : !data?.machineFleet?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#475569] font-mono">
                    NO MACHINE ASSETS REGISTERED YET.{' '}
                    {canWrite && (
                      <Link href="/machines/new" className="text-[#00F2FE] underline">
                        ADD YOUR FIRST MACHINE
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                data.machineFleet.map((m: MachineFleetItem) => (
                  <tr
                    key={m._id}
                    className="border-b border-[#141724] hover:bg-[#121522] transition-colors group"
                  >
                    <td className="px-4 py-3 font-semibold text-white font-mono">
                      <Link href={`/machines/${m._id}/monitoring`} className="hover:text-[#00F2FE] transition-colors">
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#64748B]">{m.machineCode}</td>
                    <td className="px-4 py-3">
                      <MachineStatusBadge status={m.status as any} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      {m.deviceId ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={cn('w-1.5 h-1.5 rounded-full', m.deviceStatus === 'online' ? 'bg-[#00E676] animate-live-dot' : 'bg-[#64748B]')} />
                          <span className="text-white text-[11px]">{m.deviceId}</span>
                        </div>
                      ) : (
                        <span className="text-[#475569] font-mono text-[11px]">UNASSIGNED</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-mono font-bold text-white">
                      {m.latestTemperature != null ? `${m.latestTemperature.toFixed(1)}°C` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-mono font-bold text-white">
                      {m.latestRPM != null ? Math.round(m.latestRPM) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] font-mono text-[11px]">
                      {m.lastSeen ? formatDate(m.lastSeen) : 'NEVER'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/machines/${m._id}/monitoring`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#161926] border border-[#2B324B] text-[10px] font-mono font-semibold text-[#00F2FE] hover:bg-[#1E2336] hover:border-[#3B82F6] transition-all"
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

      {/* ─── AI Intelligence Roadmap (Linear / Vercel Style) ─────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#00F2FE]" />
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              AI & PREDICTIVE INTELLIGENCE ENGINE (MODULES 6–8)
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#11131C] border border-[#1E202E] text-[10px] text-[#475569]">
            ROADMAP STATUS: ON TRACK
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ComingSoonCard
            title="AI Machine Health Index"
            description="Composite 0–100 health score derived from neural sensor fusion algorithms."
            icon={Brain}
            color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          />
          <ComingSoonCard
            title="Real-Time Anomaly Engine"
            description="Deep autoencoder model isolating vibration micro-spikes and thermal decay."
            icon={Activity}
            color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          />
          <ComingSoonCard
            title="Predictive RUL Models"
            description="Remaining Useful Life calculations triggering automated maintenance schedules."
            icon={Wrench}
            color="bg-red-500/10 text-red-400 border-red-500/20"
          />
          <ComingSoonCard
            title="Digital Twin 3D Mesh"
            description="WebGL 3D CAD model rendering physical component strain and heat maps."
            icon={Layers}
            color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          />
        </div>
      </div>

      {/* ─── Account & Plant Context Drawer ───────────────────────────── */}
      <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4 font-mono">
        <button
          onClick={() => setShowProfileDetails(!showProfileDetails)}
          className="w-full flex items-center justify-between text-xs text-[#64748B] hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#3B82F6]" />
            <span>ORGANIZATION AUDIT CONTEXT: <strong>{company?.name}</strong></span>
          </div>
          {showProfileDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showProfileDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#181B28] text-xs font-mono">
            {company && (
              <div className="space-y-1 text-[#64748B]">
                <p className="font-semibold text-white text-sm font-mono">{company.name}</p>
                <p>Industry: {company.industryType}</p>
                <p>Email: {company.email}</p>
                <p>Location: {company.city}, {company.state}, {company.country}</p>
              </div>
            )}

            {user && (
              <div className="space-y-1 text-[#64748B]">
                <p className="font-semibold text-white text-sm font-mono">{user.name}</p>
                <p>Role: {getRoleLabel(user.role as any)}</p>
                <p>Email: {user.email}</p>
                <p>Created: {formatDate(user.createdAt)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
