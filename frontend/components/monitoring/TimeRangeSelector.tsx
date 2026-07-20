'use client';

import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

const RANGES = [
  { value: '5m', label: '5 Min' },
  { value: '30m', label: '30 Min' },
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
] as const;

interface TimeRangeSelectorProps {
  value: string;
  onChange: (range: string) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[oklch(0.17_0.008_240)] bg-[oklch(0.09_0.005_240)] p-1">
      <Clock size={13} className="text-[oklch(0.40_0.01_240)] ml-1.5 mr-0.5 shrink-0" />
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
            value === r.value
              ? 'bg-[oklch(0.52_0.24_240)] text-white shadow-sm'
              : 'text-[oklch(0.45_0.01_240)] hover:text-white hover:bg-[oklch(0.14_0.007_240)]'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
