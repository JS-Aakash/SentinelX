'use client';

import React, { useEffect } from 'react';
import { useMachines } from '@/hooks/useMachines';
import { DataCollectionCard } from '@/components/machines/DataCollectionCard';
import { Database, Radio, BrainCircuit, CheckCircle2, RefreshCw } from 'lucide-react';

export default function DataCollectionClient() {
  const { machines, isLoading, refresh } = useMachines({ limit: 100 });

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Aggregate stats
  const totalMachines = machines.length;
  const recordingCount = machines.filter((m) => m.isRecording).length;
  const totalSamples = machines.reduce(
    (acc, m) => acc + (m.liveDataCollection?.collectedSampleCount || 0),
    0
  );
  const aiReadyCount = machines.filter(
    (m) => m.aiLifecycleStatus === 'ai_ready' || m.aiLifecycleStatus === 'retraining_recommended'
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-[oklch(0.55_0.01_240)] mb-1">
            <span>SentinelX</span>
            <span>/</span>
            <span className="text-[oklch(0.62_0.20_240)] font-medium">Data Acquisition</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="text-[oklch(0.62_0.20_240)]" size={24} />
            Live Data Collection Dashboard
          </h1>
          <p className="text-xs text-[oklch(0.55_0.01_240)] mt-1">
            Monitor dataset sample accumulation, recording status, and AI model training readiness across all enterprise machines.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Database size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Total Samples
            </span>
            <span className="text-xl font-bold text-white font-mono">{totalSamples.toLocaleString()}</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Radio size={20} className={recordingCount > 0 ? 'animate-pulse' : ''} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Recording ON
            </span>
            <span className="text-xl font-bold text-white font-mono">
              {recordingCount} <span className="text-xs text-[oklch(0.50_0.01_240)]">/ {totalMachines}</span>
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              AI Deployed & Ready
            </span>
            <span className="text-xl font-bold text-white font-mono">{aiReadyCount}</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BrainCircuit size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Ready for Training
            </span>
            <span className="text-xl font-bold text-white font-mono">
              {
                machines.filter(
                  (m) =>
                    m.aiLifecycleStatus === 'ready_for_training' ||
                    (m.liveDataCollection?.collectedSampleCount || 0) >=
                      (m.liveDataCollection?.recommendedSamplesThreshold || 10000)
                ).length
              }
            </span>
          </div>
        </div>
      </div>

      {/* Machine Data Collection Cards */}
      {isLoading ? (
        <div className="glass rounded-2xl p-12 text-center text-slate-400 animate-pulse">
          Loading data collection status...
        </div>
      ) : machines.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-slate-400">
          No machines registered yet. Register a machine to start data acquisition.
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <RefreshCw size={16} className="text-[oklch(0.62_0.20_240)] animate-spin-slow" />
            Machine Acquisition Cards
          </h2>
          {machines.map((m) => (
            <DataCollectionCard key={m._id || m.id} machine={m} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
