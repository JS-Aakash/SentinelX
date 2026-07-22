'use client';

import React from 'react';
import { SimulationControlPanel } from '@/components/simulation/SimulationControlPanel';
import { Activity } from 'lucide-react';

export default function SimulationClient() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-[oklch(0.55_0.01_240)] mb-1">
            <span>SentinelX</span>
            <span>/</span>
            <span className="text-[oklch(0.62_0.20_240)] font-medium">Sensor Simulation</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-[oklch(0.62_0.20_240)]" size={24} />
            Industrial Sensor Simulator
          </h1>
          <p className="text-xs text-[oklch(0.55_0.01_240)] mt-1">
            Generate virtual telemetry, test AI model inference, simulate fault profiles, and record training datasets without physical ESP32 hardware.
          </p>
        </div>
      </div>

      <SimulationControlPanel />
    </div>
  );
}
