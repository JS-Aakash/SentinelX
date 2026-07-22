'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceApi, MaintenanceOverview, WorkOrder, FleetInsight } from '@/api/maintenance';
import { machinesApi } from '@/api/machines';
import { Machine } from '@/types';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Flame,
  Zap,
  Activity,
  Calendar,
  UserCheck,
  Loader2,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export default function MaintenanceClient() {
  const [overview, setOverview] = useState<MaintenanceOverview | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'work_orders'>('matrix');

  // Work Order Modal State
  const [showModal, setShowModal] = useState(false);
  const [submittingWO, setSubmittingWO] = useState(false);
  const [formData, setFormData] = useState({
    machineId: '',
    title: '',
    description: '',
    type: 'predictive',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, woRes, mRes] = await Promise.all([
        maintenanceApi.getOverview(),
        maintenanceApi.getWorkOrders(),
        machinesApi.getAll({ limit: 100 }),
      ]);
      setOverview(ovRes.data?.data || null);
      setWorkOrders(woRes.data?.data?.workOrders || []);
      setMachines(mRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleOpenWOModal = (insight?: FleetInsight) => {
    if (insight) {
      const rec = insight.recommendations[0];
      setFormData({
        machineId: insight.machineId,
        title: rec ? rec.title : `Predictive Inspection: ${insight.name}`,
        description: rec
          ? `${rec.description}\nRecommended Action: ${rec.action}`
          : `Perform health inspection for ${insight.name} (${insight.machineCode}). Health Score: ${insight.healthScore}%, RSOT: ${insight.rsot}.`,
        type: 'predictive',
        priority: insight.healthScore < 50 ? 'urgent' : insight.healthScore < 75 ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });
    } else {
      setFormData({
        machineId: machines[0]?._id || machines[0]?.id || '',
        title: '',
        description: '',
        type: 'predictive',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machineId || !formData.title || !formData.description) return;
    setSubmittingWO(true);
    try {
      await maintenanceApi.createWorkOrder(formData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create work order');
    } finally {
      setSubmittingWO(false);
    }
  };

  const handleUpdateWOStatus = async (woId: string, status: any) => {
    try {
      await maintenanceApi.updateStatus(woId, status);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update work order status');
    }
  };

  const metrics = overview?.metrics;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-[oklch(0.55_0.01_240)] mb-1">
            <span>SentinelX</span>
            <span>/</span>
            <span className="text-[oklch(0.62_0.20_240)] font-medium">Predictive Maintenance</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wrench className="text-[oklch(0.62_0.20_240)]" size={24} />
            Predictive Maintenance & Work Orders
          </h1>
          <p className="text-xs text-[oklch(0.55_0.01_240)] mt-1">
            AI-driven failure mode forecasting, RSOT threshold alerts, and maintenance dispatching.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenWOModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-blue-600 hover:from-[oklch(0.58_0.26_240)] hover:to-blue-500 transition-all shadow-lg hover:shadow-blue-500/20"
        >
          <Plus size={15} />
          Create Work Order
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity size={22} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Avg Fleet Health
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">
              {metrics?.avgFleetHealth || 100}%
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert size={22} className={metrics?.criticalCount ? 'animate-pulse' : ''} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Critical Risk Machines
            </span>
            <span className="text-2xl font-extrabold text-rose-400 font-mono">
              {metrics?.criticalCount || 0}
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Warning Alerts
            </span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono">
              {metrics?.warningCount || 0}
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[oklch(0.20_0.01_240)] flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wrench size={22} />
          </div>
          <div>
            <span className="text-[10px] text-[oklch(0.55_0.01_240)] uppercase tracking-wider font-semibold block">
              Open Work Orders
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">
              {(metrics?.workOrders.pending || 0) + (metrics?.workOrders.inProgress || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Health Breakdown Bar Chart */}
      {overview?.fleetInsights && overview.fleetInsights.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-[oklch(0.20_0.01_240)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity size={16} className="text-blue-400" /> Fleet Machine Health Score Distribution
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">0-100 INDEX</span>
          </div>

          <div className="h-44 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.fleetInsights.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="machineCode" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D0E15', borderColor: '#1E2235', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                <Bar dataKey="healthScore" radius={[4, 4, 0, 0]}>
                  {overview.fleetInsights.slice(0, 10).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.healthScore < 50 ? '#F43F5E' : entry.healthScore < 75 ? '#F59E0B' : '#10B981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs Selection */}
      <div className="flex gap-2 border-b border-[oklch(0.18_0.009_240)] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${
            activeTab === 'matrix'
              ? 'bg-[oklch(0.14_0.007_240)] text-white border-t border-x border-[oklch(0.22_0.01_240)] border-b-0'
              : 'text-[oklch(0.55_0.01_240)] hover:text-white'
          }`}
        >
          Fleet Risk Matrix & AI Actions ({overview?.fleetInsights.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('work_orders')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${
            activeTab === 'work_orders'
              ? 'bg-[oklch(0.14_0.007_240)] text-white border-t border-x border-[oklch(0.22_0.01_240)] border-b-0'
              : 'text-[oklch(0.55_0.01_240)] hover:text-white'
          }`}
        >
          Work Orders Log ({workOrders.length})
        </button>
      </div>

      {/* TAB 1: Fleet Risk Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center text-slate-400 animate-pulse">
              Loading predictive analytics...
            </div>
          ) : !overview?.fleetInsights || overview.fleetInsights.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center text-slate-400">
              No machine data available. Register machines to begin predictive monitoring.
            </div>
          ) : (
            <div className="space-y-3">
              {overview.fleetInsights.map((insight) => (
                <div
                  key={insight.machineId}
                  className={`glass rounded-2xl p-5 border transition-all ${
                    insight.healthScore < 50
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : insight.healthScore < 75
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-[oklch(0.20_0.01_240)]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Machine info */}
                    <div className="space-y-1 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[oklch(0.62_0.20_240)] px-2 py-0.5 rounded bg-[oklch(0.52_0.24_240/0.12)] border border-[oklch(0.52_0.24_240/0.25)]">
                          {insight.machineCode}
                        </span>
                        <span className="text-xs text-[oklch(0.55_0.01_240)]">{insight.type}</span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-tight">{insight.name}</h3>
                      <p className="text-[11px] text-[oklch(0.50_0.01_240)]">
                        {[insight.department, insight.plant].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    {/* Health Score Gauge */}
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <span className="text-[10px] text-[oklch(0.50_0.01_240)] uppercase tracking-wider block font-medium">
                          Health Score
                        </span>
                        <span
                          className={`text-2xl font-extrabold font-mono ${
                            insight.healthScore < 50
                              ? 'text-rose-400'
                              : insight.healthScore < 75
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {insight.healthScore}%
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-[10px] text-[oklch(0.50_0.01_240)] uppercase tracking-wider block font-medium">
                          RSOT Estimate
                        </span>
                        <span className="text-sm font-bold text-white font-mono block mt-1">
                          {insight.rsot}
                        </span>
                      </div>
                    </div>

                    {/* AI Recommendations */}
                    <div className="flex-1 min-w-0 bg-[oklch(0.12_0.007_240)] p-3 rounded-xl border border-[oklch(0.18_0.008_240)]">
                      {insight.recommendations.length > 0 ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                            AI Action Recommended:
                          </span>
                          <p className="text-xs font-semibold text-white">
                            {insight.recommendations[0].title}
                          </p>
                          <p className="text-[11px] text-[oklch(0.60_0.01_240)] line-clamp-1">
                            {insight.recommendations[0].action}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> System operating within nominal parameters.
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenWOModal(insight)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 shrink-0"
                    >
                      <Wrench size={13} />
                      Log Work Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Work Orders Log */}
      {activeTab === 'work_orders' && (
        <div className="glass rounded-2xl p-5 border border-[oklch(0.20_0.01_240)] space-y-4">
          <h3 className="text-sm font-bold text-white">Dispatched Work Orders</h3>

          {workOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No work orders created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((wo) => (
                <div
                  key={wo._id}
                  className="p-4 rounded-xl bg-[oklch(0.12_0.007_240)] border border-[oklch(0.18_0.008_240)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{wo.workOrderNumber}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {wo.type}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          wo.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-300'
                            : wo.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {wo.priority}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{wo.title}</h4>
                    <p className="text-xs text-[oklch(0.55_0.01_240)] line-clamp-1">{wo.description}</p>
                    <p className="text-[11px] text-[oklch(0.45_0.01_240)]">
                      Machine: <strong className="text-white">{wo.machineId?.name}</strong> ({wo.machineId?.machineCode})
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <select
                      value={wo.status}
                      onChange={(e) => handleUpdateWOStatus(wo._id, e.target.value)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 bg-slate-900 border text-white ${
                        wo.status === 'completed'
                          ? 'border-emerald-500 text-emerald-400'
                          : wo.status === 'in_progress'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-slate-700'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Work Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-lg w-full border border-[oklch(0.22_0.01_240)] space-y-4">
            <div className="flex items-center justify-between border-b border-[oklch(0.18_0.008_240)] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench size={18} className="text-[oklch(0.62_0.20_240)]" />
                Dispatch Work Order
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWO} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Target Machine</label>
                <select
                  value={formData.machineId}
                  onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                  className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded-lg p-2.5 text-white"
                  required
                >
                  {machines.map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name} ({m.machineCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded-lg p-2.5 text-white"
                  placeholder="e.g. Inspect Bearing Thermal Grease"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Description & Actions</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded-lg p-2.5 text-white"
                  placeholder="Detailed maintenance steps..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded-lg p-2.5 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[oklch(0.12_0.007_240)] border border-[oklch(0.22_0.01_240)] rounded-lg p-2.5 text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWO}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white flex items-center gap-2"
                >
                  {submittingWO && <Loader2 size={13} className="animate-spin" />}
                  Dispatch Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
