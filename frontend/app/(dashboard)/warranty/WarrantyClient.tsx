'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, PlusCircle, FileText,
  Calendar, Building, CheckCircle2, XCircle, Clock, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Hash, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    active: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', Icon: ShieldCheck },
    expiring_soon: { label: 'Expiring Soon', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', Icon: ShieldAlert },
    expired: { label: 'Expired', cls: 'bg-red-500/10 text-red-400 border border-red-500/20', Icon: ShieldX },
    created: { label: 'Created', cls: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', Icon: FileText },
    submitted: { label: 'Submitted', cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', Icon: FileText },
    under_review: { label: 'Under Review', cls: 'bg-violet-500/10 text-violet-400 border border-violet-500/20', Icon: Clock },
    approved: { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', Icon: CheckCircle2 },
    rejected: { label: 'Rejected', cls: 'bg-red-500/10 text-red-400 border border-red-500/20', Icon: XCircle },
    closed: { label: 'Closed', cls: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', Icon: FileText },
  };
  const cfg = map[status] || { label: status, cls: 'bg-slate-500/10 text-slate-400', Icon: Shield };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function DaysRemaining({ days, status }: { days: number; status: string }) {
  if (status === 'expired') return <span className="text-red-400 text-xs font-medium">Expired</span>;
  const color = days <= 30 ? 'text-amber-400' : 'text-emerald-400';
  return <span className={`${color} text-sm font-semibold`}>{days} days</span>;
}

const BLANK_WARRANTY = {
  machineId: '', type: 'manufacturer', warrantyNumber: '', provider: '',
  startDate: '', expiryDate: '', coverage: '', contactEmail: '', contactPhone: '',
};

const BLANK_CLAIM = {
  machineId: '', warrantyId: '', supplier: '', problem: '', failureDate: '', claimNotes: '',
};

export default function WarrantyClient() {
  const { accessToken: token } = useAuthStore();
  const [tab, setTab] = useState<'warranties' | 'claims'>('warranties');
  const [warranties, setWarranties] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWarranty, setShowCreateWarranty] = useState(false);
  const [showCreateClaim, setShowCreateClaim] = useState(false);
  const [form, setForm] = useState(BLANK_WARRANTY);
  const [claimForm, setClaimForm] = useState(BLANK_CLAIM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wRes, cRes, sRes, mRes] = await Promise.all([
        fetch(`${API}/warranties`, { headers }),
        fetch(`${API}/warranties/claims`, { headers }),
        fetch(`${API}/warranties/summary`, { headers }),
        fetch(`${API}/machines`, { headers }),
      ]);
      const [wj, cj, sj, mj] = await Promise.all([wRes.json(), cRes.json(), sRes.json(), mRes.json()]);
      if (wj.success) setWarranties(wj.data);
      if (cj.success) setClaims(cj.data);
      if (sj.success) setSummary(sj.data);
      if (mj.success) setMachines(mj.data?.machines || mj.data || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createWarranty = async () => {
    if (!form.machineId || !form.warrantyNumber || !form.provider || !form.expiryDate) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/warranties`, { method: 'POST', headers, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) {
        setShowCreateWarranty(false);
        setForm(BLANK_WARRANTY);
        fetchAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const createClaim = async () => {
    if (!claimForm.machineId || !claimForm.warrantyId || !claimForm.problem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/warranties/claims`, { method: 'POST', headers, body: JSON.stringify(claimForm) });
      const json = await res.json();
      if (json.success) {
        setShowCreateClaim(false);
        setClaimForm(BLANK_CLAIM);
        fetchAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const updateClaimStatus = async (claimId: string, status: string) => {
    await fetch(`${API}/warranties/claims/${claimId}/status`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            Warranty & Claims
          </h1>
          <p className="text-[#64748B] text-sm mt-1">Manage machine warranties and submit claims</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateClaim(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B1D2A] border border-[#2A2D3E] text-[#94A3B8] hover:text-white rounded-lg text-sm transition-all"
          >
            <FileText className="w-4 h-4" /> New Claim
          </button>
          <button
            onClick={() => setShowCreateWarranty(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" /> Add Warranty
          </button>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Warranties', value: summary.total || 0, Icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Active', value: summary.active || 0, Icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Expiring Soon', value: summary.expiringSoon || 0, Icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Expired', value: summary.expired || 0, Icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(card => (
            <div key={card.label} className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-[#64748B] text-xs mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-1 w-fit">
        {(['warranties', 'claims'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {t === 'warranties' ? `Warranties (${warranties.length})` : `Claims (${claims.length})`}
          </button>
        ))}
      </div>

      {/* ─── Warranties List ──────────────────────────────────────────────── */}
      {tab === 'warranties' && (
        <div className="space-y-3">
          {warranties.length === 0 ? (
            <div className="text-center py-16 text-[#64748B] bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No warranties registered yet. Add one to get started.</p>
            </div>
          ) : (
            warranties.map((w: any) => (
              <div key={w._id} className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#0A0B10] transition-colors"
                  onClick={() => setExpandedId(expandedId === w._id ? null : w._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {(w.machineId as any)?.name || 'Machine'} — {w.type.toUpperCase()}
                      </div>
                      <div className="text-[#64748B] text-xs mt-0.5">
                        #{w.warrantyNumber} · {w.provider}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <DaysRemaining days={w.daysRemaining || 0} status={w.status} />
                      <div className="text-[#64748B] text-xs">remaining</div>
                    </div>
                    <StatusBadge status={w.status} />
                    {expandedId === w._id ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
                  </div>
                </div>
                {expandedId === w._id && (
                  <div className="border-t border-[#1B1D2A] p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#080A12]">
                    <div>
                      <div className="text-[#64748B] text-xs mb-1">Coverage</div>
                      <div className="text-[#94A3B8] text-sm">{w.coverage}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs mb-1">Start Date</div>
                      <div className="text-[#94A3B8] text-sm">{new Date(w.startDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs mb-1">Expiry Date</div>
                      <div className="text-[#94A3B8] text-sm">{new Date(w.expiryDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs mb-1">Blockchain</div>
                      {w.blockchainTxHash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${w.blockchainTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                        >
                          <Hash className="w-3 h-3" /> {w.blockchainTxHash.slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[#64748B] text-xs">Not anchored</span>
                      )}
                    </div>
                    {w.status !== 'expired' && (
                      <div className="col-span-full">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          ✓ Eligible for Warranty Claim
                        </span>
                      </div>
                    )}
                    {w.status === 'expired' && (
                      <div className="col-span-full">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                          <ShieldX className="w-3.5 h-3.5" />
                          Warranty Expired — Not Eligible for Claim
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Claims List ──────────────────────────────────────────────────── */}
      {tab === 'claims' && (
        <div className="space-y-3">
          {claims.length === 0 ? (
            <div className="text-center py-16 text-[#64748B] bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No warranty claims submitted yet.</p>
            </div>
          ) : (
            claims.map((c: any) => (
              <div key={c._id} className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">{c.claimNumber}</div>
                      <div className="text-[#94A3B8] text-sm mt-0.5">{c.problem}</div>
                      <div className="text-[#64748B] text-xs mt-1">
                        {(c.machineId as any)?.name} · {c.supplier} · {new Date(c.failureDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.status} />
                    {['created', 'submitted', 'under_review'].includes(c.status) && (
                      <div className="flex gap-1">
                        {c.status === 'created' && (
                          <button
                            onClick={() => updateClaimStatus(c._id, 'submitted')}
                            className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                          >
                            Submit
                          </button>
                        )}
                        {c.status === 'submitted' && (
                          <button
                            onClick={() => updateClaimStatus(c._id, 'under_review')}
                            className="px-2 py-1 text-xs bg-violet-500/10 text-violet-400 rounded-lg hover:bg-violet-500/20 transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {c.status === 'under_review' && (
                          <>
                            <button
                              onClick={() => updateClaimStatus(c._id, 'approved')}
                              className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateClaimStatus(c._id, 'rejected')}
                              className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {c.blockchainTxHash && (
                  <div className="mt-3 pt-3 border-t border-[#1B1D2A]">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${c.blockchainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" /> {c.blockchainTxHash.slice(0, 20)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Create Warranty Modal ────────────────────────────────────────── */}
      {showCreateWarranty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-5">Add New Warranty</h2>
            <div className="space-y-4">
              {[
                { label: 'Machine', field: 'machineId', type: 'select', options: machines.map((m: any) => ({ value: m._id, label: `${m.machineCode} — ${m.name}` })) },
                { label: 'Warranty Type', field: 'type', type: 'select', options: [{ value: 'manufacturer', label: 'Manufacturer' }, { value: 'supplier', label: 'Supplier' }, { value: 'extended', label: 'Extended' }, { value: 'amc', label: 'AMC' }] },
                { label: 'Warranty Number', field: 'warrantyNumber', type: 'text' },
                { label: 'Provider / Vendor', field: 'provider', type: 'text' },
                { label: 'Coverage Description', field: 'coverage', type: 'text' },
                { label: 'Start Date', field: 'startDate', type: 'date' },
                { label: 'Expiry Date', field: 'expiryDate', type: 'date' },
                { label: 'Contact Email', field: 'contactEmail', type: 'email' },
                { label: 'Contact Phone', field: 'contactPhone', type: 'tel' },
              ].map(f => (
                <div key={f.field}>
                  <label className="text-[#94A3B8] text-xs mb-1.5 block">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={(form as any)[f.field]}
                      onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={(form as any)[f.field]}
                      onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateWarranty(false)} className="flex-1 py-2 bg-[#1B1D2A] text-[#94A3B8] rounded-lg text-sm hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={createWarranty} disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Creating...' : 'Create Warranty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Claim Modal ───────────────────────────────────────────── */}
      {showCreateClaim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-5">Submit Warranty Claim</h2>
            <div className="space-y-4">
              {[
                { label: 'Machine', field: 'machineId', type: 'select', options: machines.map((m: any) => ({ value: m._id, label: `${m.machineCode} — ${m.name}` })) },
                { label: 'Warranty', field: 'warrantyId', type: 'select', options: warranties.filter((w: any) => w.status !== 'expired').map((w: any) => ({ value: w._id, label: `${w.type.toUpperCase()} — ${w.warrantyNumber} (${w.provider})` })) },
                { label: 'Supplier', field: 'supplier', type: 'text' },
                { label: 'Failure Date', field: 'failureDate', type: 'date' },
                { label: 'Problem Description', field: 'problem', type: 'text' },
                { label: 'Claim Notes', field: 'claimNotes', type: 'text' },
              ].map(f => (
                <div key={f.field}>
                  <label className="text-[#94A3B8] text-xs mb-1.5 block">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={(claimForm as any)[f.field]}
                      onChange={e => setClaimForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={(claimForm as any)[f.field]}
                      onChange={e => setClaimForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateClaim(false)} className="flex-1 py-2 bg-[#1B1D2A] text-[#94A3B8] rounded-lg text-sm hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={createClaim} disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
