'use client';

import { Sparkles, AlertTriangle, Info, ShieldAlert, CheckCircle2, Wrench } from 'lucide-react';
import { Recommendation } from '@/api/ai';
import { cn } from '@/lib/utils';

interface AIRecommendationsListProps {
  recommendations?: Recommendation[];
}

const SEVERITY_BADGES = {
  critical: { bg: 'bg-[#FF1744]/15', text: 'text-[#FF1744]', border: 'border-[#FF1744]/30', label: 'CRITICAL' },
  warning: { bg: 'bg-[#FFB300]/15', text: 'text-[#FFB300]', border: 'border-[#FFB300]/30', label: 'WARNING' },
  info: { bg: 'bg-[#3B82F6]/15', text: 'text-[#3B82F6]', border: 'border-[#3B82F6]/30', label: 'INFO' },
};

export function AIRecommendationsList({ recommendations = [] }: AIRecommendationsListProps) {
  return (
    <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 font-mono space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#181B28]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#9D4EDD]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            AI EXPLANATORY MAINTENANCE RECOMMENDATIONS
          </h3>
        </div>
        <span className="text-[10px] text-[#9D4EDD]">{recommendations.length} ACTIVE ADVISORIES</span>
      </div>

      {recommendations.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#475569] space-y-1">
          <CheckCircle2 size={24} className="mx-auto text-[#00E676] mb-2" />
          <p className="font-bold text-white">ALL SYSTEMS OPERATING OPTIMALLY</p>
          <p className="text-[10px]">No maintenance advisories or threshold warnings generated.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const badge = SEVERITY_BADGES[rec.severity] || SEVERITY_BADGES['info'];
            return (
              <div
                key={idx}
                className="rounded-xl border border-[#1E2235] bg-[#12141F] p-4 space-y-2 relative group hover:border-[#2E354F] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase border', badge.bg, badge.text, badge.border)}>
                      {badge.label}
                    </span>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">{rec.title}</h4>
                  </div>
                  <span className="text-[9px] text-[#64748B] font-mono">{rec.code}</span>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed">{rec.description}</p>

                <div className="pt-2 border-t border-[#1A1D2B] flex items-center gap-2 text-[10px] text-[#00F2FE]">
                  <Wrench size={12} className="shrink-0 text-[#00F2FE]" />
                  <span><strong className="text-white">Suggested Action:</strong> {rec.action}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
