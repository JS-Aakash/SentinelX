'use client';

import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface ComingSoonCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

export function ComingSoonCard({ title, description, icon: Icon, color }: ComingSoonCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[oklch(0.17_0.008_240)] bg-[oklch(0.09_0.005_240)] p-5 opacity-60 hover:opacity-80 transition-opacity">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[oklch(0.15_0.008_240)] border border-[oklch(0.22_0.01_240)] flex items-center justify-center">
          <Lock size={14} className="text-[oklch(0.45_0.01_240)]" />
        </div>
        <span className="px-3 py-1 rounded-full bg-[oklch(0.15_0.008_240)] border border-[oklch(0.22_0.01_240)] text-[10px] font-bold text-[oklch(0.55_0.01_240)] uppercase tracking-wider">
          Coming Soon
        </span>
      </div>

      {/* Background content */}
      <div className="relative">
        <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center mb-3', color)}>
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-xs text-[oklch(0.40_0.01_240)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
