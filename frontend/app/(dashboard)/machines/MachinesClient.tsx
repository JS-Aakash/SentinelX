'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useMachines } from '@/hooks/useMachines';
import { MachineCard } from '@/components/machines/MachineCard';
import { MachineStatus, MachinesQueryParams } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: MachineStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'idle', label: 'Idle', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { value: 'offline', label: 'Offline', color: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
  { value: 'fault', label: 'Fault', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Recently Added' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'installationDate', label: 'Installation Date' },
];

export default function MachinesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canWrite = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'maintenance_engineer';
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';

  // Parse URL params for initial state
  const initialParams: MachinesQueryParams = {
    status: searchParams.get('status') as MachineStatus || undefined,
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { machines, total, page, totalPages, isLoading, error, params, updateParams, refresh, filterOptions } = useMachines(initialParams);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value || undefined });
    }, 400);
  }, [updateParams]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({ search: undefined, type: undefined, status: undefined, plant: undefined, department: undefined, sortBy: 'createdAt', sortOrder: 'desc', page: 1 });
  }, [updateParams]);

  const hasActiveFilters = params.search || params.type || params.status || params.plant || params.department;

  const activeFilterCount = [params.search, params.type, params.status, params.plant, params.department].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Machines</h1>
          <p className="text-sm text-[oklch(0.50_0.01_240)] mt-1">
            {isLoading ? 'Loading...' : `${total} machine${total !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/machines/new"
            id="add-machine-btn"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white text-sm font-semibold px-4 py-2.5 transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] shrink-0"
          >
            <Plus size={16} />
            Add Machine
          </Link>
        )}
      </div>

      {/* ─── Search + Filter Bar ──────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.01_240)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, code, type, manufacturer..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[oklch(0.13_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-sm text-white placeholder:text-[oklch(0.38_0.008_240)] focus:outline-none focus:border-[oklch(0.45_0.02_240)] transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.01_240)] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={params.sortBy ?? 'createdAt'}
          onChange={(e) => updateParams({ sortBy: e.target.value as MachinesQueryParams['sortBy'] })}
          className="bg-[oklch(0.13_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[oklch(0.45_0.02_240)] transition-colors"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
            showFilters
              ? 'bg-[oklch(0.52_0.24_240/0.15)] border-[oklch(0.52_0.24_240/0.4)] text-white'
              : 'bg-[oklch(0.13_0.007_240)] border-[oklch(0.20_0.01_240)] text-[oklch(0.60_0.01_240)] hover:text-white'
          )}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[oklch(0.62_0.20_240)] text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.20_0.01_240)] bg-[oklch(0.13_0.007_240)] px-3 py-2.5 text-sm text-[oklch(0.55_0.01_240)] hover:text-white transition-colors"
          >
            <RotateCcw size={13} />
            Clear
          </button>
        )}
      </div>

      {/* ─── Filter Panel ─────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {/* Status filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[oklch(0.45_0.01_240)] font-semibold mb-2 block">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateParams({ status: params.status === s.value ? undefined : s.value })}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-all',
                    params.status === s.value ? s.color : 'border-[oklch(0.22_0.01_240)] text-[oklch(0.55_0.01_240)] hover:text-white'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[oklch(0.45_0.01_240)] font-semibold mb-2 block">Machine Type</label>
            <select
              value={params.type ?? ''}
              onChange={(e) => updateParams({ type: e.target.value || undefined })}
              className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-sm text-white px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Types</option>
              {filterOptions?.types.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Plant filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[oklch(0.45_0.01_240)] font-semibold mb-2 block">Plant</label>
            <select
              value={params.plant ?? ''}
              onChange={(e) => updateParams({ plant: e.target.value || undefined })}
              className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-sm text-white px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Plants</option>
              {filterOptions?.plants.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Department filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[oklch(0.45_0.01_240)] font-semibold mb-2 block">Department</label>
            <select
              value={params.department ?? ''}
              onChange={(e) => updateParams({ department: e.target.value || undefined })}
              className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.20_0.01_240)] rounded-lg text-sm text-white px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Departments</option>
              {filterOptions?.departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ─── Machine Grid ─────────────────────────────────────────────────── */}
      {error ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={refresh} className="mt-3 text-xs text-[oklch(0.62_0.20_240)] hover:underline">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <div className="glass rounded-xl p-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] flex items-center justify-center">
            <Cpu size={32} className="text-[oklch(0.35_0.01_240)]" />
          </div>
          <div>
            <p className="text-white font-semibold">
              {hasActiveFilters ? 'No machines match your filters' : 'No machines yet'}
            </p>
            <p className="text-sm text-[oklch(0.45_0.01_240)] mt-1">
              {hasActiveFilters ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first machine to the platform.'}
            </p>
          </div>
          {!hasActiveFilters && canWrite && (
            <Link
              href="/machines/new"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] text-white text-sm font-semibold px-5 py-2.5 transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)]"
            >
              <Plus size={15} /> Add First Machine
            </Link>
          )}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-[oklch(0.62_0.20_240)] hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {machines.map((machine) => (
              <MachineCard key={machine._id} machine={machine} />
            ))}
          </div>

          {/* ─── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[oklch(0.45_0.01_240)]">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateParams({ page: page - 1 })}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-[oklch(0.22_0.01_240)] bg-[oklch(0.13_0.007_240)] px-3 py-2 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[oklch(0.35_0.015_240)] transition-colors"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => updateParams({ page: pageNum })}
                      className={cn(
                        'w-8 h-8 rounded-lg border text-xs transition-colors',
                        page === pageNum
                          ? 'bg-[oklch(0.52_0.24_240/0.2)] border-[oklch(0.52_0.24_240/0.4)] text-white'
                          : 'border-[oklch(0.20_0.01_240)] bg-[oklch(0.13_0.007_240)] text-[oklch(0.55_0.01_240)] hover:text-white'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => updateParams({ page: page + 1 })}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-[oklch(0.22_0.01_240)] bg-[oklch(0.13_0.007_240)] px-3 py-2 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[oklch(0.35_0.015_240)] transition-colors"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
