'use client';

import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus, Activity } from 'lucide-react';

interface SensorCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: React.ElementType;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  trend: 'up' | 'down' | 'stable' | null;
  lastUpdated?: string | null;
  minVal?: number;
  maxVal?: number;
}

const STATUS_STYLE = {
  normal: {
    bg: 'bg-[#0B1516]',
    border: 'border-[#123933]',
    text: 'text-[#00E676]',
    badge: 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30',
    dot: 'bg-[#00E676] animate-live-dot',
    glow: 'shadow-[0_0_20px_rgba(0,230,118,0.15)]',
    label: 'NORMAL',
    progress: 'bg-gradient-to-r from-[#00E676]/50 to-[#00E676]',
  },
  warning: {
    bg: 'bg-[#1A140A]',
    border: 'border-[#3D2C11]',
    text: 'text-[#FFB300]',
    badge: 'bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30',
    dot: 'bg-[#FFB300]',
    glow: 'shadow-[0_0_20px_rgba(255,179,0,0.15)]',
    label: 'WARNING',
    progress: 'bg-gradient-to-r from-[#FFB300]/50 to-[#FFB300]',
  },
  critical: {
    bg: 'bg-[#1F0D12]',
    border: 'border-[#4A1521]',
    text: 'text-[#FF1744]',
    badge: 'bg-[#FF1744]/10 text-[#FF1744] border-[#FF1744]/30',
    dot: 'bg-[#FF1744] animate-ping',
    glow: 'shadow-[0_0_20px_rgba(255,23,68,0.2)]',
    label: 'CRITICAL',
    progress: 'bg-gradient-to-r from-[#FF1744]/50 to-[#FF1744]',
  },
  offline: {
    bg: 'bg-[#0F111A]',
    border: 'border-[#1B1E2B]',
    text: 'text-[#64748B]',
    badge: 'bg-[#1E2235] text-[#64748B] border-[#2C324D]',
    dot: 'bg-[#475569]',
    glow: '',
    label: 'OFFLINE',
    progress: 'bg-[#2C324D]',
  },
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'NO DATA';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3000) return 'JUST NOW';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s AGO`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m AGO`;
  return `${Math.floor(diff / 3600000)}h AGO`;
}

export function SensorCard({ label, value, unit, icon: Icon, status, trend, lastUpdated }: SensorCardProps) {
  const cfg = STATUS_STYLE[status];

  // Calculate generic progress percentage for gauge line
  let pct = 0;
  if (value != null) {
    pct = Math.min(100, Math.max(8, (value / (unit === '°C' ? 100 : unit === 'RPM' ? 4000 : 300)) * 100));
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 transition-all duration-300 group',
        cfg.bg,
        cfg.border,
        cfg.glow,
        'hover:border-opacity-100 hover:-translate-y-0.5'
      )}
    >
      {/* Subtle Grid Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded border flex items-center justify-center', cfg.badge)}>
            <Icon size={14} />
          </div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#94A3B8]">
            {label}
          </span>
        </div>

        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold border', cfg.badge)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      {/* Main Metric Value Display */}
      <div className="my-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
              {value != null ? value.toFixed(1) : '—'}
            </span>
            <span className="text-xs font-mono font-medium text-[#64748B]">{unit}</span>
          </div>

          {trend && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#64748B]">
              {trend === 'up' && <ArrowUp size={12} className="text-[#FF1744]" />}
              {trend === 'down' && <ArrowDown size={12} className="text-[#00E676]" />}
              {trend === 'stable' && <Minus size={12} className="text-[#64748B]" />}
            </div>
          )}
        </div>

        {/* Dynamic Telemetry Meter Bar */}
        <div className="w-full bg-[#161926] h-1.5 rounded-full overflow-hidden mt-3 p-[1px] border border-white/5">
          <div
            className={cn('h-full rounded-full transition-all duration-500', cfg.progress)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Timestamp Footer */}
      <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-[#475569]">
        <span>SENS-ID: #{label.slice(0, 3).toUpperCase()}</span>
        <span className="flex items-center gap-1 text-[#64748B]">
          <Activity size={10} className="text-[#00F2FE]" />
          {timeAgo(lastUpdated)}
        </span>
      </div>
    </div>
  );
}
