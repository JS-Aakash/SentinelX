'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCode, Cpu, Shield, Wrench, ClipboardCheck, RotateCcw,
  Activity, ExternalLink, Hash, CheckCircle2, AlertTriangle,
  Calendar, MapPin, Settings, FileText, Download,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface PassportClientProps {
  machineId: string;
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#1B1D2A] last:border-0">
      <span className="text-[#64748B] text-sm">{label}</span>
      <span className={`text-[#94A3B8] text-sm ${mono ? 'font-mono' : ''} text-right max-w-[60%]`}>{String(value || '—')}</span>
    </div>
  );
}

export default function PassportClient({ machineId }: PassportClientProps) {
  const { accessToken: token } = useAuthStore();
  const [machine, setMachine] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const passportUrl = typeof window !== 'undefined' ? window.location.href : '';

  const fetchData = useCallback(async () => {
    if (!machineId || machineId === 'undefined') return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [mRes, tRes] = await Promise.all([
        fetch(`${API}/machines/${machineId}`, { headers }),
        fetch(`${API}/analytics/timeline/${machineId}`, { headers }),
      ]);
      if (mRes.ok) {
        const mj = await mRes.json();
        setMachine(mj.data || mj.machine);
      }
      if (tRes.ok) {
        const tj = await tRes.json();
        setTimeline(tj.data?.timeline || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [machineId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Draw QR code on canvas using simple module-based renderer
  useEffect(() => {
    if (!canvasRef.current || !passportUrl) return;

    // Use a CDN QR code API approach via image
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw placeholder pattern (actual QR via img tag below)
    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#0A0B10';
    // Draw "SX" text as placeholder
    ctx.font = 'bold 24px monospace';
    ctx.fillText('QR', 75, 105);
  }, [passportUrl]);

  const printPassport = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080A12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#64748B]">Loading Asset Passport...</p>
        </div>
      </div>
    );
  }

  const maintenanceEvents = timeline.filter((e: any) => e.type === 'MAINTENANCE');
  const componentEvents = timeline.filter((e: any) => e.type === 'COMPONENT_REPLACED');
  const inspectionEvents = timeline.filter((e: any) => e.type === 'INSPECTION_COMPLETED');
  const blockchainEvents = timeline.filter((e: any) => e.blockchainTxHash);

  return (
    <div className="min-h-screen bg-[#080A12]">
      {/* ─── Passport Header ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-[#0D0F1A] to-violet-900/40 border-b border-[#1B1D2A]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-[#64748B] text-xs font-mono uppercase tracking-widest mb-1">Digital Asset Passport</div>
                <h1 className="text-2xl font-bold text-white">{machine?.name || 'Machine'}</h1>
                <p className="text-[#64748B] text-sm mt-0.5 font-mono">{machine?.machineCode}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(passportUrl)}&bgcolor=ffffff&color=000000&format=png`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <p className="text-[#64748B] text-[10px] text-center">Scan to verify</p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-3 mt-6">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              machine?.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}>
              {machine?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {machine?.type}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400">
              {machine?.aiLifecycleStatus?.replace(/_/g, ' ').toUpperCase()}
            </span>
            {machine?.department && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#1B1D2A] border border-[#2A2D3E] text-[#94A3B8]">
                📍 {machine.department}
              </span>
            )}
            <button
              onClick={printPassport}
              className="ml-auto px-3 py-1.5 rounded-full text-xs font-medium bg-[#1B1D2A] border border-[#2A2D3E] text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" /> Print Passport
            </button>
          </div>
        </div>
      </div>

      {/* ─── Passport Body ─────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Maintenance Events', value: maintenanceEvents.length, Icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Parts Replaced', value: componentEvents.length, Icon: RotateCcw, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Inspections Done', value: inspectionEvents.length, Icon: ClipboardCheck, color: 'text-teal-400', bg: 'bg-teal-500/10' },
            { label: 'Blockchain Records', value: blockchainEvents.length, Icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-4 text-center">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                <s.Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[#64748B] text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Machine Specifications */}
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" /> Machine Specifications
            </h3>
            <InfoRow label="Type" value={machine?.type} />
            <InfoRow label="Manufacturer" value={machine?.manufacturer} />
            <InfoRow label="Model Number" value={machine?.modelNumber} />
            <InfoRow label="Serial Number" value={machine?.serialNumber} mono />
            <InfoRow label="Manufacturing Year" value={machine?.manufacturingYear} />
            <InfoRow label="Installation Date" value={machine?.installationDate ? new Date(machine.installationDate).toLocaleDateString() : '—'} />
            <InfoRow label="Commissioning Date" value={machine?.commissioningDate ? new Date(machine.commissioningDate).toLocaleDateString() : '—'} />
          </div>

          {/* Rated Parameters */}
          <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Rated Parameters
            </h3>
            <InfoRow label="Rated RPM" value={machine?.ratedRPM ? `${machine.ratedRPM} RPM` : '—'} />
            <InfoRow label="Rated Voltage" value={machine?.ratedVoltage ? `${machine.ratedVoltage} V` : '—'} />
            <InfoRow label="Rated Current" value={machine?.ratedCurrent ? `${machine.ratedCurrent} A` : '—'} />
            <InfoRow label="Rated Power" value={machine?.ratedPower ? `${machine.ratedPower} kW` : '—'} />
            <InfoRow label="Max Temperature" value={machine?.operatingLimits?.maxTemperature ? `${machine.operatingLimits.maxTemperature}°C` : '—'} />
            <InfoRow label="Max Vibration" value={machine?.operatingLimits?.maxVibration ? `${machine.operatingLimits.maxVibration} mm/s` : '—'} />
            <InfoRow label="Location" value={machine?.location || machine?.plant} />
          </div>
        </div>

        {/* Recent Timeline Events */}
        <div className="bg-[#0D0F1A] border border-[#1B1D2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-400" /> Recent Lifecycle Events
          </h3>
          {timeline.length === 0 ? (
            <p className="text-[#64748B] text-sm text-center py-4">No lifecycle events recorded yet</p>
          ) : (
            <div className="space-y-3">
              {[...timeline].reverse().slice(0, 8).map((event: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[#0A0B10] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#94A3B8] text-sm">{event.title}</p>
                      <span className="text-[#64748B] text-xs shrink-0">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {event.blockchainTxHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs flex items-center gap-1 mt-0.5 hover:underline"
                      >
                        <Hash className="w-3 h-3" />
                        {event.blockchainTxHash.slice(0, 18)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blockchain Verification Footer */}
        <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-medium text-sm">Blockchain Verified Records</h4>
              <p className="text-[#94A3B8] text-xs mt-1">
                All maintenance events, component replacements, and inspections are cryptographically anchored
                to the Ethereum Sepolia Testnet and stored on IPFS for permanent, tamper-proof verification.
              </p>
              <a
                href={`/blockchain`}
                className="inline-flex items-center gap-1.5 mt-3 text-blue-400 text-xs hover:text-blue-300 transition-colors"
              >
                View Blockchain Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-[#4A5568] text-xs">
          This digital asset passport is maintained by SentinelX. Machine ID: {machineId}
        </p>
      </div>
    </div>
  );
}
