'use client';

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Activity, Cpu, Sparkles, Check, FileText } from 'lucide-react';
import { AnomalySeverity, AnomalyEventRecord, anomalyApi } from '@/api/anomaly';
import { cn, formatDate } from '@/lib/utils';

interface AnomalyDetectionPanelProps {
  machineId: string;
  activeEvent?: AnomalyEventRecord | null;
  latestAnomalyScore?: number;
  latestIsAnomaly?: boolean;
  onRefresh?: () => void;
}

export function AnomalyDetectionPanel({
  machineId,
  activeEvent,
  latestAnomalyScore = 0.05,
  latestIsAnomaly = false,
  onRefresh,
}: AnomalyDetectionPanelProps) {
  const [resolving, setResolving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  const severity: AnomalySeverity = activeEvent
    ? activeEvent.severity
    : latestIsAnomaly || latestAnomalyScore >= 0.5
    ? 'Watch'
    : 'Normal';

  const score = activeEvent ? activeEvent.anomalyScore : latestAnomalyScore;
  const confidence = activeEvent?.confidenceScore || 94;

  const getSeverityStyle = (s: AnomalySeverity) => {
    switch (s) {
      case 'Emergency':
        return { bg: 'bg-[#E040FB]/15 border-[#E040FB]/40 text-[#E040FB]', badge: 'EMERGENCY - SHUTDOWN REQ', color: '#E040FB' };
      case 'Critical':
        return { bg: 'bg-[#FF1744]/15 border-[#FF1744]/40 text-[#FF1744]', badge: 'CRITICAL ANOMALY', color: '#FF1744' };
      case 'Warning':
        return { bg: 'bg-[#FFB300]/15 border-[#FFB300]/40 text-[#FFB300]', badge: 'WARNING DEVIATION', color: '#FFB300' };
      case 'Watch':
        return { bg: 'bg-[#00F2FE]/15 border-[#00F2FE]/40 text-[#00F2FE]', badge: 'WATCH - SMALL DRIFT', color: '#00F2FE' };
      default:
        return { bg: 'bg-[#00E676]/15 border-[#00E676]/30 text-[#00E676]', badge: 'NORMAL BASELINE', color: '#00E676' };
    }
  };

  const style = getSeverityStyle(severity);

  // SVG Gauge geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(1, Math.max(0, score)) * circumference;

  const handleAcknowledge = async () => {
    if (!activeEvent) return;
    try {
      setAcknowledging(true);
      await anomalyApi.acknowledge(activeEvent._id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to acknowledge anomaly');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    if (!activeEvent) return;
    try {
      setResolving(true);
      await anomalyApi.resolve(activeEvent._id, notesInput || 'Resolved by operator');
      setShowResolveModal(false);
      setNotesInput('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to resolve anomaly');
    } finally {
      setResolving(false);
    }
  };

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs} sec`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono shadow-xl relative overflow-hidden space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#181B28] gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#141724] border border-[#232738] flex items-center justify-center text-[#00F2FE]">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              REAL-TIME ANOMALY ENGINE (MACHINE BASELINE MONITOR)
            </h3>
            <p className="text-[10px] text-[#64748B] font-sans">
              Isolation Forest multivariate correlation & persistence false-alarm suppression
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5', style.bg)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {style.badge}
          </span>
          {activeEvent && (
            <span className="text-[10px] text-[#94A3B8] bg-[#141724] border border-[#1E2235] px-2.5 py-1 rounded-md">
              Status: <span className="font-bold text-white uppercase">{activeEvent.status}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Gauge + Anomaly Metrics + Root Cause */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Anomaly Gauge Meter */}
        <div className="lg:col-span-4 bg-[#0E101A] border border-[#181B28] rounded-xl p-4 flex flex-col items-center justify-center relative">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={radius} className="stroke-[#141724]" strokeWidth="9" fill="transparent" />
              <circle
                cx="55"
                cy="55"
                r={radius}
                stroke={style.color}
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white tracking-tight tabular-nums">
                {score.toFixed(2)}
              </span>
              <span className="text-[8px] text-[#64748B] font-bold uppercase">ANOMALY SCORE</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between w-full text-[10px] border-t border-[#181B28] pt-2">
            <span className="text-[#64748B]">CONFIDENCE</span>
            <span className="font-bold text-[#00E676]">{confidence}%</span>
          </div>
        </div>

        {/* Root Cause Analysis & Deviation Summary */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-[#12141F] border border-[#1E202E] p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#64748B] font-bold uppercase pb-1 border-b border-[#181B28]">
              <span>AUTOMATED ROOT CAUSE ANALYSIS</span>
              <div className="flex items-center gap-1 text-white">
                <Clock size={11} className="text-[#00F2FE]" />
                <span>
                  {activeEvent ? formatDuration(activeEvent.durationSeconds || 0) : '0 min'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <p className="text-[9px] text-[#64748B]">PRIMARY CAUSE</p>
                <p className="font-bold text-[#FF1744] font-mono">
                  {activeEvent?.primaryCause || (severity !== 'Normal' ? 'Multivariate Sensor Drift' : 'Operating within nominal baseline')}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-[#64748B]">RECOMMENDED ACTION</p>
                <p className="font-bold text-white text-[11px]">
                  {activeEvent?.recommendedAction || 'Maintain standard preventive inspection schedule.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sensor Deviation vs Baseline Table */}
          <div className="overflow-x-auto rounded-xl border border-[#1E202E] bg-[#0E101A]">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                  <th className="px-3 py-1.5 text-left">SENSOR</th>
                  <th className="px-3 py-1.5 text-left">LEARNED EXPECTED</th>
                  <th className="px-3 py-1.5 text-left">ACTUAL VALUE</th>
                  <th className="px-3 py-1.5 text-right">DEVIATION</th>
                </tr>
              </thead>
              <tbody>
                {activeEvent?.sensorDeviations && activeEvent.sensorDeviations.length > 0 ? (
                  activeEvent.sensorDeviations.map((d) => {
                    const isAbnormal = Math.abs(d.deviation) > 0.5;
                    return (
                      <tr key={d.sensor} className="border-b border-[#141724] hover:bg-[#121522]">
                        <td className="px-3 py-1.5 font-bold text-white">{d.sensor}</td>
                        <td className="px-3 py-1.5 text-[#94A3B8]">{d.expected} {d.unit}</td>
                        <td className="px-3 py-1.5 font-bold text-[#00F2FE]">{d.actual} {d.unit}</td>
                        <td className={cn('px-3 py-1.5 text-right font-bold', isAbnormal ? 'text-[#FF1744]' : 'text-[#00E676]')}>
                          {d.deviation > 0 ? `+${d.deviation}` : d.deviation} {d.unit}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-[#64748B]">
                      ALL METRICS MATCHING LEARNED MACHINE BASELINE. NO DEVIATIONS DETECTED.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons for Active Events */}
      {activeEvent && activeEvent.status !== 'Resolved' && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#181B28]">
          {activeEvent.status === 'Active' && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="inline-flex items-center gap-1.5 bg-[#141724] border border-[#3B82F6]/40 text-[#60A5FA] hover:bg-[#1C2033] font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all"
            >
              <Check size={14} />
              {acknowledging ? 'ACKNOWLEDGING...' : 'ACKNOWLEDGE EVENT'}
            </button>
          )}

          <button
            onClick={() => setShowResolveModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] hover:bg-[#00E676]/25 font-bold text-xs px-4 py-1.5 rounded-lg transition-all"
          >
            <CheckCircle2 size={14} />
            RESOLVE EVENT
          </button>
        </div>
      )}

      {/* Resolution Modal Popup */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0D0E15] border border-[#1E2235] p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl font-mono">
            <div className="flex items-center gap-2 text-white">
              <FileText size={18} className="text-[#00E676]" />
              <h3 className="text-sm font-bold uppercase">RESOLVE ANOMALY EVENT</h3>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Enter resolution notes explaining corrective maintenance or calibration action performed:
            </p>

            <textarea
              rows={3}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g., Re-aligned motor shaft coupling and verified vibration returned to baseline."
              className="w-full bg-[#12141F] border border-[#232738] rounded-xl p-3 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#00E676]"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 bg-[#141724] text-xs font-bold text-[#94A3B8] rounded-lg hover:text-white"
              >
                CANCEL
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="px-4 py-2 bg-[#00E676] text-black text-xs font-bold rounded-lg hover:bg-[#00E676]/90 transition-all"
              >
                {resolving ? 'SAVING...' : 'CONFIRM RESOLUTION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
