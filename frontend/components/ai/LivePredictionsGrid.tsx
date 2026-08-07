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

export function LivePredictionsGrid({ currentReading, operatingLimits = {} }: LivePredictionsGridProps) {
  const SENSOR_ICONS_MAP: Record<string, any> = {
    temperature: Thermometer,
    vibration: Radio,
    current: Zap,
    voltage: Gauge,
    rpm: Activity,
    sound: Volume2,
    default: Activity,
  };

  const SENSOR_COLORS_MAP: Record<string, string> = {
    temperature: 'text-[#FFB300]',
    vibration: 'text-[#00F2FE]',
    current: 'text-[#3B82F6]',
    voltage: 'text-[#9D4EDD]',
    rpm: 'text-[#00E676]',
    sound: 'text-[#FF1744]',
    default: 'text-[#3B82F6]',
  };

  const dynamicSensors = (operatingLimits as any)?.sensors && (operatingLimits as any).sensors.length > 0
    ? (operatingLimits as any).sensors.filter((s: any) => s.enabled)
    : [
        { sensorKey: 'temperature', displayName: 'Temperature', unit: '°C', maxLimit: operatingLimits.maxTemperature || 80 },
        { sensorKey: 'vibration', displayName: 'Vibration', unit: 'g', maxLimit: operatingLimits.maxVibration || 2.5 },
        { sensorKey: 'current', displayName: 'Current', unit: 'A', maxLimit: operatingLimits.maxCurrent || 15 },
        { sensorKey: 'voltage', displayName: 'Voltage', unit: 'V', maxLimit: operatingLimits.ratedVoltage || 230 },
        { sensorKey: 'rpm', displayName: 'RPM', unit: 'RPM', maxLimit: operatingLimits.minRPM || 1500 },
        { sensorKey: 'sound', displayName: 'Sound Level', unit: 'dB', maxLimit: operatingLimits.maxSound || 85 },
      ];

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
        <span className="text-[10px] text-[#00F2FE]">{dynamicSensors.length} Active Hardware Sensors</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {dynamicSensors.map((s: any) => {
          const key = (s.sensorKey || s.displayName).toLowerCase();
          const Icon = SENSOR_ICONS_MAP[key] || SENSOR_ICONS_MAP.default;
          const iconColor = SENSOR_COLORS_MAP[key] || SENSOR_COLORS_MAP.default;
          const currVal = currentReading ? (currentReading as any)[key] ?? (currentReading as any)[s.sensorKey] ?? (currentReading as any)[s.displayName] : null;
          
          let ratedVal = s.ratedValue || 0;
          let limitVal = s.maxLimit || operatingLimits[key] || defaultLimits[key] || 100;
          let stressPct = 0;

          if (currVal !== null && limitVal > 0) {
            stressPct = Math.min(100, Math.round((Math.abs(currVal - ratedVal) / Math.max(1, limitVal - ratedVal)) * 100));
          }

          const isWarning = stressPct >= 75;
          const isElevated = stressPct >= 35;

          return (
            <div
              key={s.sensorKey || key}
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
                <Icon size={14} className={iconColor} />
                <span className="text-[9px] text-[#64748B] uppercase font-bold">{s.displayName || s.sensorKey}</span>
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
