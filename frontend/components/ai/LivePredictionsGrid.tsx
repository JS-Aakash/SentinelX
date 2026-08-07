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

export function LivePredictionsGrid({ currentReading, operatingLimits = {} }: LivePredictionsGridProps) {
  const defaultLimits: Record<string, number> = {
    maxTemperature: 80,
    maxVibration: 2.5,
    maxCurrent: 15,
    ratedVoltage: 230,
    minRPM: 1500,
    maxSound: 85,
  };

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
          LIVE SENSOR TELEMETRY & SPECIFICATION UTILIZATION
        </h3>
        <span className="text-[10px] text-[#00F2FE]">6 Active Hardware Sensors</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SENSORS.map((s) => {
          const Icon = s.icon;
          const currVal = currentReading ? currentReading[s.key] : null;
          
          let ratedVal = 0;
          let limitVal = operatingLimits[s.limitKey] || defaultLimits[s.limitKey] || 100;
          let stressPct = 0;

          if (s.key === 'temperature') {
            ratedVal = operatingLimits.ratedTemperature || 45;
            limitVal = operatingLimits.maxTemperature || defaultLimits.maxTemperature || 80;
            if (currVal !== null && currVal > ratedVal) {
              const range = Math.max(1, limitVal - ratedVal);
              stressPct = Math.min(100, Math.round(((currVal - ratedVal) / range) * 100));
            }
          } else if (s.key === 'current') {
            ratedVal = operatingLimits.ratedCurrent || 3.0;
            limitVal = operatingLimits.maxCurrent || defaultLimits.maxCurrent || 15;
            if (currVal !== null && currVal > ratedVal) {
              const range = Math.max(1, limitVal - ratedVal);
              stressPct = Math.min(100, Math.round(((currVal - ratedVal) / range) * 100));
            }
          } else if (s.key === 'vibration') {
            ratedVal = operatingLimits.ratedVibration || 0.15;
            limitVal = operatingLimits.maxVibration || defaultLimits.maxVibration || 2.5;
            if (currVal !== null && currVal > ratedVal) {
              const range = Math.max(0.1, limitVal - ratedVal);
              stressPct = Math.min(100, Math.round(((currVal - ratedVal) / range) * 100));
            }
          } else if (s.key === 'sound') {
            ratedVal = operatingLimits.ratedSound || 60;
            limitVal = operatingLimits.maxSound || defaultLimits.maxSound || 85;
            if (currVal !== null && currVal > ratedVal) {
              const range = Math.max(1, limitVal - ratedVal);
              stressPct = Math.min(100, Math.round(((currVal - ratedVal) / range) * 100));
            }
          } else if (s.key === 'voltage') {
            limitVal = operatingLimits.ratedVoltage || defaultLimits.ratedVoltage || 230;
            const deviation = currVal !== null ? Math.abs(currVal - 230) : 0;
            stressPct = Math.min(100, Math.round((deviation / 40) * 100));
          } else if (s.key === 'rpm') {
            limitVal = operatingLimits.minRPM || defaultLimits.minRPM || 1500;
            if (currVal !== null && currVal < limitVal) {
              stressPct = Math.min(100, Math.round(((limitVal - currVal) / limitVal) * 100));
            }
          }

          const isWarning = stressPct >= 75;
          const isElevated = stressPct >= 35;

          return (
            <div
              key={s.key}
              className={cn(
                'bg-[#0F111A] border p-3 rounded-xl flex flex-col justify-between space-y-3 transition-all',
                isWarning
                  ? 'border-[#FF1744]/40 bg-[#FF1744]/5'
                  : isElevated
                  ? 'border-[#FFB300]/40 bg-[#FFB300]/5'
                  : 'border-[#1E202E]'
              )}
            >
              <div className="flex items-center justify-between">
                <Icon size={14} className={s.color} />
                <span className="text-[9px] text-[#64748B] uppercase font-bold">{s.name}</span>
              </div>

              <div>
                <p className="text-[9px] text-[#64748B]">CURRENT VALUE</p>
                <p className="text-sm font-bold text-white tabular-nums">
                  {currVal !== null ? `${currVal} ${s.unit}` : `-- ${s.unit}`}
                </p>
              </div>

              <div className="pt-2 border-t border-[#181B28] flex items-center justify-between text-[10px]">
                <div>
                  <p className="text-[8px] text-[#64748B]">MAX LIMIT</p>
                  <p className="font-bold text-[#94A3B8] tabular-nums">{limitVal} {s.unit}</p>
                </div>

                <div className="text-right">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border',
                      isWarning
                        ? 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30'
                        : isElevated
                        ? 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30'
                        : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                    )}
                  >
                    {stressPct > 0 ? `${stressPct}% Stress` : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
