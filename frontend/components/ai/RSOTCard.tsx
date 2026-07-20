'use client';

import { Clock, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RSOTCardProps {
  rsotSeconds?: number | null;
  rsotFormatted?: string;
  violatingSensor?: string | null;
  breachStep?: number | null;
  timestamp?: string;
}

export function RSOTCard({
  rsotSeconds,
  rsotFormatted = 'Safe (> 100 steps)',
  violatingSensor,
  breachStep,
  timestamp,
}: RSOTCardProps) {
  const isBreached = breachStep !== null && breachStep !== undefined;

  // Calculate estimated safe until date/time
  const safeUntilDate = isBreached && rsotSeconds
    ? new Date(Date.now() + rsotSeconds * 1000).toLocaleTimeString()
    : 'No Limit Breach Forecasted within 100 steps';

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono flex flex-col justify-between relative overflow-hidden group hover:border-[#262B3F] transition-all shadow-xl">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#00F2FE]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            REMAINING SAFE OPERATING TIME (RSOT)
          </h3>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
            isBreached
              ? 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30'
              : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
          )}
        >
          {isBreached ? `LIMIT BREACH AT STEP ${breachStep}` : 'SAFE OPERATING STATE'}
        </span>
      </div>

      <div className="py-2 space-y-3">
        <div>
          <p className="text-[10px] text-[#64748B] font-bold uppercase">FORECASTED SAFE OPERATING HORIZON</p>
          <div className="flex items-baseline gap-3 mt-1">
            <span
              className={cn(
                'text-3xl font-black tracking-tight font-mono tabular-nums',
                isBreached ? 'text-[#FF1744]' : 'text-[#00E676]'
              )}
            >
              {rsotFormatted}
            </span>
          </div>
        </div>

        {/* Breach Sensor Rationale */}
        <div className="bg-[#12141F] border border-[#1E202E] p-3 rounded-lg text-xs flex items-start gap-2.5">
          {isBreached ? (
            <AlertTriangle size={16} className="text-[#FF1744] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={16} className="text-[#00E676] shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-white font-bold text-[11px]">
              {isBreached
                ? `Primary Limit Breach: ${violatingSensor} Sensor`
                : 'All Monitored Sensors Within Operating Limits'}
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5 leading-relaxed">
              {isBreached
                ? `Forecasted trend indicates ${violatingSensor} will exceed configured safe limit at step ${breachStep}. Estimated safe until ${safeUntilDate}.`
                : '100-step recursive forecast shows all 6 sensors remaining stably within configured thresholds.'}
            </p>
          </div>
        </div>

        {/* Step Visual Timeline */}
        <div className="pt-2">
          <div className="flex justify-between text-[9px] text-[#64748B] mb-1">
            <span>NOW (STEP 0)</span>
            <span>STEP 25</span>
            <span>STEP 50</span>
            <span>{isBreached ? `BREACH (STEP ${breachStep})` : 'STEP 100'}</span>
          </div>

          <div className="w-full bg-[#141724] h-2 rounded-full overflow-hidden relative">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                isBreached ? 'bg-gradient-to-r from-[#00E676] via-[#FFB300] to-[#FF1744]' : 'bg-[#00E676]'
              )}
              style={{ width: isBreached ? `${Math.min(100, ((breachStep || 100) / 100) * 100)}%` : '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
