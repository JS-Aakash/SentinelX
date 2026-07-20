'use client';

import { ArrowUpRight, ArrowDownRight, Minus, Thermometer, Radio, Zap, Gauge, Activity, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LivePredictionsGridProps {
  currentReading?: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  } | null;
  predictedNext?: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  } | null;
  operatingLimits?: Record<string, number>;
}

const SENSORS = [
  { key: 'temperature', name: 'Temperature', unit: '°C', icon: Thermometer, color: 'text-[#FFB300]', limitKey: 'maxTemperature' },
  { key: 'vibration', name: 'Vibration', unit: 'g', icon: Radio, color: 'text-[#00F2FE]', limitKey: 'maxVibration' },
  { key: 'current', name: 'Current', unit: 'A', icon: Zap, color: 'text-[#3B82F6]', limitKey: 'maxCurrent' },
  { key: 'voltage', name: 'Voltage', unit: 'V', icon: Gauge, color: 'text-[#9D4EDD]', limitKey: 'ratedVoltage' },
  { key: 'rpm', name: 'RPM', unit: 'RPM', icon: Activity, color: 'text-[#00E676]', limitKey: 'minRPM' },
  { key: 'sound', name: 'Sound Level', unit: 'dB', icon: Volume2, color: 'text-[#FF1744]', limitKey: 'maxSound' },
] as const;

export function LivePredictionsGrid({ currentReading, predictedNext, operatingLimits = {} }: LivePredictionsGridProps) {
  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
          LIVE SENSOR TELEMETRY & 1-STEP PREDICTED DELTAS [t+1]
        </h3>
        <span className="text-[10px] text-[#00F2FE]">6 XGBoost Regressor Outputs</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SENSORS.map((s) => {
          const Icon = s.icon;
          const currVal = currentReading ? currentReading[s.key] : 0;
          const predVal = predictedNext ? predictedNext[s.key] : currVal;
          const diff = Number((predVal - currVal).toFixed(2));
          const isUp = diff > 0;
          const isZero = diff === 0;

          const limitVal = operatingLimits[s.limitKey];

          return (
            <div
              key={s.key}
              className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-3 space-y-2 relative overflow-hidden group hover:border-[#262B3F] transition-all"
            >
              <div className="flex items-center justify-between">
                <Icon size={14} className={s.color} />
                <span className="text-[9px] text-[#64748B] uppercase font-bold">{s.name}</span>
              </div>

              <div>
                <p className="text-[9px] text-[#64748B]">CURRENT [t]</p>
                <p className="text-sm font-bold text-white tabular-nums">
                  {currVal} {s.unit}
                </p>
              </div>

              <div className="pt-2 border-t border-[#181B28] flex items-center justify-between text-[10px]">
                <div>
                  <p className="text-[8px] text-[#64748B]">PREDICTED [t+1]</p>
                  <p className="font-bold text-[#00F2FE] tabular-nums">{predVal} {s.unit}</p>
                </div>

                <div className={cn('flex items-center gap-0.5 font-bold', isZero ? 'text-[#64748B]' : isUp ? 'text-[#FF1744]' : 'text-[#00E676]')}>
                  {isZero ? (
                    <Minus size={12} />
                  ) : isUp ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                  <span>{diff > 0 ? `+${diff}` : diff}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
