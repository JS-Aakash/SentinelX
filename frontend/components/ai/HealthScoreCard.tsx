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
  const ratedRPM = operatingLimits.ratedRPM || 1500;
  const minRPM = operatingLimits.minRPM || 1000;
  const maxSound = operatingLimits.maxSound || 85;

  const ratedTemp = operatingLimits.ratedTemperature || 45;
  const ratedVib = operatingLimits.ratedVibration || 0.15;
  const ratedCur = operatingLimits.ratedCurrent || 3.0;
  const ratedSound = operatingLimits.ratedSound || 60;

  const tempPct = currentReading
    ? currentReading.temperature <= ratedTemp
      ? 0
      : Math.min(100, Math.round(((currentReading.temperature - ratedTemp) / Math.max(1, maxTemp - ratedTemp)) * 100))
    : 0;

  const vibPct = currentReading
    ? currentReading.vibration <= ratedVib
      ? 0
      : Math.min(100, Math.round(((currentReading.vibration - ratedVib) / Math.max(0.1, maxVib - ratedVib)) * 100))
    : 0;

  const curPct = currentReading
    ? currentReading.current <= ratedCur
      ? 0
      : Math.min(100, Math.round(((currentReading.current - ratedCur) / Math.max(1, maxCur - ratedCur)) * 100))
    : 0;

  const voltPct = currentReading
    ? Math.min(100, Math.round((Math.abs(currentReading.voltage - 230) / 230) * 100))
    : 0;

  const rpmPct = currentReading
    ? Math.min(100, Math.round((Math.max(0, ratedRPM - currentReading.rpm) / Math.max(1, ratedRPM - minRPM)) * 100))
    : 0;

  const soundPct = currentReading
    ? currentReading.sound <= ratedSound
      ? 0
      : Math.min(100, Math.round(((currentReading.sound - ratedSound) / Math.max(1, maxSound - ratedSound)) * 100))
    : 0;

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono flex flex-col justify-between relative overflow-hidden group hover:border-[#262B3F] transition-all shadow-xl h-full space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#00E676]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">HEALTH INDEX & VITALITY</h3>
        </div>
        <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5', colors.bg, colors.text)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-2">
        {/* Circular SVG Gauge */}
        <div className="sm:col-span-4 relative w-28 h-28 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
            <circle
              cx="55"
              cy="55"
              r={radius}
              className="stroke-[#141724]"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={colors.stroke}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-white tracking-tight tabular-nums">{score}%</span>
            <span className="text-[8px] text-[#64748B] font-bold uppercase">HEALTH SCORE</span>
          </div>
        </div>

        {/* Per-Sensor Health Breakdown (All 6 Metrics) */}
        <div className="sm:col-span-8 grid grid-cols-2 gap-x-4 gap-y-2 text-[9px]">
          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>TEMP (20%)</span>
              <span className="font-bold text-white">{tempPct > 0 ? `${tempPct}% stress` : '0% stress'}</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#FFB300] h-full rounded-full transition-all" style={{ width: `${tempPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>VIB (20%)</span>
              <span className="font-bold text-white">{vibPct > 0 ? `${vibPct}% stress` : '0% stress'}</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#00F2FE] h-full rounded-full transition-all" style={{ width: `${vibPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>CURR (20%)</span>
              <span className="font-bold text-white">{curPct > 0 ? `${curPct}% stress` : '0% stress'}</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#3B82F6] h-full rounded-full transition-all" style={{ width: `${curPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>VOLT (15%)</span>
              <span className="font-bold text-white">{voltPct}% dev</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#9D4EDD] h-full rounded-full transition-all" style={{ width: `${voltPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>RPM (15%)</span>
              <span className="font-bold text-white">{rpmPct}% dev</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#00E676] h-full rounded-full transition-all" style={{ width: `${rpmPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#94A3B8]">
              <span>SOUND (10%)</span>
              <span className="font-bold text-white">{soundPct > 0 ? `${soundPct}% stress` : '0% stress'}</span>
            </div>
            <div className="w-full bg-[#141724] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#FF1744] h-full rounded-full transition-all" style={{ width: `${soundPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Time-Aware Degradation Trend Footer */}
      <div className="pt-2 border-t border-[#181B28] flex items-center justify-between text-[10px] text-[#64748B]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-[#00E676]" />
          <span>Evaluation Engine: <strong className="text-white font-mono">Time-Aware History EWMA (Damped Trend)</strong></span>
        </div>
        <span className="text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20 text-[9px] font-bold">
          85% History · 15% Recent
        </span>
      </div>
    </div>
  );
}
