'use client';

import { useState } from 'react';
import { Layers, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PredictionRecord } from '@/api/ai';
import { cn, formatDate } from '@/lib/utils';

interface PredictionHistoryTableProps {
  history?: PredictionRecord[];
  total?: number;
}

export function PredictionHistoryTable({ history = [], total = 0 }: PredictionHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((rec) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      rec.rsotFormatted.toLowerCase().includes(term) ||
      rec.healthStatus.toLowerCase().includes(term) ||
      String(rec.modelVersion).includes(term)
    );
  });

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Timestamp', 'RSOT', 'Health Score', 'Health Status', 'Is Anomaly', 'Anomaly Score', 'Model Version'];
    const rows = history.map((r) => [
      r.timestamp,
      `"${r.rsotFormatted}"`,
      r.healthScore,
      r.healthStatus,
      r.isAnomaly,
      r.anomalyScore,
      `v${r.modelVersion}`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prediction_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden font-mono shadow-xl">
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#1B1E2B] bg-[#0D0E15] gap-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#00F2FE]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">PREDICTION LOGS & AUDIT TRAIL</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-[#475569]" />
            <input
              type="text"
              placeholder="Filter history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-lg bg-[#12141F] border border-[#1E202E] pl-8 pr-3 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#141724] border border-[#262A3E] text-xs font-semibold text-[#00F2FE] hover:bg-[#1E2336] px-3 py-1.5 transition-all disabled:opacity-40"
          >
            <Download size={13} /> EXPORT CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">TIMESTAMP</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">RSOT</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">HEALTH SCORE</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">ANOMALY STATUS</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">MODEL VERSION</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider font-bold">ADVISORIES</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#475569]">
                  NO PREDICTION RECORDS LOGGED YET. EXECUTE LIVE INFERENCE TO LOG RESULTS.
                </td>
              </tr>
            ) : (
              filteredHistory.map((rec, index) => (
                <tr key={rec._id || (rec as any).id || `pred-${rec.timestamp}-${index}`} className="border-b border-[#141724] hover:bg-[#121522] transition-colors">
                  <td className="px-4 py-3 text-white font-mono">{formatDate(rec.timestamp)}</td>
                  <td className="px-4 py-3 font-bold text-[#00F2FE] font-mono">{rec.rsotFormatted}</td>
                  <td className="px-4 py-3 font-mono">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold',
                        rec.healthScore >= 90
                          ? 'text-[#00E676] bg-[#00E676]/10'
                          : rec.healthScore >= 75
                          ? 'text-[#00F2FE] bg-[#00F2FE]/10'
                          : rec.healthScore >= 50
                          ? 'text-[#FFB300] bg-[#FFB300]/10'
                          : 'text-[#FF1744] bg-[#FF1744]/10'
                      )}
                    >
                      {rec.healthScore}% ({rec.healthStatus})
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[9px] font-bold uppercase border',
                        rec.isAnomaly
                          ? 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30'
                          : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                      )}
                    >
                      {rec.isAnomaly ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] font-mono">v{rec.modelVersion}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{rec.recommendations?.length || 0} items</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
