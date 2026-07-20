'use client';

import { DeviceStatus } from '@/types';
import { cn } from '@/lib/utils';

interface DeviceStatusBadgeProps {
  status: DeviceStatus;
  size?: 'sm' | 'md';
}

const DEVICE_STATUS_CONFIG: Record<DeviceStatus, { label: string; dot: string; badge: string }> = {
  online: {
    label: 'Online',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  },
  maintenance: {
    label: 'Maintenance',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
};

export function DeviceStatusBadge({ status, size = 'sm' }: DeviceStatusBadgeProps) {
  const config = DEVICE_STATUS_CONFIG[status] ?? DEVICE_STATUS_CONFIG.offline;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        config.badge
      )}
    >
      <span
        className={cn(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          config.dot,
          status === 'online' && 'animate-pulse'
        )}
      />
      {config.label}
    </span>
  );
}

export { DEVICE_STATUS_CONFIG };
