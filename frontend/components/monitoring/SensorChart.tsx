'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export interface ChartPoint {
  timestamp: string;
  value: number | null;
}

interface SensorChartProps {
  data: ChartPoint[];
  metric: string;
  unit: string;
  color: string;
  height?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#2B324B] bg-[#0A0B10]/95 backdrop-blur-md px-3 py-2 shadow-2xl font-mono">
      <p className="text-[10px] text-[#64748B] mb-1">
        {new Date(label).toLocaleTimeString('en-US', { hour12: false })}
      </p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].stroke }} />
        <p className="text-sm font-bold text-white tabular-nums">
          {payload[0].value != null ? Number(payload[0].value).toFixed(2) : '--'}
          <span className="text-xs text-[#64748B] ml-1">{payload[0].unit}</span>
        </p>
      </div>
    </div>
  );
}

export function SensorChart({
  data,
  metric,
  unit,
  color,
  height = 220,
  warningThreshold,
  criticalThreshold,
}: SensorChartProps) {
  const chartId = useMemo(() => `gradient-${metric.replace(/\s+/g, '-').toLowerCase()}`, [metric]);

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      })),
    [data]
  );

  if (formatted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4 text-center font-mono"
        style={{ height }}
      >
        <p className="text-xs text-[#475569]">AWAITING SENSOR TELEMETRY STREAM...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4 relative">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-3 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{metric}</h3>
        </div>
        <span className="text-[10px] text-[#64748B] bg-[#141724] px-2 py-0.5 rounded border border-[#23283E]">
          {unit}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#181B28" vertical={false} />

          <XAxis
            dataKey="time"
            stroke="#475569"
            tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'monospace' }}
            interval="preserveStartEnd"
          />

          <YAxis
            stroke="#475569"
            tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'monospace' }}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          {warningThreshold != null && (
            <ReferenceLine
              y={warningThreshold}
              stroke="#FFB300"
              strokeDasharray="4 4"
              label={{ value: 'WARN', fill: '#FFB300', fontSize: 8, position: 'insideTopRight' }}
            />
          )}

          {criticalThreshold != null && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="#FF1744"
              strokeDasharray="4 4"
              label={{ value: 'CRIT', fill: '#FF1744', fontSize: 8, position: 'insideTopRight' }}
            />
          )}

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${chartId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#FFFFFF', strokeWidth: 2 }}
            unit={unit}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
