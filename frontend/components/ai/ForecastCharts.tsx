'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Activity, Sliders, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastChartsProps {
  forecastTrajectory?: Array<{ step: number; predictions: Record<string, number> }>;
  operatingLimits?: Record<string, number>;
  breachStep?: number | null;
  violatingSensor?: string | null;
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; color: string; limitKey: string; defaultLimit: number }> = {
  Temperature: { label: 'Temperature', unit: '°C', color: '#FFB300', limitKey: 'maxTemperature', defaultLimit: 80 },
  Vibration: { label: 'Vibration', unit: 'g', color: '#00F2FE', limitKey: 'maxVibration', defaultLimit: 2.5 },
  Current: { label: 'Current', unit: 'A', color: '#3B82F6', limitKey: 'maxCurrent', defaultLimit: 15 },
  Voltage: { label: 'Voltage', unit: 'V', color: '#9D4EDD', limitKey: 'ratedVoltage', defaultLimit: 250 },
  RPM: { label: 'RPM', unit: 'RPM', color: '#00E676', limitKey: 'minRPM', defaultLimit: 1000 },
  Sound: { label: 'Sound', unit: 'dB', color: '#FF1744', limitKey: 'maxSound', defaultLimit: 85 },
};

export function ForecastCharts({
  forecastTrajectory = [],
  operatingLimits = {},
  breachStep,
  violatingSensor,
}: ForecastChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('Temperature');

  const metric = METRIC_CONFIG[selectedMetric] || METRIC_CONFIG['Temperature'];
  const limitValue = operatingLimits[metric.limitKey] || metric.defaultLimit;

  // Prepare chart data format
  const chartData = forecastTrajectory.map((item) => ({
    step: `Step ${item.step}`,
    stepNum: item.step,
    value: item.predictions ? item.predictions[selectedMetric] : 0,
    limit: limitValue,
  }));

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[#00F2FE]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            100-STEP RECURSIVE FORECAST TRAJECTORY & OPERATING LIMIT BREACH
          </h3>
        </div>

        {/* Sensor Selector Tabs */}
        <div className="inline-flex items-center gap-1 bg-[#12141F] border border-[#1E202E] p-1 rounded-lg">
          {Object.keys(METRIC_CONFIG).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={cn(
                'px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all',
                selectedMetric === key
                  ? 'bg-[#3B82F6] text-white shadow-md'
                  : 'text-[#64748B] hover:text-white'
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Sub-header & Operating Limit Indicator */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#94A3B8] px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
          <span className="font-bold text-white">{metric.label} Forecast Curve</span>
          <span className="text-[10px] text-[#64748B]">(100 Recursive XGBoost Steps)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#FF1744]">
            <span className="w-4 h-0.5 bg-[#FF1744] border border-dashed" />
            <span>Operating Limit Threshold ({limitValue} {metric.unit})</span>
          </span>

          {violatingSensor === selectedMetric && breachStep && (
            <span className="px-2 py-0.5 rounded bg-[#FF1744]/15 border border-[#FF1744]/30 text-[#FF1744] font-bold text-[10px] flex items-center gap-1">
              <AlertTriangle size={11} /> BREACH AT STEP {breachStep}
            </span>
          )}
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="h-64 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-[#475569]">
            <Activity size={24} className="mb-2 text-[#475569]" />
            <p>No forecast trajectory available. Execute live inference to generate 100-step recursive forecast.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#181B28" />
              <XAxis dataKey="step" stroke="#475569" fontSize={10} interval={19} />
              <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D0E15',
                  borderColor: '#222536',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                y={limitValue}
                stroke="#FF1744"
                strokeDasharray="4 4"
                label={{ value: `LIMIT (${limitValue} ${metric.unit})`, fill: '#FF1744', fontSize: 10, position: 'insideTopRight' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={`${metric.label} (${metric.unit})`}
                stroke={metric.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
