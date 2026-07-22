import React, { useState } from 'react';
import { machinesApi } from '@/api/machines';
import { Radio, Loader2, Info } from 'lucide-react';

interface Props {
  machineId: string;
  initialRecording?: boolean;
  onToggleSuccess?: (isRecording: boolean) => void;
  disabled?: boolean;
}

export const RecordingToggle: React.FC<Props> = ({
  machineId,
  initialRecording = false,
  onToggleSuccess,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(initialRecording);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || loading) return;
    const nextState = !isRecording;
    setLoading(true);
    try {
      await machinesApi.toggleRecording(machineId, nextState);
      setIsRecording(nextState);
      if (onToggleSuccess) onToggleSuccess(nextState);
    } catch (err) {
      console.error('Failed to toggle recording:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-[oklch(0.13_0.008_240)] border border-[oklch(0.20_0.01_240)] rounded-xl px-3.5 py-2">
      <div className="flex items-center gap-2">
        <div className={`relative flex items-center justify-center`}>
          <Radio
            size={16}
            className={isRecording ? 'text-red-500 animate-pulse' : 'text-slate-500'}
          />
          {isRecording && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </div>
        <div>
          <span className="text-xs font-semibold text-white block">Data Recording</span>
          <span className="text-[10px] text-[oklch(0.55_0.01_240)] block">
            {isRecording ? 'ON (Saving to dataset)' : 'OFF (Monitoring only)'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || loading}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isRecording ? 'bg-red-600' : 'bg-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isRecording ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {loading && <Loader2 size={11} className="animate-spin text-slate-800" />}
        </span>
      </button>

      <div className="group relative">
        <Info size={14} className="text-slate-500 hover:text-slate-300 cursor-pointer" />
        <div className="absolute right-0 top-6 hidden group-hover:block w-56 p-2.5 bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded-lg shadow-xl z-50">
          <p className="font-semibold text-white mb-1">Recording Behavior Matrix:</p>
          <p className="mb-1"><strong className="text-red-400">ON:</strong> Telemetry is stored for future AI model training.</p>
          <p><strong className="text-slate-400">OFF:</strong> Live predictions & dashboard update without writing to training datasets.</p>
        </div>
      </div>
    </div>
  );
};
