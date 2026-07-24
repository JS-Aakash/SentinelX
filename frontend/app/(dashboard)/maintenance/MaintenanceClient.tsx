'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceApi, MaintenanceOverview, WorkOrder, FleetInsight, MaintenanceRecord } from '@/api/maintenance';
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
  ShieldCheck,
  Database,
  ExternalLink,
  Users,
  FileText,
  Upload,
  Sparkles,
  Search,
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
  const [timeline, setTimeline] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'work_orders' | 'workforce' | 'timeline'>('matrix');
  const [selectedMachineTimeline, setSelectedMachineTimeline] = useState<string>('');

  // Modals
  const [showWOModal, setShowWOModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedWOForComplete, setSelectedWOForComplete] = useState<WorkOrder | null>(null);

  const [submittingWO, setSubmittingWO] = useState(false);
  const [completingWO, setCompletingWO] = useState(false);
  const [verifyingWOId, setVerifyingWOId] = useState<string | null>(null);

  // WO Form Data
  const [woFormData, setWoFormData] = useState({
    machineId: '',
    title: '',
    description: '',
    type: 'predictive',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  // Repair Completion Form Data
  const [completeFormData, setCompleteFormData] = useState({
    problem: '',
    diagnosis: '',
    rootCause: '',
    actionTaken: '',
    partsReplaced: 'Motor Bearings, Coolant Seal',
    downtimeHours: 1.5,
    cost: 250,
    remarks: 'Full repair complete and thermal tolerances re-verified.',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, woRes, mRes] = await Promise.all([
        maintenanceApi.getOverview(),
        maintenanceApi.getWorkOrders(),
        machinesApi.getAll({ limit: 100 }),
      ]);
      setOverview(ovRes.data?.data || null);
      setWorkOrders(woRes.data?.data?.workOrders || []);
      const machList = mRes.data?.data || [];
      setMachines(machList);
      if (machList.length > 0 && !selectedMachineTimeline) {
        setSelectedMachineTimeline(machList[0]._id || machList[0].id);
      }
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMachineTimeline]);

  const fetchTimeline = useCallback(async (machineId: string) => {
    if (!machineId) return;
    try {
      const res = await maintenanceApi.getTimeline(machineId);
      setTimeline(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (selectedMachineTimeline) {
      fetchTimeline(selectedMachineTimeline);
    }
  }, [selectedMachineTimeline, fetchTimeline]);

  const handleOpenWOModal = (insight?: FleetInsight) => {
    if (insight) {
      const rec = insight.recommendations[0];
      setWoFormData({
        machineId: insight.machineId,
        title: rec ? rec.title : `Predictive Repair: ${insight.name}`,
        description: rec
          ? `${rec.description}\nRecommended Action: ${rec.action}`
          : `Perform health inspection for ${insight.name} (${insight.machineCode}). Health Score: ${insight.healthScore}%, RSOT: ${insight.rsot}.`,
        type: 'predictive',
        priority: insight.healthScore < 50 ? 'urgent' : insight.healthScore < 75 ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });
    } else {
      setWoFormData({
        machineId: machines[0]?._id || machines[0]?.id || '',
        title: '',
        description: '',
        type: 'predictive',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });
    }
    setShowWOModal(true);
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woFormData.machineId || !woFormData.title || !woFormData.description) return;
    try {
      setSubmittingWO(true);
      await maintenanceApi.createWorkOrder(woFormData);
      setShowWOModal(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create work order');
    } finally {
      setSubmittingWO(false);
    }
  };

  const handleOpenCompleteModal = (wo: WorkOrder) => {
    setSelectedWOForComplete(wo);
    setCompleteFormData({
      problem: wo.title,
      diagnosis: 'Detected bearing play and elevated thermal dissipation',
      rootCause: 'High operational friction & lubricant degradation',
      actionTaken: 'Replaced motor bearings, cleaned air intake, flushed coolant',
      partsReplaced: 'Motor Bearings (ISO 6208), Thermal Seal',
      downtimeHours: 1.5,
      cost: 320,
      remarks: 'Maintenance completed. Re-tested under load with clean vibration spectrum.',
    });
    setShowCompleteModal(true);
  };

  const handleCompleteWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWOForComplete) return;
    try {
      setCompletingWO(true);
      const fd = new FormData();
      fd.append('problem', completeFormData.problem);
      fd.append('diagnosis', completeFormData.diagnosis);
      fd.append('rootCause', completeFormData.rootCause);
      fd.append('actionTaken', completeFormData.actionTaken);
      fd.append('partsReplaced', completeFormData.partsReplaced);
      fd.append('downtimeHours', String(completeFormData.downtimeHours));
      fd.append('cost', String(completeFormData.cost));
      fd.append('remarks', completeFormData.remarks);

      selectedFiles.forEach((file) => {
        fd.append('evidenceFiles', file);
      });

      await maintenanceApi.completeWorkOrder(selectedWOForComplete._id, fd);
      setShowCompleteModal(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit repair completion');
    } finally {
      setCompletingWO(false);
    }
  };

  const handleVerifyWorkOrder = async (woId: string) => {
    try {
      setVerifyingWOId(woId);
      await maintenanceApi.verifyWorkOrder(woId);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Sepolia Blockchain Verification failed');
    } finally {
      setVerifyingWOId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-mono text-[#00F2FE]">
        <Loader2 size={32} className="animate-spin mr-3" />
        <span>INITIALIZING SENTINELX MAINTENANCE & WORKFORCE PIPELINE...</span>
      </div>
    );
  }

  // Work order metrics
  const pendingCount = workOrders.filter((w) => w.status === 'pending' || w.status === 'assigned').length;
  const inProgressCount = workOrders.filter((w) => w.status === 'in_progress').length;
  const completedCount = workOrders.filter((w) => w.status === 'completed').length;
  const verifiedCount = workOrders.filter((w) => w.status === 'verified' || w.status === 'closed').length;

  const chartData = [
    { name: 'Pending', count: pendingCount, color: '#F59E0B' },
    { name: 'In Progress', count: inProgressCount, color: '#3B82F6' },
    { name: 'Completed', count: completedCount, color: '#10B981' },
    { name: 'Verified (Sepolia)', count: verifiedCount, color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6 font-mono pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B1E2B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-[#00F2FE]" />
            <h1 className="text-xl font-bold tracking-wider text-white uppercase">
              MAINTENANCE & WORKFORCE MANAGEMENT
            </h1>
            <span className="rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[10px] px-2.5 py-0.5 font-bold uppercase">
              Module 9 Active
            </span>
          </div>
          <p className="mt-1 text-xs text-[#94A3B8]">
            AI Prediction Workflows · IPFS Evidence Storage · Ethereum Sepolia Blockchain Verification
          </p>
        </div>

        <button
          onClick={() => handleOpenWOModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] text-[#0A0B10] px-4 py-2 text-xs font-bold shadow-lg shadow-[#00F2FE]/20 hover:brightness-110 transition-all"
        >
          <Plus size={16} /> CREATE WORK ORDER
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-[#1B1E2B] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>AVG FLEET HEALTH</span>
            <Activity size={16} className="text-[#00F2FE]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{overview?.metrics.avgFleetHealth || 100}%</span>
            <span className="text-[10px] text-[#10B981]">Nominal</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>PENDING WORK ORDERS</span>
            <Clock size={16} className="text-[#F59E0B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#F59E0B]">{pendingCount}</span>
            <span className="text-[10px] text-[#94A3B8]">Assigned</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>COMPLETED & VERIFIED</span>
            <CheckCircle2 size={16} className="text-[#10B981]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#10B981]">{completedCount + verifiedCount}</span>
            <span className="text-[10px] text-[#10B981]">Evidence Saved</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>SEPOLIA BLOCKCHAIN TXS</span>
            <ShieldCheck size={16} className="text-[#8B5CF6]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#8B5CF6]">{verifiedCount}</span>
            <span className="text-[10px] text-[#8B5CF6]">Immutable Records</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#1B1E2B] gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 transition-colors ${activeTab === 'matrix' ? 'border-b-2 border-[#00F2FE] text-[#00F2FE]' : 'text-[#64748B] hover:text-white'}`}
        >
          AI FLEET HEALTH MATRIX ({overview?.fleetInsights.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('work_orders')}
          className={`pb-3 transition-colors ${activeTab === 'work_orders' ? 'border-b-2 border-[#00F2FE] text-[#00F2FE]' : 'text-[#64748B] hover:text-white'}`}
        >
          WORK ORDERS LIFECYCLE ({workOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('workforce')}
          className={`pb-3 transition-colors ${activeTab === 'workforce' ? 'border-b-2 border-[#00F2FE] text-[#00F2FE]' : 'text-[#64748B] hover:text-white'}`}
        >
          WORKFORCE & ROLES (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 transition-colors ${activeTab === 'timeline' ? 'border-b-2 border-[#00F2FE] text-[#00F2FE]' : 'text-[#64748B] hover:text-white'}`}
        >
          MACHINE TIMELINE & SEPOLIA PROOF
        </button>
      </div>

      {/* Tab 1: AI Fleet Matrix */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                CRITICAL & HIGH-RISK ASSETS REQUIRING ATTENTION
              </h3>

              <div className="space-y-3">
                {overview?.fleetInsights.map((insight) => (
                  <div
                    key={insight.machineId}
                    className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-[#181B28] bg-[#0E101A] gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{insight.name}</span>
                        <span className="text-[10px] text-[#64748B]">({insight.machineCode})</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            insight.healthScore < 50
                              ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                              : insight.healthScore < 75
                              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                              : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                          }`}
                        >
                          {insight.healthStatus} ({insight.healthScore}%)
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        RSOT: <span className="text-[#00F2FE]">{insight.rsot}</span> · Plant: {insight.plant || 'General'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenWOModal(insight)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#141724] border border-[#262A3E] text-xs font-semibold text-[#00F2FE] hover:bg-[#1E2336] px-3 py-1.5 transition-all"
                    >
                      <Plus size={13} /> CONVERT TO WORK ORDER
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5">
              <h3 className="text-xs font-bold text-[#94A3B8] uppercase mb-4">WORK ORDERS BREAKDOWN</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                    <YAxis stroke="#64748B" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B0C12', borderColor: '#1B1E2B', fontSize: '11px' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Work Orders Lifecycle */}
      {activeTab === 'work_orders' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1B1E2B] bg-[#0D0E15] flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                MAINTENANCE WORK ORDERS & SEPOLIA BLOCKCHAIN VERIFICATION
              </h3>
              <span className="text-xs text-[#94A3B8]">Total: {workOrders.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                    <th className="px-4 py-3 text-left font-bold">WO CODE</th>
                    <th className="px-4 py-3 text-left font-bold">MACHINE</th>
                    <th className="px-4 py-3 text-left font-bold">TITLE</th>
                    <th className="px-4 py-3 text-left font-bold">PRIORITY</th>
                    <th className="px-4 py-3 text-left font-bold">STATUS & WORKFLOW</th>
                    <th className="px-4 py-3 text-right font-bold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181B28]">
                  {workOrders.map((wo) => (
                    <tr key={wo._id} className="hover:bg-[#121420]/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#00F2FE]">{wo.workOrderNumber}</td>
                      <td className="px-4 py-3 text-white">{wo.machineId?.name || 'Machine'}</td>
                      <td className="px-4 py-3 text-[#94A3B8] max-w-xs truncate">{wo.title}</td>
                      <td className="px-4 py-3">
                        <span className="uppercase text-[10px] font-bold text-[#F59E0B] px-2 py-0.5 rounded bg-[#F59E0B]/10">
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              wo.status === 'verified'
                                ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30'
                                : wo.status === 'completed'
                                ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                                : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                            }`}
                          >
                            {wo.status}
                          </span>
                          {wo.ipfsCid && (
                            <span className="text-[10px] text-[#00F2FE]" title={`IPFS CID: ${wo.ipfsCid}`}>
                              [IPFS CID]
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {wo.status === 'pending' || wo.status === 'in_progress' || wo.status === 'assigned' ? (
                          <button
                            onClick={() => handleOpenCompleteModal(wo)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981] hover:underline"
                          >
                            <CheckCircle2 size={13} /> COMPLETE REPAIR
                          </button>
                        ) : wo.status === 'completed' ? (
                          <button
                            onClick={() => handleVerifyWorkOrder(wo._id)}
                            disabled={verifyingWOId === wo._id}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:underline disabled:opacity-50"
                          >
                            {verifyingWOId === wo._id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <ShieldCheck size={13} />
                            )}
                            VERIFY ON SEPOLIA
                          </button>
                        ) : (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${wo.blockchainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00F2FE] hover:underline"
                          >
                            <ExternalLink size={13} /> SEPOLIA TX
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Workforce & Roles (RBAC) */}
      {activeTab === 'workforce' && (
        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1B1E2B] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#00F2FE]" /> WORKFORCE & ROLE-BASED ACCESS CONTROL (RBAC)
            </h3>
            <span className="text-xs text-[#10B981]">Active RBAC System</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#181B28] bg-[#0D0E15] p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider">ADMIN / MANAGER</span>
              <h4 className="text-sm font-bold text-white">Full System Access</h4>
              <p className="text-xs text-[#94A3B8]">Registers machines, assigns engineers, signs Sepolia transactions, manages AI models.</p>
            </div>

            <div className="rounded-xl border border-[#181B28] bg-[#0D0E15] p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">MAINTENANCE MANAGER</span>
              <h4 className="text-sm font-bold text-white">Work Order & Verification</h4>
              <p className="text-xs text-[#94A3B8]">Creates work orders, schedules maintenance, verifies IPFS evidence & Sepolia records.</p>
            </div>

            <div className="rounded-xl border border-[#181B28] bg-[#0D0E15] p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#00F2FE] uppercase tracking-wider">MAINTENANCE ENGINEER</span>
              <h4 className="text-sm font-bold text-white">Repair Execution</h4>
              <p className="text-xs text-[#94A3B8]">Views assigned tasks, completes repairs, uploads photos/videos to IPFS.</p>
            </div>

            <div className="rounded-xl border border-[#181B28] bg-[#0D0E15] p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">OPERATOR</span>
              <h4 className="text-sm font-bold text-white">Machine Monitoring</h4>
              <p className="text-xs text-[#94A3B8]">Monitors live dashboards, checks RSOT timers, reports anomalies.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Machine Timeline & Sepolia Proof */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#94A3B8]">SELECT MACHINE:</label>
            <select
              value={selectedMachineTimeline}
              onChange={(e) => setSelectedMachineTimeline(e.target.value)}
              className="rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-1.5 text-xs text-white"
            >
              {machines.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  {m.name} ({m.machineCode})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">HISTORICAL MAINTENANCE TIMELINE</h3>

            {timeline.length === 0 ? (
              <p className="text-xs text-[#64748B]">No maintenance records recorded for this machine yet.</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((record) => (
                  <div key={record._id} className="p-4 rounded-xl border border-[#181B28] bg-[#0D0E16] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#00F2FE] text-xs">{record.title}</span>
                      <span className="text-[10px] text-[#94A3B8]">{new Date(record.completedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">{record.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#64748B]">
                      <span>Engineer: {record.engineerName}</span>
                      <span>Cost: ${record.cost}</span>
                      <span>Downtime: {record.downtimeHours}h</span>
                      <span>Health Restored: {record.healthScoreBefore}% → {record.healthScoreAfter}%</span>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t border-[#181B28]">
                      <span className="text-[10px] text-[#00F2FE]">IPFS CID: {record.ipfsCid}</span>
                      <a
                        href={record.etherscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:underline"
                      >
                        <ShieldCheck size={13} /> VERIFY ON SEPOLIA EXPLORER
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Work Order */}
      {showWOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1B1E2B] bg-[#0D0E15] p-6 space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-[#1B1E2B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase">CREATE MAINTENANCE WORK ORDER</h3>
              <button onClick={() => setShowWOModal(false)} className="text-[#64748B] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#64748B]">TARGET MACHINE</label>
                <select
                  value={woFormData.machineId}
                  onChange={(e) => setWoFormData({ ...woFormData, machineId: e.target.value })}
                  className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1"
                >
                  {machines.map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name} ({m.machineCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#64748B]">TITLE</label>
                <input
                  type="text"
                  value={woFormData.title}
                  onChange={(e) => setWoFormData({ ...woFormData, title: e.target.value })}
                  className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748B]">DESCRIPTION</label>
                <textarea
                  value={woFormData.description}
                  onChange={(e) => setWoFormData({ ...woFormData, description: e.target.value })}
                  className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1 h-20"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWOModal(false)}
                  className="px-4 py-2 text-xs text-[#94A3B8] hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submittingWO}
                  className="px-4 py-2 rounded-lg bg-[#00F2FE] text-[#0A0B10] text-xs font-bold hover:brightness-110"
                >
                  {submittingWO ? 'CREATING...' : 'SUBMIT WORK ORDER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Repair Completion & IPFS Evidence Upload */}
      {showCompleteModal && selectedWOForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1B1E2B] bg-[#0D0E15] p-6 space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-[#1B1E2B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase">
                COMPLETE REPAIR & UPLOAD EVIDENCE ({selectedWOForComplete.workOrderNumber})
              </h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-[#64748B] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCompleteWorkOrder} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#64748B]">DIAGNOSIS & ROOT CAUSE</label>
                <input
                  type="text"
                  value={completeFormData.rootCause}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, rootCause: e.target.value })}
                  className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748B]">ACTION TAKEN & PARTS REPLACED</label>
                <input
                  type="text"
                  value={completeFormData.partsReplaced}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, partsReplaced: e.target.value })}
                  className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#64748B]">DOWNTIME (HOURS)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={completeFormData.downtimeHours}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, downtimeHours: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64748B]">REPAIR COST ($)</label>
                  <input
                    type="number"
                    value={completeFormData.cost}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, cost: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#1E202E] bg-[#12141F] px-3 py-2 text-xs text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#64748B]">EVIDENCE FILES (PHOTOS / DOCUMENTS FOR IPFS)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-[#94A3B8] mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-xs text-[#94A3B8] hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={completingWO}
                  className="px-4 py-2 rounded-lg bg-[#10B981] text-[#0A0B10] text-xs font-bold hover:brightness-110"
                >
                  {completingWO ? 'UPLOADING TO IPFS...' : 'SAVE & UPLOAD TO IPFS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
