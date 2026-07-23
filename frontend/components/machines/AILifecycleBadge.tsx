import React from 'react';
import { AILifecycleStatus } from '@/types';
import {
  Sparkles,
  Database,
  BrainCircuit,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  status?: AILifecycleStatus;
  sampleCount?: number;
  threshold?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const AILifecycleBadge: React.FC<Props> = ({ status = 'registered', sampleCount, threshold = 10000, size = 'md' }) => {
  let effectiveStatus = status;
  if (effectiveStatus === 'ready_for_training' && sampleCount != null && sampleCount < threshold) {
    effectiveStatus = 'collecting_data';
  }

  const getBadgeStyle = () => {
    switch (effectiveStatus) {
      case 'registered':
        return {
          label: 'Registered',
          icon: Sparkles,
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        };
      case 'collecting_data':
        return {
          label: 'Collecting Data',
          icon: Database,
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse',
        };
      case 'ready_for_training':
        return {
          label: 'Ready for Training',
          icon: BrainCircuit,
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold',
        };
      case 'training':
        return {
          label: 'Training AI...',
          icon: Loader2,
          bg: 'bg-purple-500/15 text-purple-400 border-purple-500/40 font-semibold',
        };
      case 'ai_ready':
        return {
          label: 'AI Ready',
          icon: CheckCircle2,
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-semibold',
        };
      case 'retraining_recommended':
        return {
          label: 'Retraining Recommended',
          icon: RefreshCw,
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-semibold',
        };
      default:
        return {
          label: 'Registered',
          icon: Sparkles,
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        };
    }
  };

  const config = getBadgeStyle();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${sizeClasses[size]} transition-all duration-300 shadow-sm`}
    >
      <Icon size={iconSizes[size]} className={status === 'training' ? 'animate-spin' : ''} />
      <span>{config.label}</span>
    </span>
  );
};
