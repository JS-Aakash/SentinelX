'use client';

import { ShieldCheck, ShieldAlert, Activity, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnomalyPanelProps {
  isAnomaly?: boolean;
  anomalyScore?: number;
  lastDetectionTime?: string;
}

export function AnomalyPanel({ isAnomaly = false, anomalyScore = 0.05, lastDetectionTime }: AnomalyPanelProps) {
  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono flex flex-col justify-between space-y-3 shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#3B82F6]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            ISOLATION FOREST ANOMALY MONITOR
          </h3>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
            isAnomaly
              ? 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30'
              : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
          )}
        >
          {isAnomaly ? 'ANOMALY DETECTED' : 'SYSTEM NORMAL'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-[#64748B]">ANOMALY PROBABILITY SCORE</p>
            <p className={cn('text-2xl font-bold font-mono tabular-nums mt-0.5', isAnomaly ? 'text-[#FF1744]' : 'text-white')}>
              {(anomalyScore * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[#64748B]">STATUS</p>
            <p className={cn('text-xs font-bold font-mono uppercase mt-0.5', isAnomaly ? 'text-[#FF1744]' : 'text-[#00E676]')}>
              {isAnomaly ? 'Out-of-Distribution' : 'In-Distribution'}
            </p>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-[#141724] h-2 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isAnomaly ? 'bg-[#FF1744]' : 'bg-[#3B82F6]'
              )}
              style={{ width: `${Math.min(100, anomalyScore * 100)}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] text-[#64748B] leading-relaxed">
          Isolation Forest evaluates multivariate correlations across all 6 sensors to flag non-linear pattern anomalies.
        </p>
      </div>
    </div>
  );
}
