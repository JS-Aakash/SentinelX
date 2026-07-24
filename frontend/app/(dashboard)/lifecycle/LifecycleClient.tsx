'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Cpu, Package, Wrench, Shield, FileText, ClipboardCheck,
  AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, Hash, QrCode,
  Activity, ChevronRight, Settings, RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const EVENT_CONFIG: Record<string, { Icon: any; color: string; bg: string; dot: string }> = {
  MACHINE_REGISTERED: { Icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  MACHINE_INSTALLED: { Icon: Settings, color: 'text-cyan-400', bg: 'bg-cyan-500/10', dot: 'bg-cyan-400' },
  MACHINE_COMMISSIONED: { Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  MAINTENANCE: { Icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
  COMPONENT_REPLACED: { Icon: RotateCcw, color: 'text-violet-400', bg: 'bg-violet-500/10', dot: 'bg-violet-400' },
  WARRANTY_ACTIVATED: { Icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  WARRANTY_CLAIM: { Icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10', dot: 'bg-orange-400' },
  INSPECTION_COMPLETED: { Icon: ClipboardCheck, color: 'text-teal-400', bg: 'bg-teal-500/10', dot: 'bg-teal-400' },
  ANOMALY_DETECTED: { Icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'border-[#1B1D2A]',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  critical: 'border-red-500/20',
};

function TimelineEvent({ event, isLast }: { event: any; isLast: boolean }) {
  const cfg = EVENT_CONFIG[event.type] || { Icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400' };
  const borderColor = SEVERITY_COLORS[event.severity] || 'border-[#1B1D2A]';
  const ts = new Date(event.timestamp);

  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 border border-white/5`}>
          <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#1B1D2A] mt-2" />}
      </div>

      {/* Event Card */}
      <div className={`flex-1 bg-[#0D0F1A] border ${borderColor} rounded-xl p-4 mb-4 hover:bg-[#0A0B10] transition-colors`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white font-medium text-sm">{event.title}</p>
            <p className="text-[#94A3B8] text-xs mt-0.5 leading-relaxed">{event.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[#64748B] text-xs">{ts.toLocaleDateString()}</div>
            <div className="text-[#4A5568] text-[10px]">{ts.toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Extra metadata */}
        <div className="mt-3 flex flex-wrap gap-3">
          {event.assignedTo && (
            <span className="text-[#64748B] text-xs">👷 {event.assignedTo}</span>
          )}
          {event.engineer && (
            <span className="text-[#64748B] text-xs">🔧 {event.engineer}</span>
          )}
          {event.cost && (
            <span className="text-amber-400 text-xs font-medium">₹{event.cost.toLocaleString()}</span>
          )}
          {event.status && (
            <span className="text-[#64748B] text-xs capitalize bg-[#1B1D2A] px-2 py-0.5 rounded-full">{event.status}</span>
          )}
          {event.blockchainTxHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${event.blockchainTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs flex items-center gap-1 ${event.blockchainVerified ? 'text-emerald-400' : 'text-blue-400'} hover:underline`}
            >
              <Hash className="w-3 h-3" />
              {event.blockchainTxHash.slice(0, 12)}...
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LifecycleClient() {
  const { accessToken: token } = useAuthStore();
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [machine, setMachine] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/machines`, { headers })
      .then(r => r.json())
      .then(j => {
        const list = j.data?.machines || j.data || [];
        setMachines(list);
        if (list.length > 0) setSelectedMachine(list[0]._id);
      })
      .finally(() => setLoadingMachines(false));
  }, [token]);

  const fetchTimeline = useCallback(async () => {
    if (!selectedMachine || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/timeline/${selectedMachine}`, { headers });
      const json = await res.json();
      if (json.success) {
        setTimeline(json.data.timeline || []);
        setMachine(json.data.machine);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMachine, token]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const EVENT_TYPES = [...new Set(timeline.map((e: any) => e.type))];
  const filteredTimeline = filter === 'all' ? timeline : timeline.filter((e: any) => e.type === filter);

  const machineAge = machine
    ? Math.floor((Date.now() - new Date(machine.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            Asset Lifecycle Timeline
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Complete chronological history of every machine lifecycle event
          </p>
        </div>
        <button onClick={fetchTimeline} className="flex items-center gap-2 px-3 py-2 bg-[#1B1D2A] border border-[#2A2D3E] rounded-lg text-[#94A3B8] hover:text-white text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ─── Machine Selector + QR Link ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={selectedMachine}
          onChange={e => setSelectedMachine(e.target.value)}
          className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 min-w-[280px]"
        >
          {loadingMachines ? (
            <option>Loading machines...</option>
          ) : (
            machines.map((m: any) => (
              <option key={m._id} value={m._id}>{m.machineCode} — {m.name}</option>
            ))
          )}
        </select>
        {selectedMachine && (
          <a
            href={`/machines/${selectedMachine}/passport`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <QrCode className="w-4 h-4" /> Open Digital Passport
          </a>
        )}
      </div>

      {/* ─── Machine Info Strip ──────────────────────────────────────────── */}
      {machine && (
        <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-4 flex flex-wrap gap-6">
          {[
            { label: 'Machine Code', value: machine.machineCode },
            { label: 'Type', value: machine.type },
            { label: 'Status', value: machine.status },
            { label: 'Location', value: machine.location || machine.department || '—' },
            { label: 'Age', value: `${machineAge} days` },
            { label: 'Total Events', value: timeline.length },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[#64748B] text-xs">{item.label}</div>
              <div className="text-white font-medium text-sm capitalize">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Event Type Filter ───────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-[#0D0F1A] border border-[#1B1D2A] text-[#64748B] hover:text-white'}`}
          >
            All ({timeline.length})
          </button>
          {EVENT_TYPES.map(type => {
            const count = timeline.filter((e: any) => e.type === type).length;
            const cfg = EVENT_CONFIG[type] || { Icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10' };
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === type
                    ? 'bg-indigo-600 text-white'
                    : `bg-[#0D0F1A] border border-[#1B1D2A] ${cfg.color} hover:border-indigo-500/30`
                }`}
              >
                <cfg.Icon className="w-3 h-3" />
                {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Timeline ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[#64748B] text-sm">Loading timeline...</p>
          </div>
        </div>
      ) : filteredTimeline.length === 0 ? (
        <div className="text-center py-20 text-[#64748B] bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl">
          <GitBranch className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No timeline events yet</p>
          <p className="text-sm mt-1">Events will appear here as the machine goes through its lifecycle</p>
        </div>
      ) : (
        <div className="pl-2">
          {filteredTimeline.map((event, index) => (
            <TimelineEvent
              key={`${event.type}-${event.timestamp}-${index}`}
              event={event}
              isLast={index === filteredTimeline.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
