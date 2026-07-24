'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Activity, TrendingUp, TrendingDown, Shield, Package,
  Cpu, Wrench, Clock, DollarSign, AlertTriangle, CheckCircle2,
  Users, RotateCcw, Download, RefreshCw, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function StatCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: any; label: string; value: string | number; sub?: string;
  color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5 hover:border-[#2A2D3E] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' :
            trend === 'down' ? 'bg-red-500/10 text-red-400' :
            'bg-slate-500/10 text-slate-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} trend
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-[#64748B] font-medium uppercase tracking-wider">{label}</div>
      {sub && <div className="text-xs text-[#64748B] mt-1">{sub}</div>}
    </div>
  );
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-2 bg-[#1B1D2A] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, (value / 20) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsClient() {
  const { accessToken: token } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'inventory' | 'warranty'>('overview');

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/enterprise`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const downloadReport = async (type: string) => {
    const res = await fetch(`${API}/analytics/reports/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#64748B] text-sm">Loading enterprise analytics...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'warranty', label: 'Warranty', icon: Shield },
  ] as const;

  const machines = data?.machines || {};
  const maintenance = data?.maintenance || {};
  const inventory = data?.inventory || {};
  const warranty = data?.warranty || {};
  const factory = data?.factory || {};

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Enterprise Analytics
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Full-spectrum operational intelligence across all machines, assets, and teams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3 py-2 bg-[#1B1D2A] border border-[#2A2D3E] rounded-lg text-[#94A3B8] hover:text-white hover:border-[#3B82F6] text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" /> Export Reports
            </button>
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-2 hidden group-hover:block z-50 shadow-2xl">
              {[
                { label: 'Machine Health CSV', type: 'machine-health' },
                { label: 'Maintenance CSV', type: 'maintenance' },
                { label: 'Inventory CSV', type: 'inventory' },
                { label: 'Warranty CSV', type: 'warranty' },
              ].map(r => (
                <button
                  key={r.type}
                  onClick={() => downloadReport(r.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#94A3B8] hover:text-white hover:bg-[#1B1D2A] rounded-lg text-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={Cpu} label="Total Machines" value={machines.total || 0} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={CheckCircle2} label="Healthy" value={machines.healthDistribution?.healthy || 0} color="bg-emerald-500/10 text-emerald-400" trend="up" />
        <StatCard icon={AlertTriangle} label="Critical" value={machines.critical || 0} color="bg-red-500/10 text-red-400" trend="down" />
        <StatCard icon={Activity} label="Availability" value={`${machines.availability?.toFixed(1) || 0}%`} color="bg-cyan-500/10 text-cyan-400" />
        <StatCard icon={Clock} label="MTTR (hrs)" value={maintenance.mttr || 0} color="bg-amber-500/10 text-amber-400" />
        <StatCard icon={TrendingUp} label="MTBF (hrs)" value={maintenance.mtbf || 0} color="bg-violet-500/10 text-violet-400" />
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Machine Health Distribution */}
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" /> Machine Health Distribution
            </h3>
            <div className="space-y-4">
              <HealthBar label="🟢 Healthy (≥80)" value={machines.healthDistribution?.healthy || 0} color="bg-emerald-500" />
              <HealthBar label="🟡 Warning (50-79)" value={machines.healthDistribution?.warning || 0} color="bg-amber-500" />
              <HealthBar label="🔴 Critical (<50)" value={machines.healthDistribution?.critical || 0} color="bg-red-500" />
              <HealthBar label="⚪ Unknown (no data)" value={machines.healthDistribution?.unknown || 0} color="bg-slate-500" />
            </div>
          </div>

          {/* Anomaly Trend */}
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" /> Anomaly Trend (7 Days)
            </h3>
            <div className="flex items-end gap-2 h-32">
              {Object.entries(factory.anomalyTrend || {}).map(([date, count]: [string, any]) => {
                const max = Math.max(...Object.values(factory.anomalyTrend || {0:1}).map(Number), 1);
                const height = Math.max(8, (count / max) * 100);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-red-600 to-red-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${date}: ${count} anomalies`}
                    />
                    <span className="text-[9px] text-[#64748B] rotate-45 origin-left">{date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Factory KPIs */}
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Factory KPIs
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Machine Availability', value: `${factory.machineAvailability || 0}%`, good: (factory.machineAvailability || 0) >= 85 },
                { label: 'Critical Machines', value: machines.critical || 0, good: (machines.critical || 0) === 0 },
                { label: 'Inspection Pass Rate', value: `${factory.inspectionPassRate || 0}%`, good: (factory.inspectionPassRate || 0) >= 90 },
                { label: 'Total Downtime (hrs)', value: `${maintenance.totalDowntimeHours || 0}h`, good: (maintenance.totalDowntimeHours || 0) < 24 },
              ].map(kpi => (
                <div key={kpi.label} className="bg-[#0A0B10] border border-[#1B1D2A] rounded-lg p-4">
                  <div className={`text-xl font-bold ${kpi.good ? 'text-emerald-400' : 'text-red-400'}`}>
                    {String(kpi.value)}
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Repairs Cost */}
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" /> Maintenance Costs
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[#1B1D2A]">
                <span className="text-[#94A3B8] text-sm">Total Work Orders</span>
                <span className="text-white font-medium">{maintenance.totalWorkOrders || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1B1D2A]">
                <span className="text-[#94A3B8] text-sm">Completed</span>
                <span className="text-emerald-400 font-medium">{maintenance.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1B1D2A]">
                <span className="text-[#94A3B8] text-sm">Total Repair Cost</span>
                <span className="text-white font-medium">₹{(maintenance.totalCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#94A3B8] text-sm">MTTR</span>
                <span className="text-amber-400 font-medium">{maintenance.mttr || 0} hrs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Maintenance Tab ──────────────────────────────────────────────── */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Work Order Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Orders', value: maintenance.totalWorkOrders || 0, color: 'text-blue-400' },
                { label: 'Completed', value: maintenance.completed || 0, color: 'text-emerald-400' },
                { label: 'MTTR', value: `${maintenance.mttr || 0} hrs`, color: 'text-amber-400' },
                { label: 'MTBF', value: `${maintenance.mtbf || 0} hrs`, color: 'text-violet-400' },
                { label: 'Total Downtime', value: `${maintenance.totalDowntimeHours || 0} hrs`, color: 'text-red-400' },
                { label: 'Total Cost', value: `₹${(maintenance.totalCost || 0).toLocaleString()}`, color: 'text-cyan-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#0A0B10]">
                  <span className="text-[#94A3B8] text-sm">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{String(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Machine Availability', value: `${machines.availability?.toFixed(1) || 0}%`, target: '≥ 85%', ok: (machines.availability || 0) >= 85 },
                { label: 'Inspection Pass Rate', value: `${factory.inspectionPassRate || 0}%`, target: '≥ 90%', ok: (factory.inspectionPassRate || 0) >= 90 },
                { label: 'MTTR Target', value: `${maintenance.mttr || 0} hrs`, target: '< 8 hrs', ok: (maintenance.mttr || 0) < 8 },
                { label: 'MTBF Target', value: `${maintenance.mtbf || 0} hrs`, target: '> 500 hrs', ok: (maintenance.mtbf || 0) > 500 },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-5 border ${m.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className={`text-2xl font-bold ${m.ok ? 'text-emerald-400' : 'text-red-400'}`}>{m.value}</div>
                  <div className="text-[#94A3B8] text-sm mt-1">{m.label}</div>
                  <div className="text-[#64748B] text-xs mt-0.5">Target: {m.target}</div>
                  <div className={`text-xs mt-2 font-medium ${m.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.ok ? '✓ On Target' : '✗ Needs Attention'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Inventory Tab ────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" /> Inventory Summary
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total Parts', value: inventory.totalItems || 0, color: 'text-blue-400' },
                { label: 'Total Value', value: `₹${(inventory.totalValue || 0).toLocaleString()}`, color: 'text-cyan-400' },
                { label: 'Low Stock Alerts', value: inventory.lowStockCount || 0, color: 'text-amber-400' },
                { label: 'Out of Stock', value: inventory.outOfStockCount || 0, color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#0A0B10]">
                  <span className="text-[#94A3B8] text-sm">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{String(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-violet-400" /> Most Replaced Components
            </h3>
            <div className="space-y-3">
              {(inventory.mostReplacedComponents || []).map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94A3B8]">{c.name}</span>
                      <span className="text-white font-medium">{c.count}x</span>
                    </div>
                    <div className="h-1.5 bg-[#1B1D2A] rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400"
                        style={{ width: `${Math.min(100, (c.count / ((inventory.mostReplacedComponents?.[0]?.count || 1))) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!inventory.mostReplacedComponents || inventory.mostReplacedComponents.length === 0) && (
                <p className="text-[#64748B] text-sm text-center py-4">No replacement data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Warranty Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'warranty' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> Warranty Status
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total Warranties', value: warranty.total || 0, color: 'text-blue-400' },
                { label: 'Active', value: warranty.active || 0, color: 'text-emerald-400' },
                { label: 'Expiring Soon (≤30 days)', value: warranty.expiringSoon || 0, color: 'text-amber-400' },
                { label: 'Expired', value: warranty.expired || 0, color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#0A0B10]">
                  <span className="text-[#94A3B8] text-sm">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{String(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Claims Analytics
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Claims Submitted', value: warranty.claimsSubmitted || 0, color: 'text-blue-400' },
                { label: 'Claims Approved', value: warranty.claimsApproved || 0, color: 'text-emerald-400' },
                { label: 'Claims Rejected', value: warranty.claimsRejected || 0, color: 'text-red-400' },
                { label: 'Approval Rate', value: `${warranty.claimsSubmitted > 0 ? ((warranty.claimsApproved / warranty.claimsSubmitted) * 100).toFixed(1) : 0}%`, color: 'text-cyan-400' },
                { label: 'Warranty Savings', value: `₹${(warranty.warrantySavings || 0).toLocaleString()}`, color: 'text-amber-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#0A0B10]">
                  <span className="text-[#94A3B8] text-sm">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{String(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
