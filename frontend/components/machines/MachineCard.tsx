'use client';

import Link from 'next/link';
import { Machine } from '@/types';
import { MachineStatusBadge } from './MachineStatusBadge';
import { cn, formatDate } from '@/lib/utils';
import { Cpu, MapPin, Calendar, Tag } from 'lucide-react';

interface MachineCardProps {
  machine: Machine;
  className?: string;
}

export function MachineCard({ machine, className }: MachineCardProps) {
  return (
    <Link
      href={`/machines/${machine._id}`}
      className={cn(
        'group glass rounded-xl overflow-hidden flex flex-col hover:border-[oklch(0.35_0.015_240/0.6)] transition-all hover:shadow-lg hover:shadow-[oklch(0.52_0.24_240/0.08)] hover:-translate-y-0.5',
        className
      )}
    >
      {/* Image / Placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-[oklch(0.13_0.008_240)] to-[oklch(0.10_0.006_240)] overflow-hidden shrink-0">
        {machine.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={machine.image}
            alt={machine.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Cpu size={48} className="text-[oklch(0.25_0.01_240)] group-hover:text-[oklch(0.35_0.015_240)] transition-colors" />
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2.5 right-2.5">
          <MachineStatusBadge status={machine.status} size="sm" />
        </div>
        {/* Type chip */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/80">
            <Tag size={9} />
            {machine.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div>
          <p className="text-xs font-mono text-[oklch(0.50_0.015_240)] tracking-wider">{machine.machineCode}</p>
          <h3 className="font-semibold text-white text-sm mt-0.5 group-hover:text-[oklch(0.75_0.18_200)] transition-colors line-clamp-1">
            {machine.name}
          </h3>
          {machine.manufacturer && (
            <p className="text-xs text-[oklch(0.48_0.01_240)] mt-0.5">{machine.manufacturer}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mt-auto">
          {(machine.plant || machine.department) && (
            <div className="flex items-center gap-1.5 text-[oklch(0.48_0.01_240)]">
              <MapPin size={11} className="shrink-0" />
              <span className="text-xs truncate">
                {[machine.department, machine.plant].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[oklch(0.40_0.01_240)]">
            <Calendar size={11} className="shrink-0" />
            <span className="text-xs">Added {formatDate(machine.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
