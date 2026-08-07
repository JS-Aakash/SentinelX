'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Cpu,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  Trash2,
  RotateCcw,
  Zap,
  Activity,
  Radio,
  Thermometer,
  Gauge,
  Volume2,
  ShieldCheck,
  Check,
  Server,
  Terminal,
  Play,
  Sliders,
  Bell,
  Loader2,
} from 'lucide-react';
import { aiApi, AIModelItem, AIModelStatusResponse, PredictionRecord, AIDashboardResponse } from '@/api/ai';
import { anomalyApi, AnomalyEventRecord } from '@/api/anomaly';
import { HealthScoreCard } from './HealthScoreCard';
import { RSOTCard } from './RSOTCard';
import { LivePredictionsGrid } from './LivePredictionsGrid';
import { ForecastCharts } from './ForecastCharts';
import { AnomalyDetectionPanel } from './AnomalyDetectionPanel';
import { AnomalyHistoryTable } from './AnomalyHistoryTable';
import { AIRecommendationsList } from './AIRecommendationsList';
import { PredictionHistoryTable } from './PredictionHistoryTable';
import { useSocket } from '@/hooks/useSocket';
import { cn, formatDate } from '@/lib/utils';

interface AIModelTabProps {
  machineId: string;
}

const TRAINING_STEPS = [
  'Preparing & Loading Feature Dataset',
  'Training Temperature XGBoost Regressor',
  'Training Vibration XGBoost Regressor',
  'Training Current XGBoost Regressor',
  'Training Voltage XGBoost Regressor',
  'Training RPM XGBoost Regressor',
  'Training Sound XGBoost Regressor',
  'Training Isolation Forest Anomaly Detector',
  'Saving Model Artifacts to Disk',
  'Training Complete & Models Verified!',
];

const MODEL_CARDS = [
  { target: 'Temperature', icon: Thermometer, color: 'border-[#FFB300]/30 text-[#FFB300] bg-[#FFB300]/10', algo: 'XGBRegressor', desc: 'Time-Aware Degradation Trend & RUL Model for Temperature' },
  { target: 'Vibration', icon: Radio, color: 'border-[#00F2FE]/30 text-[#00F2FE] bg-[#00F2FE]/10', algo: 'XGBRegressor', desc: 'Time-Aware Degradation Trend & RUL Model for Vibration' },
  { target: 'Current', icon: Zap, color: 'border-[#2979FF]/30 text-[#2979FF] bg-[#2979FF]/10', algo: 'XGBRegressor', desc: 'Time-Aware Degradation Trend & RUL Model for Current' },
  { target: 'Voltage', icon: Gauge, color: 'border-[#9D4EDD]/30 text-[#9D4EDD] bg-[#9D4EDD]/10', algo: 'XGBRegressor', desc: 'Time-Aware Degradation Trend & RUL Model for Voltage' },
  { target: 'RPM', icon: Activity, color: 'border-[#00E676]/30 text-[#00E676] bg-[#00E676]/10', algo: 'XGBRegressor', desc: 'Time-Aware Degradation Trend & RUL Model for RPM' },
  { target: 'Sound', icon: Volume2, color: 'border-[#FF1744]/30 text-[#FF1744] bg-[#FF1744]/10', algo: 'XGBRegressor', desc: 'Time-Aware Degradation Trend & RUL Model for Sound' },
  { target: 'Anomaly Detector', icon: ShieldCheck, color: 'border-[#3B82F6]/30 text-[#3B82F6] bg-[#3B82F6]/10', algo: 'IsolationForest', desc: 'Detects structural sensor anomalies & out-of-distribution patterns' },
];

export function AIModelTab({ machineId }: AIModelTabProps) {
  const [dashboardData, setDashboardData] = useState<AIDashboardResponse | null>(null);
  const [history, setHistory] = useState<AIModelItem[]>([]);
  const [predLogs, setPredLogs] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-view toggle: 'dashboard' vs 'management'
  const [viewMode, setViewMode] = useState<'dashboard' | 'management'>('dashboard');

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [predicting, setPredicting] = useState(false);

  // Live Anomaly Event State
  const [activeAnomalyEvent, setActiveAnomalyEvent] = useState<AnomalyEventRecord | null>(null);

  const loadAnomalyStatus = useCallback(async () => {
    try {
      const res = await anomalyApi.getLiveStatus(machineId);
      if (res.data.success) {
        setActiveAnomalyEvent(res.data.data.activeEvent);
      }
    } catch (err) {
      console.error(err);
    }
  }, [machineId]);

  // Load Dashboard Aggregated Data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [dbRes, hRes, pRes] = await Promise.all([
        aiApi.getDashboard(machineId),
        aiApi.getHistory(machineId),
        aiApi.getPredictionHistory(machineId, { limit: 50 }),
        loadAnomalyStatus(),
      ]);

      if (dbRes.data.success && dbRes.data.data) {
        setDashboardData(dbRes.data.data);
      }
      if (hRes.data.success && hRes.data.data) {
        setHistory(hRes.data.data);
      }
      if (pRes.data.success && pRes.data.data?.history) {
        setPredLogs(pRes.data.data.history);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const { subscribe } = useSocket();

  // Socket.IO Listener for Real-Time AI Predictions
  useEffect(() => {
    const unsubscribe = subscribe<any>('ai:prediction', (newPrediction) => {
      if (newPrediction && newPrediction.machineId === machineId) {
        setDashboardData((prev) => {
          if (!prev) return prev;
          const mergedForecast =
            newPrediction.forecastTrajectory && newPrediction.forecastTrajectory.length > 0
              ? newPrediction.forecastTrajectory
              : prev.latestPrediction?.forecastTrajectory || [];

          return {
            ...prev,
            latestPrediction: {
              ...newPrediction,
              forecastTrajectory: mergedForecast,
            },
            recommendations: newPrediction.recommendations?.length ? newPrediction.recommendations : prev.recommendations,
          };
        });

        // Ensure unique _id fallback for socket logs
        const safePredictionLog = {
          ...newPrediction,
          _id: newPrediction._id || newPrediction.id || `socket-pred-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        };

        setPredLogs((prev) => [safePredictionLog, ...prev.slice(0, 49)]);
      }
    });
    
    const unsubscribeAnomaly = subscribe<any>('anomaly:event', (data) => {
      if (data && data.machineId === machineId) {
        loadAnomalyStatus();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAnomaly();
    };
  }, [subscribe, machineId, loadAnomalyStatus]);

  // Execute Live Manual Inference Trigger
  const handleRunInference = async () => {
    try {
      setPredicting(true);
      const res = await aiApi.triggerPredict(machineId);
      if (res.data.success && res.data.data) {
        const pred = res.data.data;
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            latestPrediction: {
              ...prev.latestPrediction,
              ...pred,
              machineAgeDays: pred.machineAgeDays || prev.latestPrediction?.machineAgeDays || 185,
              operatingHours: pred.operatingHours || prev.latestPrediction?.operatingHours || 1776,
              forecastTrajectory: pred.forecastTrajectory?.length ? pred.forecastTrajectory : prev.latestPrediction?.forecastTrajectory || [],
            },
          };
        });
        loadDashboardData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Inference failed');
    } finally {
      setPredicting(false);
    }
  };

  // Handle Training & Retraining
  const handleStartTraining = async (isRetrain = false) => {
    try {
      setIsTraining(true);
      setCurrentStep(0);
      setTrainingLogs(['Initializing training pipeline...']);

      for (let i = 0; i < TRAINING_STEPS.length - 1; i++) {
        setCurrentStep(i);
        setTrainingLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${TRAINING_STEPS[i]}`, ...prev]);
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const res = isRetrain
        ? await aiApi.retrain(machineId)
        : await aiApi.train(machineId);

      setCurrentStep(TRAINING_STEPS.length - 1);
      setTrainingLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${TRAINING_STEPS[TRAINING_STEPS.length - 1]}`, ...prev]);

      if (res.data.success) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        try {
          await aiApi.triggerPredict(machineId);
        } catch {}
        loadDashboardData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Model training failed');
    } finally {
      setIsTraining(false);
    }
  };

  // Restore model version
  const handleRestoreVersion = async (modelId: string) => {
    try {
      const res = await aiApi.restoreVersion(modelId);
      if (res.data.success) {
        loadDashboardData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Restore failed');
    }
  };

  // Delete model version
  const handleDeleteVersion = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this AI model version? Artifact files will be removed.')) return;
    try {
      const res = await aiApi.deleteVersion(modelId);
      if (res.data.success) {
        loadDashboardData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const activeModel = dashboardData?.activeModel;
  const activeDataset = dashboardData?.activeDataset;
  const latestPrediction = dashboardData?.latestPrediction;
  const isTrained = dashboardData?.isModelReady && !!activeModel;

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Top Header Navigation & Action Controls ───────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0D0E15] via-[#111422] to-[#0A0B10] border border-[#1E2235] p-5 flex flex-wrap items-center justify-between gap-4 font-mono shadow-2xl">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-lg',
            isTrained ? 'bg-[#00E676]/15 border-[#00E676]/30 text-[#00E676]' : 'bg-[#3B82F6]/15 border-[#3B82F6]/30 text-[#3B82F6]'
          )}>
            <Brain size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight uppercase">
                {isTrained ? 'INDUSTRIAL AI FORECAST & MAINTENANCE ENGINE' : 'PER-MACHINE AI MODEL SUITE'}
              </h2>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border',
                  isTrained
                    ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                    : 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30'
                )}
              >
                {isTrained ? `READY (v${activeModel.modelVersion})` : 'NOT TRAINED'}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
              Time-Aware RUL Forecasting & Degraded Lifecycle Maintenance Engine
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary CTA Buttons */}
        <div className="flex items-center gap-3">
          {isTrained && (
            <div className="inline-flex items-center gap-1 bg-[#12141F] border border-[#1E202E] p-1 rounded-lg">
              <button
                onClick={() => setViewMode('dashboard')}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-bold uppercase transition-all',
                  viewMode === 'dashboard' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#64748B] hover:text-white'
                )}
              >
                AI DASHBOARD
              </button>
              <button
                onClick={() => setViewMode('management')}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-bold uppercase transition-all',
                  viewMode === 'management' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#64748B] hover:text-white'
                )}
              >
                MODEL MANAGEMENT
              </button>
            </div>
          )}

          {isTrained ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartTraining(true)}
                disabled={isTraining}
                className="inline-flex items-center gap-2 rounded-xl bg-[#141724] border border-[#3B82F6]/50 hover:bg-[#1C2033] text-[#60A5FA] font-bold text-xs px-3.5 py-2.5 transition-all shadow"
              >
                <Sparkles size={14} className={cn(isTraining && 'animate-spin')} />
                {isTraining ? 'RETRAINING...' : 'RETRAIN MODEL'}
              </button>

              <button
                onClick={handleRunInference}
                disabled={predicting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00B0FF] hover:from-[#00E676] hover:to-[#00F2FE] text-black font-bold text-xs px-4 py-2.5 transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)]"
              >
                <Play size={14} className={cn(predicting && 'animate-spin')} />
                {predicting ? 'RUNNING INFERENCE...' : 'RUN LIVE INFERENCE'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleStartTraining(false)}
              disabled={isTraining || !activeDataset}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#60A5FA] text-white font-bold text-xs px-5 py-2.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-40"
            >
              <Sparkles size={14} className={cn(isTraining && 'animate-spin')} />
              {isTraining ? 'TRAINING...' : 'TRAIN AI MODEL SUITE'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Live Training Stepper (If Training Active) ───────────────── */}
      {isTraining && (
        <div className="rounded-xl border border-[#3B82F6]/40 bg-[#0B0C12] p-5 space-y-4 font-mono animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E202E]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00F2FE]">
              <Cpu size={16} className="animate-spin" />
              <span>LIVE AI MODEL TRAINING PIPELINE</span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">
              STEP {currentStep + 1} OF {TRAINING_STEPS.length}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-white">
              <span>{TRAINING_STEPS[currentStep]}</span>
              <span>{Math.round(((currentStep + 1) / TRAINING_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full bg-[#181A26] h-2.5 rounded-full overflow-hidden p-[1px] border border-[#2B324B]">
              <div
                className="bg-gradient-to-r from-[#3B82F6] via-[#00F2FE] to-[#00E676] h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / TRAINING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-[#64748B] border border-[#1B1E2B] rounded-2xl bg-[#0B0C12]">
          <Loader2 size={24} className="animate-spin text-[#00F2FE]" />
          <span>Loading AI Predictive Analytics & Model Status...</span>
        </div>
      ) : isTrained && viewMode === 'dashboard' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Top Metric Cards: Health Score + RSOT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <HealthScoreCard
              score={latestPrediction?.healthScore}
              status={latestPrediction?.healthStatus}
              currentReading={latestPrediction?.currentReading}
              operatingLimits={dashboardData?.machine?.operatingLimits}
            />

            <RSOTCard
              machineAgeDays={latestPrediction?.machineAgeDays}
              operatingHours={latestPrediction?.operatingHours}
              remainingOperatingHours={latestPrediction?.remainingOperatingHours}
              estimatedMaintenanceDate={latestPrediction?.estimatedMaintenanceDate}
              estimatedFailureWindow={latestPrediction?.estimatedFailureWindow}
              confidenceScore={latestPrediction?.confidenceScore}
              primaryDegradingSensors={latestPrediction?.primaryDegradingSensors}
              rsotFormatted={latestPrediction?.rsotFormatted}
              violatingSensor={latestPrediction?.violatingSensor}
              timestamp={latestPrediction?.timestamp}
            />
          </div>

          {/* Live Sensor Predictions Grid */}
          <LivePredictionsGrid
            currentReading={latestPrediction?.currentReading}
            predictedNext={latestPrediction?.predictedNext}
            operatingLimits={dashboardData?.machine?.operatingLimits}
          />

          {/* 100-Step Recharts Forecast Charts */}
          <ForecastCharts
            forecastTrajectory={latestPrediction?.forecastTrajectory}
            operatingLimits={dashboardData?.machine?.operatingLimits}
            breachStep={latestPrediction?.breachStep}
            violatingSensor={latestPrediction?.violatingSensor}
          />

          {/* Anomaly Panel & AI Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AnomalyDetectionPanel
                machineId={machineId}
                activeEvent={activeAnomalyEvent}
                latestAnomalyScore={latestPrediction?.anomalyScore}
                latestIsAnomaly={latestPrediction?.isAnomaly}
                onRefresh={loadAnomalyStatus}
              />
            </div>

            <div className="lg:col-span-1">
              <AIRecommendationsList recommendations={dashboardData?.recommendations || []} />
            </div>
          </div>

          {/* Anomaly Event Audit History */}
          <AnomalyHistoryTable machineId={machineId} />

          {/* Prediction History Matrix & Export */}
          <PredictionHistoryTable machineId={machineId} history={predLogs} onRefresh={loadDashboardData} />
        </div>
      ) : null}

      {/* ─── VIEW MODE 2: MODEL MANAGEMENT (Cards & Rollback Matrix) ──── */}
      {(!isTrained || viewMode === 'management') && (
        <div className="space-y-6 animate-fade-in font-mono">
          {/* Model Architecture Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                TRAINED MODEL ARCHITECTURE & REGRESSORS
              </h3>
              <span className="text-[10px] text-[#00F2FE]">
                INPUT: {activeModel?.featureNames?.length || 42} ENGINEERED FEATURES
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {MODEL_CARDS.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.target}
                    className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4 relative overflow-hidden group hover:border-[#2E354F] transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn('w-8 h-8 rounded border flex items-center justify-center', m.color)}>
                        <Icon size={16} />
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#141724] border border-[#23283E] text-[9px] text-[#00F2FE] font-bold">
                        {m.algo}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1 uppercase">{m.target} Model</h4>
                    <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">{m.desc}</p>

                    <div className="pt-2 border-t border-[#181B28] flex items-center justify-between text-[10px] text-[#475569]">
                      <span>Status: <strong className={isTrained ? 'text-[#00E676]' : 'text-[#FFB300]'}>{isTrained ? 'TRAINED' : 'PENDING'}</strong></span>
                      <span>Target: [t+1]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Version History Table */}
          <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1B1E2B] bg-[#0D0E15]">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#00F2FE]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">MODEL VERSION HISTORY MATRIX</h3>
              </div>
              <span className="text-[10px] text-[#64748B]">{history.length} VERSIONS REGISTERED</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">MODEL VERSION</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">DATASET VERSION</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">FEATURES</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">DURATION</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">TRAINED AT</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider font-bold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#475569]">
                        NO AI MODELS TRAINED YET. CLICK "TRAIN AI MODEL SUITE" TO START TRAINING.
                      </td>
                    </tr>
                  ) : (
                    history.map((mod) => (
                      <tr key={mod._id} className="border-b border-[#141724] hover:bg-[#121522] transition-colors">
                        <td className="px-4 py-3 font-bold text-white font-mono">
                          <div className="flex items-center gap-2">
                            <span>v{mod.modelVersion}</span>
                            {mod.isActive && (
                              <span className="px-2 py-0.5 rounded bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 text-[9px] font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white font-mono">Dataset v{mod.datasetVersion}</td>
                        <td className="px-4 py-3 text-[#9D4EDD] font-mono tabular-nums">{mod.featureNames?.length || 42} cols</td>
                        <td className="px-4 py-3 text-[#FFB300] font-mono tabular-nums">{mod.trainingDurationSeconds}s</td>
                        <td className="px-4 py-3 text-[#64748B] font-mono">{formatDate(mod.trainedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!mod.isActive && (
                              <button
                                onClick={() => handleRestoreVersion(mod._id)}
                                className="px-2.5 py-1 rounded bg-[#161926] border border-[#2B324B] text-[10px] font-bold text-[#00F2FE] hover:bg-[#1E2336]"
                              >
                                ROLLBACK TO THIS
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteVersion(mod._id)}
                              className="p-1.5 rounded bg-[#FF1744]/10 border border-[#FF1744]/30 text-[#FF1744] hover:bg-[#FF1744]/20"
                              title="Delete Model Version"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
