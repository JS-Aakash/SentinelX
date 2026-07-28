import React, { useState, useEffect, useCallback } from 'react';
import { useMachines } from '@/hooks/useMachines';
import { Machine, SimulationProfile, SimulationOverride, SimulationSession } from '@/types';
import { simulationApi } from '@/api/simulation';
import {
  Play,
  Pause,
  Square,
  FastForward,
  Activity,
  Zap,
  Gauge,
  Thermometer,
  Radio,
  Volume2,
  Cpu,
  Flame,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle,
  Plus,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface Props {
  initialMachineId?: string;
}

export const SimulationControlPanel: React.FC<Props> = ({ initialMachineId }) => {
  const { machines } = useMachines({ limit: 100 });
  const [selectedMachineId, setSelectedMachineId] = useState<string>(initialMachineId || '');
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [activeProfile, setActiveProfile] = useState<SimulationProfile>('normal_operation');

  // Manual Sensor Overrides
  const [sensors, setSensors] = useState<{
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  }>({
    temperature: 42.5,
    vibration: 0.14,
    current: 3.4,
    voltage: 230.0,
    rpm: 1485,
    sound: 62.0,
  });

  // Auto-select first machine if none selected
  useEffect(() => {
    if (!selectedMachineId && machines.length > 0) {
      setSelectedMachineId(machines[0]._id || machines[0].id);
    }
  }, [machines, selectedMachineId]);

  // Live graph history buffer for interactive simulator visualizer
  const [simHistory, setSimHistory] = useState<Array<{
    time: string;
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  }>>(() => {
    const now = Date.now();
    return Array.from({ length: 10 }).map((_, i) => ({
      time: new Date(now - (10 - i) * 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature: 42.0,
      vibration: 0.14,
      current: 3.4,
      voltage: 230.0,
      rpm: 1480,
      sound: 58.0,
    }));
  });

  // Poll status when machine selected
  const fetchStatus = useCallback(async () => {
    if (!selectedMachineId || selectedMachineId === 'undefined' || selectedMachineId === 'null') return;
    try {
      const res = await simulationApi.getStatus(selectedMachineId);
      const sess = res.data?.data;
      if (sess && sess.currentValues) {
        setSession(sess);
        setSpeed(sess.speed || 1);
        setActiveProfile(sess.profile || 'normal_operation');
        setSensors(sess.currentValues);

        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setSimHistory((prev) => [
          ...prev.slice(-19),
          {
            time: timeLabel,
            temperature: Number(sess.currentValues.temperature.toFixed(1)),
            vibration: Number(sess.currentValues.vibration.toFixed(2)),
            current: Number(sess.currentValues.current.toFixed(1)),
            voltage: Number((sess.currentValues.voltage ?? 230).toFixed(1)),
            rpm: Math.round(sess.currentValues.rpm ?? 1480),
            sound: Number((sess.currentValues.sound ?? 60).toFixed(1)),
          },
        ]);
      } else {
        setSession(null);
      }
    } catch {
      // Non-critical polling catch - prevents console spam on network timeouts
    }
  }, [selectedMachineId]);

  useEffect(() => {
    if (!selectedMachineId || selectedMachineId === 'undefined' || selectedMachineId === 'null') return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus, selectedMachineId]);

  const activeMachine = machines.find((m) => (m._id || m.id) === selectedMachineId);

  const handleStart = async (prof?: SimulationProfile) => {
    if (!selectedMachineId) return;
    const targetProfile = prof || activeProfile;
    setLoading(true);
    try {
      const res = await simulationApi.start({
        machineId: selectedMachineId,
        profile: targetProfile,
        speed,
        overrides: targetProfile === 'custom' ? sensors : undefined,
      });
      if (res.data?.data) {
        setSession(res.data.data);
        setActiveProfile(targetProfile);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!selectedMachineId) return;
    try {
      const res = await simulationApi.pause(selectedMachineId);
      if (res.data?.data) setSession(res.data.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResume = async () => {
    if (!selectedMachineId) return;
    try {
      const res = await simulationApi.resume(selectedMachineId);
      if (res.data?.data) setSession(res.data.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    if (!selectedMachineId) return;
    try {
      await simulationApi.stop(selectedMachineId);
      setSession(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed);
    if (session && !session.isPaused) {
      await simulationApi.start({
        machineId: selectedMachineId,
        profile: activeProfile,
        speed: newSpeed,
        overrides: sensors,
      });
    }
  };

  const updateTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSensorChange = (key: keyof typeof sensors, val: number) => {
    setSensors((prevSensors) => {
      const next = { ...prevSensors, [key]: val };
      const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSimHistory((prev) => [
        ...prev.slice(-19),
        {
          time: timeLabel,
          temperature: Number(next.temperature.toFixed(1)),
          vibration: Number(next.vibration.toFixed(2)),
          current: Number(next.current.toFixed(1)),
          voltage: Number((next.voltage ?? 230).toFixed(1)),
          rpm: Math.round(next.rpm ?? 1480),
          sound: Number((next.sound ?? 60).toFixed(1)),
        },
      ]);
      return next;
    });

    setActiveProfile('custom');

    if (!selectedMachineId) return;

    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = setTimeout(() => {
      simulationApi.updateSensors(selectedMachineId, { [key]: val }).catch(() => {});
    }, 150);
  };

  const profilesConfig: Array<{
    id: SimulationProfile;
    title: string;
    description: string;
    icon: any;
    color: string;
  }> = [
      {
        id: 'normal_operation',
        title: 'Normal Operation',
        description: 'Stable RPM, normal temperature & low vibration',
        icon: CheckCircle,
        color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
      },
      {
        id: 'bearing_failure',
        title: 'Bearing Failure',
        description: 'Rapid temperature rise, high vibration & noise',
        icon: Flame,
        color: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      },
      {
        id: 'motor_overload',
        title: 'Motor Overload',
        description: 'Current spike, high heat & speed drop',
        icon: Zap,
        color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
      },
      {
        id: 'loose_belt',
        title: 'Loose Belt Slip',
        description: 'Oscillating RPM, fluctuating current & wobble',
        icon: RotateCcw,
        color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
      },
      {
        id: 'voltage_fluctuation',
        title: 'Voltage Fluctuation',
        description: 'Erratic supply voltage with inverse current draw',
        icon: AlertTriangle,
        color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
      },
    ];

  return (
    <div className="space-y-6">
      {/* Top Controls: Machine Selector + Global Actions + Speed Selector */}
      <div className="glass rounded-2xl p-5 border border-[oklch(0.20_0.01_240)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Machine Selection Dropdown */}
          <div className="flex items-center gap-3 min-w-[280px]">
            <div className="p-2 rounded-lg bg-[oklch(0.52_0.24_240/0.15)] text-[oklch(0.62_0.20_240)]">
              <Cpu size={20} />
            </div>
            <div>
              <label className="text-[10px] text-[oklch(0.50_0.01_240)] uppercase tracking-wider font-semibold block">
                Target Machine for Simulation
              </label>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="bg-[oklch(0.12_0.007_240)] border border-[oklch(0.22_0.01_240)] text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-[oklch(0.52_0.24_240)] mt-0.5"
              >
                {machines.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.name} ({m.machineCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Simulation Start / Pause / Stop Buttons */}
          <div className="flex items-center gap-2">
            {!session || session.isPaused ? (
              <button
                type="button"
                onClick={session?.isPaused ? handleResume : () => handleStart()}
                disabled={loading || !selectedMachineId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg hover:shadow-emerald-500/20"
              >
                <Play size={14} fill="currentColor" />
                {session?.isPaused ? 'Resume Simulation' : 'Start Simulation'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all"
              >
                <Pause size={14} fill="currentColor" />
                Pause
              </button>
            )}

            {session && (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600/80 hover:bg-red-500 transition-all"
              >
                <Square size={14} fill="currentColor" />
                Stop
              </button>
            )}
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-xl p-1 text-xs">
            <span className="text-[10px] text-[oklch(0.50_0.01_240)] px-2 font-medium flex items-center gap-1">
              <FastForward size={12} /> Speed
            </span>
            {[1, 5, 10, 100].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${speed === s
                  ? 'bg-[oklch(0.52_0.24_240)] text-white shadow-sm'
                  : 'text-[oklch(0.60_0.01_240)] hover:text-white'
                  }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Recording Behavior Banner */}
        {activeMachine && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.008_240)] text-xs">
            <div className="flex items-center gap-2">
              <Radio
                size={14}
                className={activeMachine.isRecording ? 'text-red-500 animate-pulse' : 'text-slate-500'}
              />
              <span className="text-white font-medium">
                Active State:{' '}
                <strong className={activeMachine.isRecording ? 'text-red-400' : 'text-slate-400'}>
                  Recording {activeMachine.isRecording ? 'ON' : 'OFF'}
                </strong>{' '}
                +{' '}
                <strong className={session && !session.isPaused ? 'text-emerald-400' : 'text-slate-400'}>
                  Simulator {session && !session.isPaused ? 'RUNNING' : 'STOPPED'}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-[oklch(0.55_0.01_240)]">
              {activeMachine.isRecording
                ? '➡️ Simulated readings ARE stored in historical training dataset.'
                : '➡️ Live monitoring preview only. No data stored.'}
            </span>
          </div>
        )}

        {/* Live Simulation Output Stream Visualizer (6 Individual Sparklines) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Simulation Telemetry Real-Time Feedback
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'temp', label: 'Temperature', key: 'temperature', unit: '°C', colorHex: '#F59E0B', icon: Thermometer },
              { id: 'vib', label: 'Vibration', key: 'vibration', unit: 'm/s²', colorHex: '#F59E0B', icon: Activity },
              { id: 'cur', label: 'Current', key: 'current', unit: 'A', colorHex: '#EAB308', icon: Zap },
              { id: 'vol', label: 'Voltage', key: 'voltage', unit: 'V', colorHex: '#06B6D4', icon: Zap },
              { id: 'rpm', label: 'Speed', key: 'rpm', unit: 'RPM', colorHex: '#10B981', icon: Gauge },
              { id: 'sound', label: 'Sound Level', key: 'sound', unit: 'dB', colorHex: '#A855F7', icon: Volume2 },
            ].map((m) => {
              const Icon = m.icon;
              const currentVal = sensors[m.key as keyof typeof sensors] ?? 0;
              return (
                <div key={m.id} className="glass rounded-xl p-4 border border-[oklch(0.20_0.01_240)] flex flex-col justify-between h-44">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: m.colorHex }} />
                      <span className="text-xs font-bold text-white uppercase font-mono">{m.label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {currentVal.toFixed(m.key === 'rpm' ? 0 : m.key === 'vibration' ? 2 : 1)} {m.unit}
                    </span>
                  </div>

                  <div className="h-24 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`simGrad-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={m.colorHex} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={m.colorHex} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0D0E15', borderColor: '#1E2235', borderRadius: '6px', fontSize: '10px', color: '#fff' }}
                        />
                        <Area
                          type="monotone"
                          dataKey={m.key}
                          name={`${m.label} (${m.unit})`}
                          stroke={m.colorHex}
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill={`url(#simGrad-${m.id})`}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Simulation Profiles Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-[oklch(0.62_0.20_240)]" />
          Predefined Fault Simulation Scenarios
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {profilesConfig.map((p) => {
            const Icon = p.icon;
            const isSelected = activeProfile === p.id && session && !session.isPaused;
            return (
              <div
                key={p.id}
                onClick={() => handleStart(p.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] ${isSelected
                  ? `${p.color} ring-2 ring-[oklch(0.52_0.24_240)] shadow-lg`
                  : 'bg-[oklch(0.12_0.007_240)] border-[oklch(0.18_0.008_240)] hover:border-[oklch(0.30_0.015_240)] text-slate-300'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={16} />
                  <span className="text-xs font-bold text-white">{p.title}</span>
                </div>
                <p className="text-[10px] text-[oklch(0.50_0.01_240)] leading-tight">
                  {p.description}
                </p>
                {isSelected && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Sensor Slider Controls (6 Industrial Sensors) */}
      <div className="glass rounded-2xl p-5 border border-[oklch(0.20_0.01_240)] space-y-4">
        <div className="flex items-center justify-between border-b border-[oklch(0.18_0.008_240)] pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[oklch(0.62_0.20_240)]" />
            <h3 className="text-sm font-bold text-white">Manual Sensor Controls & Sliders</h3>
          </div>
          <span className="text-[11px] text-[oklch(0.50_0.01_240)]">
            Adjust sliders or type values to generate instant virtual telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Temperature */}
          <SensorSliderControl
            label="Temperature (°C)"
            icon={Thermometer}
            value={sensors.temperature}
            min={0}
            max={250}
            step={0.5}
            unit="°C"
            color="text-rose-400"
            onChange={(val) => handleSensorChange('temperature', val)}
          />

          {/* Vibration */}
          <SensorSliderControl
            label="Vibration (m/s²)"
            icon={Activity}
            value={sensors.vibration}
            min={0}
            max={50}
            step={0.1}
            unit="m/s²"
            color="text-amber-400"
            onChange={(val) => handleSensorChange('vibration', val)}
          />

          {/* Current */}
          <SensorSliderControl
            label="Current (A)"
            icon={Zap}
            value={sensors.current}
            min={0}
            max={100}
            step={0.5}
            unit="A"
            color="text-yellow-400"
            onChange={(val) => handleSensorChange('current', val)}
          />

          {/* Voltage */}
          <SensorSliderControl
            label="Voltage (V)"
            icon={Zap}
            value={sensors.voltage}
            min={0}
            max={500}
            step={1}
            unit="V"
            color="text-cyan-400"
            onChange={(val) => handleSensorChange('voltage', val)}
          />

          {/* RPM */}
          <SensorSliderControl
            label="Speed (RPM)"
            icon={Gauge}
            value={sensors.rpm}
            min={0}
            max={6000}
            step={10}
            unit="RPM"
            color="text-emerald-400"
            onChange={(val) => handleSensorChange('rpm', val)}
          />

          {/* Sound */}
          <SensorSliderControl
            label="Sound Level (dB)"
            icon={Volume2}
            value={sensors.sound}
            min={0}
            max={200}
            step={0.5}
            unit="dB"
            color="text-purple-400"
            onChange={(val) => handleSensorChange('sound', val)}
          />
        </div>
      </div>
    </div>
  );
};

// Reusable Sensor Slider & Numeric Input Sub-component
interface SliderProps {
  label: string;
  icon: any;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (val: number) => void;
}

const SensorSliderControl: React.FC<SliderProps> = ({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  unit,
  color,
  onChange,
}) => {
  const [val, setVal] = useState(value);
  const isInteractingRef = React.useRef(false);
  const lockTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const lockUserInteraction = () => {
    isInteractingRef.current = true;
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 2500);
  };

  useEffect(() => {
    if (!isInteractingRef.current) {
      setVal(value);
    }
  }, [value]);

  const handleChange = (newVal: number) => {
    lockUserInteraction();
    const clamped = Math.max(min, Math.min(max, newVal));
    setVal(clamped);
    onChange(clamped);
  };

  const handleStep = (delta: number) => {
    lockUserInteraction();
    setVal((prevVal) => {
      const nextVal = Number((prevVal + delta).toFixed(2));
      const clamped = Math.max(min, Math.min(max, nextVal));
      onChange(clamped);
      return clamped;
    });
  };

  return (
    <div className="bg-[oklch(0.12_0.007_240)] p-5 rounded-xl border border-[oklch(0.20_0.01_240)] space-y-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon size={20} className={color} />
          <span className="text-sm font-bold text-white tracking-wide">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleStep(-step)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-sm font-bold transition-all border border-slate-700 active:scale-95"
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            value={val}
            step={step}
            min={min}
            max={max}
            onFocus={lockUserInteraction}
            onChange={(e) => handleChange(parseFloat(e.target.value) || min)}
            className="w-20 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center text-sm rounded-lg py-1 focus:outline-none focus:border-cyan-400 shadow-inner"
          />
          <button
            type="button"
            onClick={() => handleStep(step)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-sm font-bold transition-all border border-slate-700 active:scale-95"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Larger Range Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onMouseDown={lockUserInteraction}
        onTouchStart={lockUserInteraction}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="w-full h-3.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F2FE] hover:accent-[#00E676] transition-all"
      />

      <div className="flex justify-between text-xs text-slate-400 font-mono font-medium">
        <span>
          {min} {unit}
        </span>
        <span className="text-cyan-400 font-bold text-sm">
          {val} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
};
