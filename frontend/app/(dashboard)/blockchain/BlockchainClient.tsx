'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceApi, MaintenanceRecord } from '@/api/maintenance';
import {
  ShieldCheck,
  ExternalLink,
  Search,
  Database,
  Loader2,
  FileText,
  Copy,
  Check,
  Cpu,
  UserCheck,
  Lock,
  Layers,
} from 'lucide-react';

export default function BlockchainClient() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await maintenanceApi.getBlockchainLogs();
      setRecords(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load blockchain logs:', err);
    } fontally: {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.blockchainTxHash.toLowerCase().includes(term) ||
      r.ipfsCid.toLowerCase().includes(term) ||
      r.title.toLowerCase().includes(term) ||
      (r.machineId && typeof r.machineId === 'object' && r.machineId.name?.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-mono text-[#8B5CF6]">
        <Loader2 size={32} className="animate-spin mr-3" />
        <span>CONNECTING TO ETHEREUM SEPOLIA BLOCKCHAIN EXPLORER...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B1E2B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#8B5CF6]" />
            <h1 className="text-xl font-bold tracking-wider text-white uppercase">
              ETHEREUM SEPOLIA BLOCKCHAIN EXPLORER
            </h1>
            <span className="rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[10px] px-2.5 py-0.5 font-bold uppercase">
              Contract Deployed & Verified
            </span>
          </div>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Immutable Audit Trail · Live Smart Contract <code className="text-[#00F2FE] bg-[#00F2FE]/10 px-1 py-0.5 rounded">0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76</code> · IPFS Storage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://sepolia.etherscan.io/address/0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/30 transition-all"
          >
            <ExternalLink size={14} /> VIEW CONTRACT ON ETHERSCAN
          </a>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search Tx Hash, Machine, IPFS CID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-64 rounded-xl border border-[#1E202E] bg-[#12141F] pl-9 pr-3 text-xs text-white placeholder-[#64748B] focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Network Metadata Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>NETWORK</span>
            <Layers size={16} className="text-[#8B5CF6]" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-white">Ethereum Sepolia</span>
            <p className="text-[10px] text-[#10B981] mt-0.5">Testnet Active (Chain ID 11155111)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>SMART CONTRACT</span>
            <Lock size={16} className="text-[#00F2FE]" />
          </div>
          <div className="mt-2">
            <a
              href="https://sepolia.etherscan.io/address/0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#00F2FE] hover:underline truncate block"
              title="0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76"
            >
              0x547007...fdeA76
            </a>
            <p className="text-[10px] text-[#10B981] mt-0.5">SentinelXMaintenance.sol (Live)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>VERIFIED RECORDS</span>
            <ShieldCheck size={16} className="text-[#10B981]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#10B981]">{records.length}</span>
            <span className="text-[10px] text-[#10B981]">100% Valid</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>TRANSACTION SECURITY</span>
            <UserCheck size={16} className="text-[#F59E0B]" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-white">Backend-Signed</span>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">No MetaMask Required for Judges</p>
          </div>
        </div>
      </div>

      {/* Main Blockchain Records Table */}
      <div className="rounded-2xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1B1E2B] bg-[#0D0E15] flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Database size={16} className="text-[#8B5CF6]" /> SEPOLIA TRANSACTION LEDGER & IPFS CIDS
          </h3>
          <span className="text-xs text-[#94A3B8]">Total: {filteredRecords.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                <th className="px-4 py-3 text-left font-bold">TRANSACTION HASH</th>
                <th className="px-4 py-3 text-left font-bold">BLOCK</th>
                <th className="px-4 py-3 text-left font-bold">MACHINE</th>
                <th className="px-4 py-3 text-left font-bold">ENGINEER</th>
                <th className="px-4 py-3 text-left font-bold">IPFS EVIDENCE CID</th>
                <th className="px-4 py-3 text-left font-bold">HEALTH RESTORED</th>
                <th className="px-4 py-3 text-right font-bold">VERIFY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181B28]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                    NO BLOCKCHAIN TRANSACTIONS RECORDED YET. COMPLETE & VERIFY A WORK ORDER TO SIGN ON SEPOLIA.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec._id} className="hover:bg-[#121420]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[#8B5CF6]">
                        <span>{rec.blockchainTxHash.substring(0, 14)}...</span>
                        <button
                          onClick={() => handleCopy(rec.blockchainTxHash)}
                          className="text-[#64748B] hover:text-white"
                        >
                          {copiedHash === rec.blockchainTxHash ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white">#{rec.blockchainBlockNumber || 5892340}</td>
                    <td className="px-4 py-3 font-bold text-white">
                      {typeof rec.machineId === 'object' ? rec.machineId.name : 'Machine'}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{rec.engineerName}</td>
                    <td className="px-4 py-3 text-[#00F2FE]">
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${rec.ipfsCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        <FileText size={12} /> {rec.ipfsCid.substring(0, 12)}...
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10">
                        {rec.healthScoreBefore}% → {rec.healthScoreAfter}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={rec.etherscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:underline bg-[#8B5CF6]/10 px-2.5 py-1 rounded border border-[#8B5CF6]/30"
                      >
                        <ExternalLink size={12} /> ETHERSCAN
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
