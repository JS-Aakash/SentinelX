import React, { useState } from 'react';
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
} from 'lucide-react';

interface Props {
  machine: Machine;
  onRefresh?: () => void;
}

export const DataCollectionCard: React.FC<Props> = ({ machine, onRefresh }) => {
  const [training, setTraining] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const stats = machine.liveDataCollection || {
    collectedSampleCount: 0,
    recommendedSamplesThreshold: 10000,
    newSamplesSinceLastTraining: 0,
  };

  const sampleCount = stats.collectedSampleCount || 0;
  const threshold = stats.recommendedSamplesThreshold || 10000;
  const progressPct = Math.min(100, Math.round((sampleCount / threshold) * 100));

  const isReadyForTraining = sampleCount >= threshold || machine.aiLifecycleStatus === 'ready_for_training';
  const isRetrainingRecommended = machine.aiLifecycleStatus === 'retraining_recommended';

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      await machinesApi.trainFromLiveDataset(machine._id || machine.id);
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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.20_0.01_240)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[oklch(0.18_0.008_240)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[oklch(0.52_0.24_240/0.15)] text-[oklch(0.62_0.20_240)]">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Data Acquisition & Training</h3>
            <p className="text-[11px] text-[oklch(0.55_0.01_240)]">
              Sensor data collection and AI pipeline status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AILifecycleBadge status={machine.aiLifecycleStatus} size="md" />
          <RecordingToggle
            machineId={machine._id || machine.id}
            initialRecording={machine.isRecording}
            onToggleSuccess={() => onRefresh && onRefresh()}
          />
        </div>
      </div>

      {/* Dataset Progress Section */}
      <div className="space-y-2.5 bg-[oklch(0.12_0.007_240)] p-4 rounded-xl border border-[oklch(0.17_0.008_240)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[oklch(0.60_0.01_240)] font-medium">Dataset Collection Samples</span>
          <span className="font-mono text-white font-bold">
            {sampleCount.toLocaleString()} / {threshold.toLocaleString()}{' '}
            <span className="text-[oklch(0.52_0.24_240)]">({progressPct}%)</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-[oklch(0.18_0.008_240)] rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-cyan-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Readiness Message */}
        {isReadyForTraining && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mt-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Sufficient data available for training. You can train the AI model now.</span>
          </div>
        )}

        {isRetrainingRecommended && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs mt-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>New sensor data available ({stats.newSamplesSinceLastTraining} samples). Retraining recommended.</span>
          </div>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[oklch(0.12_0.007_240)] p-3 rounded-lg border border-[oklch(0.16_0.008_240)]">
          <span className="text-[oklch(0.50_0.01_240)] text-[10px] block">Start Date</span>
          <span className="text-white font-medium text-[11px] block mt-0.5">
            {formatDate(stats.collectionStartDate)}
          </span>
        </div>
        <div className="bg-[oklch(0.12_0.007_240)] p-3 rounded-lg border border-[oklch(0.16_0.008_240)]">
          <span className="text-[oklch(0.50_0.01_240)] text-[10px] block">Last Data Received</span>
          <span className="text-white font-medium text-[11px] block mt-0.5">
            {formatDate(stats.lastReadingTimestamp)}
          </span>
        </div>
        <div className="bg-[oklch(0.12_0.007_240)] p-3 rounded-lg border border-[oklch(0.16_0.008_240)]">
          <span className="text-[oklch(0.50_0.01_240)] text-[10px] block">Estimated Size</span>
          <span className="text-white font-mono font-medium text-[11px] block mt-0.5">
            ~{((sampleCount * 120) / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="bg-[oklch(0.12_0.007_240)] p-3 rounded-lg border border-[oklch(0.16_0.008_240)]">
          <span className="text-[oklch(0.50_0.01_240)] text-[10px] block">New Samples</span>
          <span className="text-white font-mono font-medium text-[11px] block mt-0.5">
            {stats.newSamplesSinceLastTraining || 0}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTrainModel}
            disabled={training || sampleCount < 5}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
              isReadyForTraining || isRetrainingRecommended
                ? 'bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-blue-600 hover:from-[oklch(0.58_0.26_240)] hover:to-blue-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            } ${training ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {training ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <BrainCircuit size={14} />
            )}
            {training
              ? 'Training AI...'
              : isRetrainingRecommended
              ? 'Retrain Model'
              : 'Train AI Model'}
          </button>

          {sampleCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-[oklch(0.24_0.01_240)] bg-[oklch(0.14_0.007_240)] hover:bg-[oklch(0.18_0.008_240)] text-slate-300 transition-colors"
            >
              <Download size={13} />
              CSV
            </button>
          )}
        </div>

        {sampleCount > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 size={13} />
            Clear Dataset
          </button>
        )}
      </div>

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
