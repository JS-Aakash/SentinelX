'use client';

import { Activity, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthScoreCardProps {
  score: number;
  status: 'Excellent' | 'Good' | 'Warning' | 'Critical';
  currentReading?: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  } | null;
  operatingLimits?: Record<string, number>;
}

export function HealthScoreCard({ score = 100, status = 'Excellent', currentReading, operatingLimits = {} }: HealthScoreCardProps) {
  // SVG Circular Geometry
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getStatusColor = (s: string) => {
    if (s === 'Critical') return { text: 'text-[#FF1744]', stroke: '#FF1744', bg: 'bg-[#FF1744]/10 border-[#FF1744]/30' };
    if (s === 'Warning') return { text: 'text-[#FFB300]', stroke: '#FFB300', bg: 'bg-[#FFB300]/10 border-[#FFB300]/30' };
    if (s === 'Good') return { text: 'text-[#00F2FE]', stroke: '#00F2FE', bg: 'bg-[#00F2FE]/10 border-[#00F2FE]/30' };
    return { text: 'text-[#00E676]', stroke: '#00E676', bg: 'bg-[#00E676]/10 border-[#00E676]/30' };
  };

  const colors = getStatusColor(status);

  const maxTemp = operatingLimits.maxTemperature || 80;
  const maxVib = operatingLimits.maxVibration || 2.5;
  const maxCur = operatingLimits.maxCurrent || 15;

  const tempPct = currentReading ? Math.min(100, Math.round((currentReading.temperature / maxTemp) * 100)) : 45;
  const vibPct = currentReading ? Math.min(100, Math.round((currentReading.vibration / maxVib) * 100)) : 20;
  const curPct = currentReading ? Math.min(100, Math.round((currentReading.current / maxCur) * 100)) : 30;

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono flex flex-col justify-between relative overflow-hidden group hover:border-[#262B3F] transition-all shadow-xl">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#00E676]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">HEALTH SCORE & VITALITY</h3>
        </div>
        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border', colors.bg, colors.text)}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center py-2">
        {/* Circular SVG Gauge */}
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
            {/* Background Track */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              className="stroke-[#141724]"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={colors.stroke}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-white tracking-tight tabular-nums">{score}%</span>
            <span className="text-[9px] text-[#64748B] font-bold uppercase">HEALTH INDEX</span>
          </div>
        </div>

        {/* Per-Sensor Health Breakdown */}
        <div className="space-y-2 text-[10px]">
          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>TEMPERATURE (25%)</span>
              <span className="font-bold text-white">{tempPct}% of limit</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#FFB300] h-full rounded-full transition-all" style={{ width: `${tempPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>VIBRATION (25%)</span>
              <span className="font-bold text-white">{vibPct}% of limit</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#00F2FE] h-full rounded-full transition-all" style={{ width: `${vibPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>CURRENT DRAW (20%)</span>
              <span className="font-bold text-white">{curPct}% of limit</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#3B82F6] h-full rounded-full transition-all" style={{ width: `${curPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
