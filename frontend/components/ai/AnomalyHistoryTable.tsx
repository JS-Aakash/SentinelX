'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Search, Download, Filter, RefreshCw, CheckCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { AnomalyEventRecord, anomalyApi } from '@/api/anomaly';
import { cn, formatDate } from '@/lib/utils';

interface AnomalyHistoryTableProps {
  machineId: string;
}

export function AnomalyHistoryTable({ machineId }: AnomalyHistoryTableProps) {
  const [events, setEvents] = useState<AnomalyEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await anomalyApi.getHistory(machineId, {
        severity: severityFilter,
        status: statusFilter,
        search: searchTerm,
      });
      if (res.data.success) {
        setEvents(res.data.data.events);
      }
    } catch (err: any) {
      console.error('Failed to load anomaly history:', err);
    } finally {
      setLoading(false);
    }
  }, [machineId, severityFilter, statusFilter, searchTerm]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to permanently delete all anomaly audit log & historical events for this machine?')) return;
    try {
      setLoading(true);
      await anomalyApi.clearHistory(machineId);
      await loadHistory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clear anomaly history log');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) return;
    const headers = ['Timestamp', 'Severity', 'Anomaly Score', 'Status', 'Primary Cause', 'Duration (Sec)', 'Recommended Action'];
    const rows = events.map((e) => [
      e.timestamp,
      e.severity,
      e.anomalyScore,
      e.status,
      `"${e.primaryCause}"`,
      e.durationSeconds || 0,
      `"${e.recommendedAction}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `anomaly_history_${machineId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'Emergency':
        return 'bg-[#E040FB]/15 text-[#E040FB] border-[#E040FB]/30';
      case 'Critical':
        return 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30';
      case 'Warning':
        return 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30';
      case 'Watch':
        return 'bg-[#00F2FE]/15 text-[#00F2FE] border-[#00F2FE]/30';
      default:
        return 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30';
    }
  };

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden font-mono shadow-xl space-y-0">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#1B1E2B] bg-[#0D0E15] gap-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-[#00F2FE]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">ANOMALY AUDIT LOG & HISTORICAL EVENTS</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-lg bg-[#12141F] border border-[#1E202E] px-2.5 text-xs text-white focus:outline-none"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="Emergency">EMERGENCY</option>
            <option value="Critical">CRITICAL</option>
            <option value="Warning">WARNING</option>
            <option value="Watch">WATCH</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg bg-[#12141F] border border-[#1E202E] px-2.5 text-xs text-white focus:outline-none"
          >
            <option value="all">ALL STATUSES</option>
            <option value="Active">ACTIVE</option>
            <option value="Acknowledged">ACKNOWLEDGED</option>
            <option value="Resolved">RESOLVED</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-[#475569]" />
            <input
              type="text"
              placeholder="Search causes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-lg bg-[#12141F] border border-[#1E202E] pl-8 pr-3 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <button
            onClick={loadHistory}
            disabled={loading}
            className="p-2 rounded-lg bg-[#141724] border border-[#262A3E] text-[#64748B] hover:text-white transition-all"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#141724] border border-[#262A3E] text-xs font-semibold text-[#00F2FE] hover:bg-[#1E2336] px-3 py-1.5 transition-all disabled:opacity-40"
          >
            <Download size={13} /> EXPORT
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={loading || events.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 px-3 py-1.5 transition-all disabled:opacity-40 cursor-pointer"
            title="Delete all anomaly audit log & historical events for this machine"
          >
            <Trash2 size={13} /> CLEAR LOG
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase font-bold">TIMESTAMP</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase font-bold">SEVERITY</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase font-bold">ANOMALY SCORE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase font-bold">PRIMARY CAUSE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase font-bold">STATUS</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase font-bold">DURATION</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#475569]">
                  {loading ? 'LOADING ANOMALY HISTORY...' : 'NO ANOMALY EVENTS LOGGED FOR THIS MACHINE.'}
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e._id} className="border-b border-[#141724] hover:bg-[#121522] transition-colors">
                  <td className="px-4 py-3 text-white font-mono">{formatDate(e.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase border', getSeverityBadge(e.severity))}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#00F2FE] tabular-nums">
                    {e.anomalyScore.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono max-w-xs truncate">
                    {e.primaryCause}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[9px] font-bold uppercase border',
                        e.status === 'Resolved'
                          ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30'
                          : e.status === 'Acknowledged'
                          ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30'
                          : 'bg-[#FF1744]/10 text-[#FF1744] border-[#FF1744]/30'
                      )}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#94A3B8] font-mono">
                    {e.durationSeconds ? `${Math.round(e.durationSeconds / 60)} min` : '0 min'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
