'use client';

import { Sensor, SensorType } from '@/types';
import { cn } from '@/lib/utils';
import {
  Thermometer,
  Activity,
  Zap,
  Gauge,
  Volume2,
  Clock,
  Settings2,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface SensorCardProps {
  sensor: Sensor;
  onConfigure?: (sensor: Sensor) => void;
  canConfigure?: boolean;
}

const SENSOR_ICONS: Record<SensorType, React.ElementType> = {
  temperature: Thermometer,
  vibration: Activity,
  current: Zap,
  voltage: Gauge,
  rpm: Gauge,
  sound: Volume2,
};

const SENSOR_COLORS: Record<SensorType, { bg: string; text: string; border: string }> = {
  temperature: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  vibration: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  current: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  voltage: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
  },
  rpm: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  sound: {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
  },
};

export function SensorCard({ sensor, onConfigure, canConfigure = true }: SensorCardProps) {
  const Icon = SENSOR_ICONS[sensor.type] || Activity;
  const colors = SENSOR_COLORS[sensor.type] || SENSOR_COLORS.vibration;

  const thresholdEntries = Object.entries(sensor.thresholds || {}).filter(
    ([, val]) => val !== null && val !== undefined
  );

  return (
    <div
      className={cn(
        'glass rounded-xl p-4.5 flex flex-col justify-between transition-all relative overflow-hidden',
        !sensor.isEnabled && 'opacity-50 grayscale-[0.3]'
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm',
              colors.bg,
              colors.border,
              colors.text
            )}
          >
            <Icon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white text-sm line-clamp-1">
                {sensor.sensorName}
              </h4>
            </div>
            <p className="text-[11px] font-mono text-[oklch(0.50_0.015_240)] mt-0.5">
              {sensor.sensorId}
            </p>
          </div>
        </div>

        {/* Status chip */}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0',
            sensor.status === 'active' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            sensor.status === 'inactive' && 'bg-slate-500/15 text-slate-400 border-slate-500/30',
            sensor.status === 'fault' && 'bg-red-500/15 text-red-400 border-red-500/30'
          )}
        >
          {sensor.status === 'active' ? (
            <CheckCircle2 size={10} />
          ) : sensor.status === 'fault' ? (
            <AlertCircle size={10} />
          ) : (
            <XCircle size={10} />
          )}
          {sensor.status.toUpperCase()}
        </span>
      </div>

      {/* Middle info */}
      <div className="my-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs py-1 border-b border-[oklch(0.16_0.008_240)]">
          <span className="text-[oklch(0.50_0.01_240)]">Measurement Unit</span>
          <span className="font-semibold text-white bg-[oklch(0.14_0.007_240)] px-2 py-0.5 rounded border border-[oklch(0.20_0.01_240)] font-mono">
            {sensor.unit}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs py-1 border-b border-[oklch(0.16_0.008_240)]">
          <span className="text-[oklch(0.50_0.01_240)] flex items-center gap-1">
            <Clock size={11} /> Sampling Interval
          </span>
          <span className="font-medium text-[oklch(0.75_0.18_200)]">
            {sensor.samplingInterval}
          </span>
        </div>

        {/* Thresholds */}
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-[oklch(0.42_0.01_240)] mb-1 mt-2">
            Active Thresholds
          </p>
          {thresholdEntries.length === 0 ? (
            <p className="text-xs text-[oklch(0.40_0.01_240)] italic">No thresholds set</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {thresholdEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-[10px] font-mono rounded bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] text-white px-2 py-0.5"
                >
                  <span className="text-[oklch(0.50_0.01_240)]">{formatThresholdKey(key)}:</span>
                  <span className="text-[oklch(0.75_0.18_200)] font-semibold">
                    {value} {sensor.unit}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom config button */}
      {canConfigure && onConfigure && (
        <button
          onClick={() => onConfigure(sensor)}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[oklch(0.22_0.01_240)] bg-[oklch(0.12_0.007_240)] hover:bg-[oklch(0.16_0.008_240)] hover:border-[oklch(0.35_0.015_240)] text-xs text-white py-1.5 transition-colors font-medium mt-1"
        >
          <Settings2 size={13} />
          Configure Sensor
        </button>
      )}
    </div>
  );
}

function formatThresholdKey(key: string): string {
  const map: Record<string, string> = {
    maxTemperature: 'Max Temp',
    maxVibration: 'Max Vib',
    maxCurrent: 'Max Curr',
    minVoltage: 'Min Volt',
    maxVoltage: 'Max Volt',
    minRPM: 'Min RPM',
    maxSound: 'Max Sound',
  };
  return map[key] || key;
}
