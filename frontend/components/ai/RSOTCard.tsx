'use client';

import { Clock, Calendar, ShieldAlert, CheckCircle2, Wrench, Activity, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeAwareMaintenanceCardProps {
  machineAgeDays?: number;
  operatingHours?: number;
  remainingOperatingHours?: number | null;
  estimatedMaintenanceDate?: string | null;
  estimatedFailureWindow?: string | null;
  confidenceScore?: number;
  primaryDegradingSensors?: string[];
  rsotFormatted?: string;
  violatingSensor?: string | null;
  timestamp?: string;
}

export function RSOTCard({
  machineAgeDays,
  operatingHours,
  remainingOperatingHours,
  estimatedMaintenanceDate,
  estimatedFailureWindow,
  confidenceScore,
  primaryDegradingSensors = [],
  rsotFormatted,
  violatingSensor,
}: TimeAwareMaintenanceCardProps) {
  const hasRul = remainingOperatingHours !== undefined && remainingOperatingHours !== null;
  const rulHours = hasRul ? remainingOperatingHours! : null;

  const ageDays = machineAgeDays !== undefined && machineAgeDays !== null ? machineAgeDays : null;
  const opHours = operatingHours !== undefined && operatingHours !== null ? operatingHours : null;
  const estDate = estimatedMaintenanceDate || (rulHours !== null ? new Date(Date.now() + rulHours * 3600 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
  const estWindow = estimatedFailureWindow || (rulHours !== null ? 'Predictive Maintenance Active' : 'Awaiting Data');

  const isHealthy = rulHours === null || rulHours >= 1000;
  const isWarning = rulHours !== null && rulHours < 1000 && rulHours >= 300;
  const isCritical = rulHours !== null && rulHours < 300;

  const displayPrimaryCauses = primaryDegradingSensors && primaryDegradingSensors.length > 0
    ? primaryDegradingSensors.join(', ')
    : violatingSensor || 'Nominal Degradation Baseline';

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono flex flex-col justify-between relative overflow-hidden group hover:border-[#262B3F] transition-all shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-[#00F2FE]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            TIME-AWARE MAINTENANCE & RUL FORECASTING
          </h3>
        </div>
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5',
            isCritical
              ? 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30'
              : isWarning
              ? 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30'
              : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {isCritical ? 'CRITICAL MAINTENANCE REQ' : isWarning ? 'MAINTENANCE ADVISORY' : 'SAFE OPERATING WINDOW'}
        </span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Remaining Operating Hours (RUL) */}
        <div className="bg-[#12141F] border border-[#1E202E] p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] font-bold uppercase">
            <span>REMAINING OPERATING HOURS</span>
            <Clock size={13} className="text-[#00F2FE]" />
          </div>
          <div className="mt-2">
            <span
              className={cn(
                'text-2xl font-black font-mono tracking-tight',
                isCritical ? 'text-[#FF1744]' : isWarning ? 'text-[#FFB300]' : 'text-[#00E676]'
              )}
            >
              {rulHours !== null ? `${rulHours.toLocaleString()} h` : '-- h'}
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Estimated RUL</span>
          </div>
        </div>

        {/* Estimated Maintenance Date */}
        <div className="bg-[#12141F] border border-[#1E202E] p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] font-bold uppercase">
            <span>EST. MAINTENANCE DATE</span>
            <Calendar size={13} className="text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-white font-mono tracking-tight block">
              {estDate}
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Failure Window: {estWindow}</span>
          </div>
        </div>

        {/* Machine Age & Total Operating Hours */}
        <div className="bg-[#12141F] border border-[#1E202E] p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] font-bold uppercase">
            <span>MACHINE LIFECYCLE</span>
            <Activity size={13} className="text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-white font-mono block">
              {ageDays !== null ? `${ageDays} Days` : '-- Days'}{' '}
              <span className="text-xs text-[#64748B] font-normal">
                ({opHours !== null ? `${opHours.toLocaleString()} h` : '-- h'})
              </span>
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Total Accumulated Operating Time</span>
          </div>
        </div>

        {/* Prediction Confidence Score */}
        <div className="bg-[#12141F] border border-[#1E202E] p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] font-bold uppercase">
            <span>PREDICTION CONFIDENCE</span>
            <ShieldAlert size={13} className="text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight block">
              {confidenceScore !== undefined && confidenceScore !== null ? `${confidenceScore}%` : '--%'}
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Time-Aware XGBoost Degradation Model</span>
          </div>
        </div>
      </div>

      {/* Primary Degradation Rationale Footer */}
      <div className="bg-[#12141F] border border-[#1E202E] p-3.5 rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          {isCritical || isWarning ? (
            <AlertTriangle size={16} className="text-[#FFB300] shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-[#00E676] shrink-0" />
          )}
          <div>
            <span className="text-xs font-bold text-white font-mono block">
              Primary Degradation Factors: <span className="text-cyan-400">{displayPrimaryCauses}</span>
            </span>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Degradation rates are computed per operating hour using accumulated operational history (80% historical baseline · 20% recent trend window).
            </p>
          </div>
        </div>

        <div className="text-right text-[10px] text-[#64748B]">
          <span>Forecast Horizon: <strong className="text-[#38BDF8]">Time-Aware Trend (History + Live)</strong></span>
        </div>
      </div>
    </div>
  );
}
