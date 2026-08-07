'use client';

import React, { useState, useEffect } from 'react';
import { Machine } from '@/types';
import { machinesApi } from '@/api/machines';
import { AILifecycleBadge } from './AILifecycleBadge';
import { RecordingToggle } from './RecordingToggle';
import {
  Database,
  BrainCircuit,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Save,
  PackagePlus,
} from 'lucide-react';

interface Props {
  machine: Machine;
  onRefresh?: () => void;
}

export const DataCollectionCard: React.FC<Props> = ({ machine, onRefresh }) => {
  const [training, setTraining] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [savedDatasetInfo, setSavedDatasetInfo] = useState<{ version: number; rowCount: number } | null>(null);
  const [availableDatasets, setAvailableDatasets] = useState<any[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);

  useEffect(() => {
    if (!machine.isRecording) return;
    const interval = setInterval(() => {
      if (onRefresh) onRefresh();
    }, 2500);
    return () => clearInterval(interval);
  }, [machine.isRecording, onRefresh]);

  const fetchDatasets = async () => {
    try {
      const res = await import('@/api/datasets').then(m => m.datasetsApi.getByMachine(machine._id || machine.id));
      if (res.data.success && res.data.data) {
        const list = res.data.data;
        setAvailableDatasets(list);
        // Initialize selectedDatasetIds with datasets active in MongoDB (or all if none specified)
        const activeIds = list.filter((d: any) => d.isActive).map((d: any) => d._id);
        setSelectedDatasetIds(activeIds.length > 0 ? activeIds : list.map((d: any) => d._id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDatasets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine._id, machine.id]);

  const stats = machine.liveDataCollection || {
    collectedSampleCount: 0,
    recommendedSamplesThreshold: 10000,
    newSamplesSinceLastTraining: 0,
  };

  const sampleCount = stats.collectedSampleCount || 0;
  const threshold = stats.recommendedSamplesThreshold || 10000;
  const progressPct = Math.min(100, Math.round((sampleCount / threshold) * 100));

  const isReadyForTraining = sampleCount >= threshold;
  const isRetrainingRecommended = machine.aiLifecycleStatus === 'retraining_recommended';

  const handleToggleDataset = async (id: string) => {
    setSelectedDatasetIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    try {
      const { datasetsApi } = await import('@/api/datasets');
      await datasetsApi.activateVersion(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      await machinesApi.trainFromLiveDataset(
        machine._id || machine.id,
        selectedDatasetIds.length > 0 ? selectedDatasetIds : undefined
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to train model');
    } finally {
      setTraining(false);
    }
  };

  const handleClearDataset = async () => {
    setClearing(true);
    try {
      await machinesApi.clearLiveDataset(machine._id || machine.id);
      setShowClearConfirm(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clear dataset');
    } finally {
      setClearing(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      await machinesApi.downloadLiveDataset(machine._id || machine.id, `live_dataset_${machine.machineCode}.csv`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download dataset CSV');
    }
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      const res = await machinesApi.saveProgressAsDataset(machine._id || machine.id);
      if (res.data.data?.dataset) {
        setSavedDatasetInfo({
          version: res.data.data.dataset.version,
          rowCount: res.data.data.dataset.rowCount,
        });
      }
      setShowSaveConfirm(false);
      // Refresh datasets list to show the newly saved dataset
      await fetchDatasets();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save progress as dataset');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="rounded-3xl border border-[#1B1E2E] bg-[#0A0B12] p-6 font-mono space-y-5 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Ribbon */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#181B28] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                {machine.name}
              </h3>
              <span className="text-[11px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded-md border border-[#38BDF8]/20">
                {machine.machineCode}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Live Telemetry Acquisition & AI Model Lifecycle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Save Progress as Dataset */}
          {sampleCount > 0 && (
            <button
              type="button"
              onClick={() => setShowSaveConfirm(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all active:scale-95 shadow-sm"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save as Dataset
            </button>
          )}

          {/* CSV Download */}
          {sampleCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#2B3350] bg-[#141828] hover:bg-[#1A2035] text-[#38BDF8] transition-all active:scale-95 shadow-sm"
            >
              <Download size={13} />
              CSV
            </button>
          )}

          {/* Clear Live Dataset */}
          {sampleCount > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all active:scale-95 shadow-sm"
            >
              <Trash2 size={13} />
              Clear Live Dataset
            </button>
          )}

          <RecordingToggle
            machineId={machine._id || machine.id}
            initialRecording={machine.isRecording}
            onToggleSuccess={() => onRefresh && onRefresh()}
          />
        </div>
      </div>

      {/* Dataset Progress Section */}
      <div className="space-y-3 bg-[#0E101B] p-5 rounded-2xl border border-[#1C2034] relative z-10">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#94A3B8] font-bold uppercase tracking-wider text-[11px]">
            DATASET COLLECTION PROGRESS
          </span>
          <span className="text-white font-extrabold">
            {sampleCount.toLocaleString()} / {threshold.toLocaleString()}{' '}
            <span className="text-[#38BDF8]">({progressPct}%)</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-[#161929] rounded-full overflow-hidden p-0.5 border border-[#232940]">
          <div
            className={`h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(56,189,248,0.5)] ${
              progressPct >= 100
                ? 'bg-gradient-to-r from-[#34D399] to-[#059669]'
                : 'bg-gradient-to-r from-[#38BDF8] via-[#3B82F6] to-[#6366F1]'
            }`}
            style={{ width: `${Math.max(2, progressPct)}%` }}
          />
        </div>

        {/* Saved Dataset Success Banner */}
        {savedDatasetInfo && (
          <div className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <div className="flex items-center gap-2">
              <PackagePlus size={15} className="shrink-0" />
              <span>
                <strong>Dataset v{savedDatasetInfo.version}</strong> saved & feature-engineered successfully — {savedDatasetInfo.rowCount.toLocaleString()} samples bundled. Collection reset to 0.
              </span>
            </div>
            <button onClick={() => setSavedDatasetInfo(null)} className="text-emerald-600 hover:text-emerald-300 text-[10px] ml-2 shrink-0">✕</button>
          </div>
        )}

        {/* Readiness Notification Box */}
        {isReadyForTraining && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] text-xs font-mono">
            <CheckCircle2 size={16} className="shrink-0 text-[#34D399]" />
            <span>Sufficient data available for training ({sampleCount.toLocaleString()} samples). You can train the production AI model now.</span>
          </div>
        )}

        {isRetrainingRecommended && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <AlertCircle size={16} className="shrink-0" />
            <span>New sensor data available ({stats.newSamplesSinceLastTraining} samples). Model retraining recommended.</span>
          </div>
        )}
      </div>

      {/* Metadata Grid (4 Clean Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono relative z-10">
        <div className="bg-[#0E101B] p-3.5 rounded-2xl border border-[#1C2034]">
          <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Start Date</span>
          <span className="text-white font-extrabold text-xs block mt-1">
            {formatDate(stats.collectionStartDate)}
          </span>
        </div>
        <div className="bg-[#0E101B] p-3.5 rounded-2xl border border-[#1C2034]">
          <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Last Data Received</span>
          <span className="text-white font-extrabold text-xs block mt-1">
            {formatDate(stats.lastReadingTimestamp)}
          </span>
        </div>
        <div className="bg-[#0E101B] p-3.5 rounded-2xl border border-[#1C2034]">
          <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Estimated Size</span>
          <span className="text-[#38BDF8] font-extrabold text-xs block mt-1">
            ~{((sampleCount * 120) / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="bg-[#0E101B] p-3.5 rounded-2xl border border-[#1C2034]">
          <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Collecting Data</span>
          <span className="text-[#34D399] font-extrabold text-xs block mt-1">
            {sampleCount.toLocaleString()} / {threshold.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Save Progress Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-md w-full border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <PackagePlus size={22} />
              <h4 className="text-base font-bold text-white">Save Progress as Dataset?</h4>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#94A3B8]">Samples to bundle</span>
                <span className="text-white font-bold">{sampleCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#94A3B8]">Action</span>
                <span className="text-emerald-400 font-bold">Clean → Engineer Features → Save as Dataset</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#94A3B8]">After saving</span>
                <span className="text-[#38BDF8] font-bold">Counter resets to 0 / {threshold.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-[oklch(0.60_0.01_240)]">
              This will persist the current <strong className="text-white">{sampleCount.toLocaleString()} samples</strong> as a new Dataset version for{' '}
              <strong className="text-white">{machine.name}</strong>. The dataset will be automatically cleaned and feature-engineered so it is ready for model training. The live recording counter will reset to 0 and collection will continue.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 rounded-xl border border-[oklch(0.24_0.01_240)] text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-2"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? 'Saving...' : 'Save & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-md w-full border border-red-500/40 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={24} />
              <h4 className="text-base font-bold text-white">Clear Recorded Dataset?</h4>
            </div>
            <p className="text-xs text-[oklch(0.60_0.01_240)]">
              This will permanently delete the live recorded CSV file for{' '}
              <strong className="text-white">{machine.name}</strong> ({sampleCount.toLocaleString()}{' '}
              samples). Previously trained models will not be affected.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-[oklch(0.24_0.01_240)] text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearDataset}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white flex items-center gap-2"
              >
                {clearing && <Loader2 size={12} className="animate-spin" />}
                Clear Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
