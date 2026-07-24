'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package, PlusCircle, AlertTriangle, CheckCircle2, XCircle,
  Building2, Phone, Mail, Globe, RefreshCw, Pencil, Trash2,
  TrendingDown, DollarSign, Hash,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const COMPONENT_TYPES = [
  'Bearing', 'Motor', 'Pump', 'Gearbox', 'Belt', 'Fan', 'Coupling',
  'Sensor', 'PCB', 'Power Supply', 'Filter', 'Valve', 'Shaft', 'Seal', 'Custom',
];

const VENDOR_TYPES = ['manufacturer', 'supplier', 'amc_provider', 'service_center', 'distributor'];

function StockBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    in_stock: { label: 'In Stock', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircle2 },
    low_stock: { label: 'Low Stock', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', Icon: AlertTriangle },
    out_of_stock: { label: 'Out of Stock', cls: 'bg-red-500/10 text-red-400 border-red-500/20', Icon: XCircle },
    discontinued: { label: 'Discontinued', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', Icon: XCircle },
  };
  const cfg = map[status] || { label: status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', Icon: Package };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

const BLANK_PART = {
  name: '', partNumber: '', componentType: '', manufacturer: '',
  stockQuantity: 0, minQuantity: 5, reorderLevel: 10, unitCost: 0,
  warehouseLocation: '', currency: 'INR',
};

const BLANK_VENDOR = {
  name: '', type: 'supplier', contactName: '', email: '', phone: '',
  address: '', city: '', country: 'India', website: '', supportEmail: '',
};

export default function InventoryClient() {
  const { accessToken: token } = useAuthStore();
  const [tab, setTab] = useState<'parts' | 'vendors'>('parts');
  const [parts, setParts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [partForm, setPartForm] = useState(BLANK_PART);
  const [vendorForm, setVendorForm] = useState(BLANK_VENDOR);
  const [saving, setSaving] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pRes, vRes, sRes, aRes] = await Promise.all([
        fetch(`${API}/inventory/spare-parts`, { headers }),
        fetch(`${API}/inventory/vendors`, { headers }),
        fetch(`${API}/inventory/spare-parts/summary`, { headers }),
        fetch(`${API}/inventory/spare-parts/alerts`, { headers }),
      ]);
      const [pj, vj, sj, aj] = await Promise.all([pRes.json(), vRes.json(), sRes.json(), aRes.json()]);
      if (pj.success) setParts(pj.data);
      if (vj.success) setVendors(vj.data);
      if (sj.success) setSummary(sj.data);
      if (aj.success) setAlerts(aj.data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createPart = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/inventory/spare-parts`, { method: 'POST', headers, body: JSON.stringify(partForm) });
      const j = await res.json();
      if (j.success) { setShowCreatePart(false); setPartForm(BLANK_PART); fetchAll(); }
    } finally { setSaving(false); }
  };

  const createVendor = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/inventory/vendors`, { method: 'POST', headers, body: JSON.stringify(vendorForm) });
      const j = await res.json();
      if (j.success) { setShowCreateVendor(false); setVendorForm(BLANK_VENDOR); fetchAll(); }
    } finally { setSaving(false); }
  };

  const adjustStock = async (partId: string) => {
    await fetch(`${API}/inventory/spare-parts/${partId}/stock`, {
      method: 'PATCH', headers, body: JSON.stringify({ adjustment: adjustQty, reason: 'Manual adjustment' }),
    });
    setAdjustId(null);
    setAdjustQty(0);
    fetchAll();
  };

  const deletePart = async (partId: string) => {
    if (!confirm('Delete this spare part?')) return;
    await fetch(`${API}/inventory/spare-parts/${partId}`, { method: 'DELETE', headers });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            Parts Inventory & Vendors
          </h1>
          <p className="text-[#64748B] text-sm mt-1">Manage spare parts stock levels and supplier directory</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateVendor(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1B1D2A] border border-[#2A2D3E] text-[#94A3B8] hover:text-white rounded-lg text-sm transition-all">
            <Building2 className="w-4 h-4" /> Add Vendor
          </button>
          <button onClick={() => setShowCreatePart(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <PlusCircle className="w-4 h-4" /> Add Part
          </button>
        </div>
      </div>

      {/* ─── Low Stock Alerts ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium text-sm">Inventory Alerts ({alerts.length})</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alerts.map((a: any) => (
                <span key={a._id} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-full">
                  {a.name} ({a.stockQuantity} left)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Summary Cards ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Parts', value: summary.totalItems || 0, color: 'text-blue-400', bg: 'bg-blue-500/10', Icon: Package },
            { label: 'Total Value', value: `₹${(summary.totalValue || 0).toLocaleString()}`, color: 'text-cyan-400', bg: 'bg-cyan-500/10', Icon: DollarSign },
            { label: 'In Stock', value: summary.inStock || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', Icon: CheckCircle2 },
            { label: 'Low Stock', value: summary.lowStock || 0, color: 'text-amber-400', bg: 'bg-amber-500/10', Icon: AlertTriangle },
            { label: 'Out of Stock', value: summary.outOfStock || 0, color: 'text-red-400', bg: 'bg-red-500/10', Icon: TrendingDown },
          ].map(c => (
            <div key={c.label} className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                <c.Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-[#64748B] text-xs mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-1 w-fit">
        {(['parts', 'vendors'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {t === 'parts' ? `Spare Parts (${parts.length})` : `Vendors (${vendors.length})`}
          </button>
        ))}
      </div>

      {/* ─── Parts Table ──────────────────────────────────────────────────── */}
      {tab === 'parts' && (
        <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1B1D2A]">
                  {['Part #', 'Name', 'Type', 'Stock', 'Min Qty', 'Unit Cost', 'Location', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#64748B] text-xs font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B1D2A]">
                {parts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">
                      No spare parts in inventory. Add your first part.
                    </td>
                  </tr>
                ) : (
                  parts.map((p: any) => (
                    <tr key={p._id} className="hover:bg-[#0A0B10] transition-colors group">
                      <td className="px-4 py-3 text-[#64748B] text-sm font-mono">{p.partNumber}</td>
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium">{p.name}</div>
                        {p.manufacturer && <div className="text-[#64748B] text-xs">{p.manufacturer}</div>}
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8] text-sm">{p.componentType}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${p.stockQuantity <= p.minQuantity ? 'text-red-400' : 'text-white'}`}>
                            {p.stockQuantity}
                          </span>
                          {adjustId === p._id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={adjustQty}
                                onChange={e => setAdjustQty(Number(e.target.value))}
                                className="w-16 bg-[#0A0B10] border border-[#2A2D3E] rounded px-2 py-0.5 text-white text-xs"
                              />
                              <button onClick={() => adjustStock(p._id)} className="text-xs text-emerald-400 hover:text-emerald-300">✓</button>
                              <button onClick={() => setAdjustId(null)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAdjustId(p._id)}
                              className="opacity-0 group-hover:opacity-100 text-xs text-[#64748B] hover:text-[#94A3B8] transition-all"
                            >
                              ±
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B] text-sm">{p.minQuantity}</td>
                      <td className="px-4 py-3 text-[#94A3B8] text-sm">₹{p.unitCost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#64748B] text-sm">{p.warehouseLocation || '—'}</td>
                      <td className="px-4 py-3"><StockBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => deletePart(p._id)} className="opacity-0 group-hover:opacity-100 text-red-500/60 hover:text-red-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Vendors Grid ─────────────────────────────────────────────────── */}
      {tab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.length === 0 ? (
            <div className="col-span-full text-center py-16 text-[#64748B] bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No vendors registered yet.</p>
            </div>
          ) : (
            vendors.map((v: any) => (
              <div key={v._id} className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5 hover:border-[#2A2D3E] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">{v.name}</div>
                      <span className="text-[#64748B] text-xs capitalize">{v.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {v.code && <span className="text-[#64748B] text-xs font-mono bg-[#1B1D2A] px-2 py-0.5 rounded">{v.code}</span>}
                </div>
                <div className="space-y-2">
                  {v.contactName && (
                    <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                      <Hash className="w-3.5 h-3.5 text-[#64748B]" />
                      {v.contactName}
                    </div>
                  )}
                  {v.email && (
                    <a href={`mailto:${v.email}`} className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-blue-400 transition-colors">
                      <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                      {v.email}
                    </a>
                  )}
                  {v.phone && (
                    <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                      <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                      {v.phone}
                    </div>
                  )}
                  {v.website && (
                    <a href={v.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      <Globe className="w-3.5 h-3.5" />
                      {v.website.replace('https://', '')}
                    </a>
                  )}
                </div>
                {v.city && (
                  <div className="mt-3 pt-3 border-t border-[#1B1D2A] text-[#64748B] text-xs">
                    {v.city}{v.state ? `, ${v.state}` : ''}, {v.country}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Create Part Modal ────────────────────────────────────────────── */}
      {showCreatePart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-5">Add Spare Part</h2>
            <div className="space-y-4">
              {[
                { label: 'Part Name', field: 'name', type: 'text' },
                { label: 'Part Number', field: 'partNumber', type: 'text' },
                { label: 'Component Type', field: 'componentType', type: 'select', options: COMPONENT_TYPES.map(t => ({ value: t, label: t })) },
                { label: 'Manufacturer', field: 'manufacturer', type: 'text' },
                { label: 'Initial Stock Quantity', field: 'stockQuantity', type: 'number' },
                { label: 'Minimum Quantity (Alert)', field: 'minQuantity', type: 'number' },
                { label: 'Reorder Level', field: 'reorderLevel', type: 'number' },
                { label: 'Unit Cost (₹)', field: 'unitCost', type: 'number' },
                { label: 'Warehouse Location', field: 'warehouseLocation', type: 'text' },
              ].map(f => (
                <div key={f.field}>
                  <label className="text-[#94A3B8] text-xs mb-1.5 block">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={(partForm as any)[f.field]}
                      onChange={e => setPartForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select type...</option>
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={(partForm as any)[f.field]}
                      onChange={e => setPartForm(p => ({ ...p, [f.field]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreatePart(false)} className="flex-1 py-2 bg-[#1B1D2A] text-[#94A3B8] rounded-lg text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={createPart} disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Adding...' : 'Add Part'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Vendor Modal ──────────────────────────────────────────── */}
      {showCreateVendor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-5">Add Vendor / Supplier</h2>
            <div className="space-y-4">
              {[
                { label: 'Company Name', field: 'name', type: 'text' },
                { label: 'Vendor Type', field: 'type', type: 'select', options: VENDOR_TYPES.map(t => ({ value: t, label: t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) })) },
                { label: 'Contact Person', field: 'contactName', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
                { label: 'Phone', field: 'phone', type: 'tel' },
                { label: 'Address', field: 'address', type: 'text' },
                { label: 'City', field: 'city', type: 'text' },
                { label: 'Country', field: 'country', type: 'text' },
                { label: 'Website', field: 'website', type: 'text' },
                { label: 'Support Email', field: 'supportEmail', type: 'email' },
              ].map(f => (
                <div key={f.field}>
                  <label className="text-[#94A3B8] text-xs mb-1.5 block">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={(vendorForm as any)[f.field]}
                      onChange={e => setVendorForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={(vendorForm as any)[f.field]}
                      onChange={e => setVendorForm(p => ({ ...p, [f.field]: e.target.value }))}
                      className="w-full bg-[#0A0B10] border border-[#1B1D2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateVendor(false)} className="flex-1 py-2 bg-[#1B1D2A] text-[#94A3B8] rounded-lg text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={createVendor} disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Adding...' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
