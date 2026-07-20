'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Radio,
  Wifi,
  WifiOff,
  Wrench,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  Activity,
} from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { DeviceStatus, DevicesQueryParams } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate } from '@/lib/utils';

const STATUS_OPTIONS: { value: DeviceStatus; label: string; color: string }[] = [
  { value: 'online', label: 'Online', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'offline', label: 'Offline', color: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
];

export default function DevicesClient() {
  const { user } = useAuthStore();
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canWrite = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'maintenance_engineer';

  const { devices, total, page, totalPages, isLoading, error, stats, params, updateParams, refresh } = useDevices();

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value || undefined });
    }, 400);
  }, [updateParams]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({ search: undefined, status: undefined, page: 1 });
  }, [updateParams]);

  const hasActiveFilters = params.search || params.status;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">IoT Devices</h1>
          <p className="text-sm text-[oklch(0.50_0.01_240)] mt-1">
            {isLoading ? 'Loading...' : `${total} ESP32 device${total !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/devices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white text-sm font-semibold px-4 py-2.5 transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] shrink-0"
          >
            <Plus size={16} />
            Add Device
          </Link>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.62_0.20_240)] shrink-0">
            <Radio size={18} />
          </div>
          <div>
            <p className="text-xs text-[oklch(0.50_0.01_240)]">Total Devices</p>
            <p className="text-base font-bold text-white mt-0.5">{stats?.total ?? 0}</p>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Wifi size={18} />
          </div>
          <div>
            <p className="text-xs text-[oklch(0.50_0.01_240)]">Online Devices</p>
            <p className="text-base font-bold text-white mt-0.5">{stats?.online ?? 0}</p>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-500/15 border border-slate-500/30 flex items-center justify-center text-slate-400 shrink-0">
            <WifiOff size={18} />
          </div>
          <div>
            <p className="text-xs text-[oklch(0.50_0.01_240)]">Offline Devices</p>
            <p className="text-base font-bold text-white mt-0.5">{stats?.offline ?? 0}</p>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Wrench size={18} />
          </div>
          <div>
            <p className="text-xs text-[oklch(0.50_0.01_240)]">In Maintenance</p>
            <p className="text-base font-bold text-white mt-0.5">{stats?.maintenance ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.01_240)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by device name, ID, MAC address, serial..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[oklch(0.13_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-sm text-white placeholder:text-[oklch(0.38_0.008_240)] focus:outline-none focus:border-[oklch(0.45_0.02_240)] transition-colors"
          />
          {searchInput && (
            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.01_240)] hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateParams({ status: params.status === s.value ? undefined : s.value })}
              className={cn(
                'text-xs px-3 py-2 rounded-lg border transition-all whitespace-nowrap',
                params.status === s.value ? s.color : 'border-[oklch(0.22_0.01_240)] bg-[oklch(0.13_0.007_240)] text-[oklch(0.55_0.01_240)] hover:text-white'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.20_0.01_240)] bg-[oklch(0.13_0.007_240)] px-3 py-2 text-xs text-[oklch(0.55_0.01_240)] hover:text-white transition-colors"
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}
      </div>

      {/* Devices Grid */}
      {error ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={refresh} className="mt-3 text-xs text-[oklch(0.62_0.20_240)] hover:underline">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="glass rounded-xl p-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] flex items-center justify-center">
            <Radio size={32} className="text-[oklch(0.35_0.01_240)]" />
          </div>
          <div>
            <p className="text-white font-semibold">
              {hasActiveFilters ? 'No devices match your filter' : 'No IoT devices registered'}
            </p>
            <p className="text-sm text-[oklch(0.45_0.01_240)] mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search terms or status filters.'
                : 'Register your first ESP32 microcontroller to start configuring sensors.'}
            </p>
          </div>
          {!hasActiveFilters && canWrite && (
            <Link
              href="/devices/new"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] text-white text-sm font-semibold px-5 py-2.5 transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)]"
            >
              <Plus size={15} /> Add First Device
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const assignedMachine = typeof device.machineId === 'object' ? device.machineId : null;

            return (
              <Link
                key={device._id}
                href={`/devices/${device._id}`}
                className="group glass rounded-xl p-5 flex flex-col justify-between hover:border-[oklch(0.35_0.015_240/0.6)] transition-all hover:shadow-lg hover:shadow-[oklch(0.52_0.24_240/0.08)] hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[oklch(0.52_0.24_240/0.15)] border border-[oklch(0.52_0.24_240/0.3)] flex items-center justify-center text-[oklch(0.75_0.18_200)] font-mono font-bold text-xs shrink-0">
                        ESP
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm group-hover:text-[oklch(0.75_0.18_200)] transition-colors line-clamp-1">
                          {device.name}
                        </h3>
                        <p className="text-xs font-mono text-[oklch(0.50_0.015_240)] mt-0.5">
                          {device.deviceId}
                        </p>
                      </div>
                    </div>
                    <DeviceStatusBadge status={device.status} size="sm" />
                  </div>

                  <div className="space-y-2 text-xs py-2">
                    <div className="flex items-center justify-between py-1 border-b border-[oklch(0.16_0.008_240)]">
                      <span className="text-[oklch(0.50_0.01_240)]">Firmware</span>
                      <span className="font-mono text-white text-[11px] bg-[oklch(0.13_0.007_240)] px-2 py-0.5 rounded border border-[oklch(0.20_0.01_240)]">
                        {device.firmwareVersion || 'v1.0.0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[oklch(0.16_0.008_240)]">
                      <span className="text-[oklch(0.50_0.01_240)]">Assigned Machine</span>
                      {assignedMachine ? (
                        <span className="font-medium text-[oklch(0.75_0.18_200)] flex items-center gap-1">
                          <Cpu size={12} /> {assignedMachine.name}
                        </span>
                      ) : (
                        <span className="text-[oklch(0.40_0.01_240)] italic">Unassigned</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[oklch(0.50_0.01_240)]">Sensors</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Layers size={12} className="text-emerald-400" /> 6 Configured
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[oklch(0.16_0.008_240)] flex items-center justify-between text-xs text-[oklch(0.45_0.01_240)]">
                  <span>Added {formatDate(device.createdAt)}</span>
                  <span className="flex items-center gap-1 text-[oklch(0.62_0.20_240)] font-medium group-hover:translate-x-0.5 transition-transform">
                    Manage <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[oklch(0.45_0.01_240)]">
            Page {page} of {totalPages} · {total} total devices
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateParams({ page: page - 1 })}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-[oklch(0.22_0.01_240)] bg-[oklch(0.13_0.007_240)] px-3 py-2 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => updateParams({ page: page + 1 })}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-[oklch(0.22_0.01_240)] bg-[oklch(0.13_0.007_240)] px-3 py-2 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
