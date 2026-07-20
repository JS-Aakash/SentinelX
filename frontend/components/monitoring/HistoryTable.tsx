'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryRow {
  timestamp: string;
  temperature: number | null;
  current: number | null;
  voltage: number | null;
  rpm: number | null;
  vibration: number | null;
  sound: number | null;
}

interface HistoryTableProps {
  data: HistoryRow[];
  pageSize?: number;
}

type SortKey = keyof HistoryRow;

export function HistoryTable({ data, pageSize = 12 }: HistoryTableProps) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Temperature (°C)', 'Current (A)', 'Voltage (V)', 'RPM', 'Vibration (g)', 'Sound (dB)'];
    const rows = sorted.map((r) => [
      new Date(r.timestamp).toISOString(),
      r.temperature ?? '',
      r.current ?? '',
      r.voltage ?? '',
      r.rpm ?? '',
      r.vibration ?? '',
      r.sound ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinelx_telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: { key: SortKey; label: string; unit?: string }[] = [
    { key: 'timestamp', label: 'TIMESTAMP' },
    { key: 'temperature', label: 'TEMP', unit: '°C' },
    { key: 'current', label: 'CURRENT', unit: 'A' },
    { key: 'voltage', label: 'VOLTAGE', unit: 'V' },
    { key: 'rpm', label: 'RPM' },
    { key: 'vibration', label: 'VIB', unit: 'g' },
    { key: 'sound', label: 'SOUND', unit: 'dB' },
  ];

  return (
    <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden font-mono">
      {/* Table Bar Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1B1E2B] bg-[#0E1019]">
        <div className="flex items-center gap-2">
          <Table size={15} className="text-[#00F2FE]" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">HISTORICAL TELEMETRY AUDIT LOG</h3>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161926] border border-[#2B324B] text-xs font-semibold text-[#00F2FE] hover:bg-[#1E2336] hover:border-[#3B82F6] transition-all shadow-sm"
        >
          <Download size={13} /> EXPORT CSV
        </button>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.unit && <span className="text-[#475569]">({col.unit})</span>}
                    <ArrowUpDown
                      size={10}
                      className={cn(
                        'transition-colors',
                        sortKey === col.key ? 'text-[#00F2FE]' : 'text-[#2B324B]'
                      )}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#475569] font-mono text-xs">
                  NO TELEMETRY RECORDED IN SELECTED TIME WINDOW
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#141724] hover:bg-[#121522] transition-colors"
                >
                  <td className="px-4 py-2.5 text-white whitespace-nowrap font-mono text-[11px]">
                    {new Date(row.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-white tabular-nums font-mono">
                    {row.temperature != null ? row.temperature.toFixed(1) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white tabular-nums font-mono">
                    {row.current != null ? row.current.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white tabular-nums font-mono">
                    {row.voltage != null ? row.voltage.toFixed(1) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white tabular-nums font-mono">
                    {row.rpm != null ? row.rpm.toFixed(0) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white tabular-nums font-mono">
                    {row.vibration != null ? row.vibration.toFixed(3) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white tabular-nums font-mono">
                    {row.sound != null ? row.sound.toFixed(1) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#181B28] bg-[#0A0B10]">
        <span className="text-[10px] text-[#64748B] font-mono">
          TOTAL RECORDS: <strong className="text-white font-semibold">{sorted.length}</strong> · PAGE {page + 1} OF {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded bg-[#161926] border border-[#262A3E] hover:bg-[#1E2336] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} className="text-[#94A3B8]" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded bg-[#161926] border border-[#262A3E] hover:bg-[#1E2336] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} className="text-[#94A3B8]" />
          </button>
        </div>
      </div>
    </div>
  );
}
