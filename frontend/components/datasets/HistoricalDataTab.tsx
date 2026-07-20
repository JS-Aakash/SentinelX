'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Trash2,
  Table,
  Layers,
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
  Zap,
  Filter,
  ArrowUpDown,
  Check,
  RotateCcw,
  FileSpreadsheet,
  Cpu,
} from 'lucide-react';
import { datasetsApi, DatasetItem, DatasetPreviewResponse } from '@/api/datasets';
import { cn, formatDate } from '@/lib/utils';

interface HistoricalDataTabProps {
  machineId: string;
}

const STATUS_ORDER = ['uploaded', 'validated', 'cleaned', 'engineered', 'ready_for_training'];

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  uploaded: { label: 'Uploaded', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  validated: { label: 'Validated', bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', border: 'border-[#3B82F6]/20' },
  cleaned: { label: 'Cleaned', bg: 'bg-[#FFB300]/10', text: 'text-[#FFB300]', border: 'border-[#FFB300]/20' },
  engineered: { label: 'Engineered', bg: 'bg-[#9D4EDD]/10', text: 'text-[#9D4EDD]', border: 'border-[#9D4EDD]/20' },
  ready_for_training: { label: 'Ready For Training', bg: 'bg-[#00E676]/10', text: 'text-[#00E676]', border: 'border-[#00E676]/20' },
};

export function HistoricalDataTab({ machineId }: HistoricalDataTabProps) {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [activeDataset, setActiveDataset] = useState<DatasetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetNameInput, setDatasetNameInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Action states
  const [cleaning, setCleaning] = useState(false);
  const [engineering, setEngineering] = useState(false);

  // Data Preview state
  const [previewType, setPreviewType] = useState<'original' | 'cleaned' | 'engineered'>('original');
  const [previewData, setPreviewData] = useState<DatasetPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSearch, setPreviewSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all dataset versions for this machine
  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await datasetsApi.getByMachine(machineId);
      if (res.data.success && res.data.data) {
        const list = res.data.data;
        setDatasets(list);
        const active = list.find((d) => d.isActive) || (list.length > 0 ? list[0] : null);
        setActiveDataset(active);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  // Load Data Preview
  const loadPreview = useCallback(async () => {
    if (!activeDataset) return;
    try {
      setPreviewLoading(true);
      const res = await datasetsApi.getPreview(activeDataset._id, {
        type: previewType,
        page: previewPage,
        limit: 100,
        search: previewSearch,
      });
      if (res.data.success && res.data.data) {
        setPreviewData(res.data.data);
      }
    } catch {
      // ignore preview errors
    } finally {
      setPreviewLoading(false);
    }
  }, [activeDataset, previewType, previewPage, previewSearch]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (['.csv', '.xlsx', '.xls'].includes(ext)) {
        setSelectedFile(file);
      } else {
        alert('Invalid file format. Please upload a CSV or Excel (.xlsx) file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setUploadProgress(30);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('machineId', machineId);
      if (datasetNameInput.trim()) {
        formData.append('datasetName', datasetNameInput.trim());
      }

      setUploadProgress(70);
      const res = await datasetsApi.upload(formData);

      setUploadProgress(100);
      if (res.data.success) {
        setShowUploadModal(false);
        setSelectedFile(null);
        setDatasetNameInput('');
        loadDatasets();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Run Cleaning
  const handleRunCleaning = async () => {
    if (!activeDataset) return;
    try {
      setCleaning(true);
      const res = await datasetsApi.clean(activeDataset._id);
      if (res.data.success && res.data.data) {
        setActiveDataset(res.data.data);
        setPreviewType('cleaned');
        loadDatasets();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cleaning failed');
    } finally {
      setCleaning(false);
    }
  };

  // Run Feature Engineering
  const handleGenerateFeatures = async () => {
    if (!activeDataset) return;
    try {
      setEngineering(true);
      const res = await datasetsApi.generateFeatures(activeDataset._id);
      if (res.data.success && res.data.data) {
        setActiveDataset(res.data.data);
        setPreviewType('engineered');
        loadDatasets();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Feature engineering failed');
    } finally {
      setEngineering(false);
    }
  };

  // Set Active Version
  const handleActivateVersion = async (id: string) => {
    try {
      const res = await datasetsApi.activateVersion(id);
      if (res.data.success) {
        loadDatasets();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Activation failed');
    }
  };

  // Delete Version
  const handleDeleteVersion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset version? File and metadata will be permanently removed.')) return;
    try {
      const res = await datasetsApi.deleteVersion(id);
      if (res.data.success) {
        loadDatasets();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const currentStatusBadge = activeDataset
    ? STATUS_BADGES[activeDataset.status] || STATUS_BADGES['uploaded']
    : STATUS_BADGES['uploaded'];

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Top Status Pipeline Ribbon ───────────────────────────────────── */}
      <div className="rounded-xl border border-[#1B1E2B] bg-[#0D0E15] p-4 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shrink-0">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeDataset ? activeDataset.datasetName : 'NO DATASET UPLOADED'}
              </h3>
              {activeDataset && (
                <span className="text-xs text-[#00F2FE] px-2 py-0.5 rounded bg-[#161926] border border-[#2B324B]">
                  VERSION {activeDataset.version}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Per-machine historical training dataset pipeline (Module 6 Part 1)
            </p>
          </div>
        </div>

        {/* Pipeline Status Indicator */}
        <div className="flex items-center gap-2">
          {STATUS_ORDER.map((st, idx) => {
            const isCompleted = activeDataset
              ? STATUS_ORDER.indexOf(activeDataset.status) >= idx
              : false;
            return (
              <div key={st} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-[9px] font-bold uppercase border transition-all',
                    isCompleted
                      ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30'
                      : 'bg-[#12141F] text-[#475569] border-[#1E202E]'
                  )}
                >
                  {st.replace(/_/g, ' ')}
                </span>
                {idx < STATUS_ORDER.length - 1 && <span className="text-[#2E324D] text-xs">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Actions Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3B82F6] text-white text-xs font-bold px-4 py-2.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <UploadCloud size={16} /> UPLOAD NEW VERSION
          </button>

          <a
            href={datasetsApi.getSampleTemplateUrl()}
            download="sentinelx_sample_dataset.csv"
            className="inline-flex items-center gap-2 rounded-xl bg-[#141724] border border-[#262A3E] text-xs font-semibold text-[#00F2FE] hover:bg-[#1E2336] hover:border-[#3B82F6] px-4 py-2.5 transition-all"
          >
            <Download size={14} /> DOWNLOAD CSV TEMPLATE
          </a>
        </div>

        {activeDataset && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCleaning}
              disabled={cleaning || activeDataset.status === 'ready_for_training'}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all',
                activeDataset.cleanedFilePath
                  ? 'bg-[#141724] border-[#262A3E] text-[#FFB300] hover:bg-[#1E2336]'
                  : 'bg-[#FFB300]/15 border-[#FFB300]/30 text-[#FFB300] hover:bg-[#FFB300]/25'
              )}
            >
              <RefreshCw size={14} className={cn(cleaning && 'animate-spin')} />
              {cleaning ? 'CLEANING DATASET...' : activeDataset.cleanedFilePath ? 'RE-RUN AUTO-CLEAN' : 'RUN AUTO-CLEANING'}
            </button>

            <button
              onClick={handleGenerateFeatures}
              disabled={engineering}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all',
                activeDataset.status === 'ready_for_training'
                  ? 'bg-[#00E676]/15 border-[#00E676]/30 text-[#00E676] hover:bg-[#00E676]/25'
                  : 'bg-[#9D4EDD]/15 border-[#9D4EDD]/30 text-[#9D4EDD] hover:bg-[#9D4EDD]/25'
              )}
            >
              <Sparkles size={14} className={cn(engineering && 'animate-spin')} />
              {engineering ? 'ENGINEERING FEATURES...' : 'GENERATE ENGINEERED FEATURES'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Validation & Summary Grid ───────────────────────────────────── */}
      {activeDataset && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          {/* Validation Breakdown */}
          <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#181B28]">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">VALIDATION REPORT</h4>
              <span className="text-[10px] text-[#3B82F6]">AUTOMATED</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#12141F] border border-[#1E202E] p-2.5 rounded">
                <p className="text-[9px] text-[#64748B]">TOTAL ROWS</p>
                <p className="text-lg font-bold text-white tabular-nums">{activeDataset.validationReport?.totalRows || activeDataset.rowCount}</p>
              </div>
              <div className="bg-[#12141F] border border-[#1E202E] p-2.5 rounded">
                <p className="text-[9px] text-[#00E676]">VALID ROWS</p>
                <p className="text-lg font-bold text-[#00E676] tabular-nums">{activeDataset.validationReport?.validRows || activeDataset.rowCount}</p>
              </div>
              <div className="bg-[#12141F] border border-[#1E202E] p-2.5 rounded">
                <p className="text-[9px] text-[#FFB300]">DUPLICATE TIMESTAMPS</p>
                <p className="text-lg font-bold text-[#FFB300] tabular-nums">{activeDataset.validationReport?.duplicateRows || 0}</p>
              </div>
              <div className="bg-[#12141F] border border-[#1E202E] p-2.5 rounded">
                <p className="text-[9px] text-[#FF1744]">MISSING / INVALID</p>
                <p className="text-lg font-bold text-[#FF1744] tabular-nums">{activeDataset.validationReport?.missingValues || 0}</p>
              </div>
            </div>
          </div>

          {/* Dataset Summary */}
          <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#181B28]">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">DATASET METADATA</h4>
              <span className="text-[10px] text-[#00E676]">VERIFIED</span>
            </div>
            <div className="space-y-1.5 text-xs text-[#64748B]">
              <div className="flex justify-between py-1 border-b border-[#141724]">
                <span>FILE SIZE</span>
                <strong className="text-white font-mono">{(activeDataset.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#141724]">
                <span>SAMPLING INTERVAL</span>
                <strong className="text-white font-mono">{activeDataset.samplingInterval || '5s'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#141724]">
                <span>START DATE</span>
                <strong className="text-white font-mono">{activeDataset.startDate ? formatDate(activeDataset.startDate) : 'N/A'}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>END DATE</span>
                <strong className="text-white font-mono">{activeDataset.endDate ? formatDate(activeDataset.endDate) : 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Feature Engineering Summary */}
          <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#181B28]">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">ENGINEERED FEATURES</h4>
              <span className="text-[10px] text-[#9D4EDD]">
                {activeDataset.engineeredFeatures?.length || 0} FEATURES
              </span>
            </div>
            {activeDataset.engineeredFeatures?.length ? (
              <div className="h-28 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono text-[#94A3B8]">
                {activeDataset.engineeredFeatures.map((feat) => (
                  <div key={feat} className="bg-[#12141F] border border-[#1E202E] px-2 py-1 rounded flex items-center gap-1.5">
                    <Zap size={10} className="text-[#9D4EDD]" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-28 flex flex-col items-center justify-center text-center text-xs text-[#475569]">
                <Sparkles size={20} className="mb-1 text-[#475569]" />
                <p>Click "Generate Engineered Features" to construct Lags, Rolling Windows & Limits.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Interactive Dataset Preview Table ─────────────────────────── */}
      {activeDataset && (
        <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden font-mono">
          <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#1B1E2B] bg-[#0D0E15] gap-3">
            <div className="flex items-center gap-2">
              <Table size={16} className="text-[#00F2FE]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">DATASET PREVIEW MATRIX</h4>
            </div>

            {/* Type Selector Tabs */}
            <div className="inline-flex items-center gap-1 bg-[#12141F] border border-[#1E202E] p-1 rounded-lg">
              <button
                onClick={() => { setPreviewType('original'); setPreviewPage(1); }}
                className={cn(
                  'px-3 py-1 rounded text-xs font-semibold transition-all',
                  previewType === 'original' ? 'bg-[#3B82F6] text-white' : 'text-[#64748B] hover:text-white'
                )}
              >
                ORIGINAL DATASET
              </button>
              <button
                onClick={() => { setPreviewType('cleaned'); setPreviewPage(1); }}
                disabled={!activeDataset.cleanedFilePath}
                className={cn(
                  'px-3 py-1 rounded text-xs font-semibold transition-all disabled:opacity-40',
                  previewType === 'cleaned' ? 'bg-[#FFB300] text-black font-bold' : 'text-[#64748B] hover:text-white'
                )}
              >
                CLEANED DATASET
              </button>
              <button
                onClick={() => { setPreviewType('engineered'); setPreviewPage(1); }}
                disabled={!activeDataset.engineeredFilePath}
                className={cn(
                  'px-3 py-1 rounded text-xs font-semibold transition-all disabled:opacity-40',
                  previewType === 'engineered' ? 'bg-[#9D4EDD] text-white font-bold' : 'text-[#64748B] hover:text-white'
                )}
              >
                ENGINEERED FEATURES
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#475569]" />
              <input
                type="text"
                placeholder="Search rows..."
                value={previewSearch}
                onChange={(e) => { setPreviewSearch(e.target.value); setPreviewPage(1); }}
                className="h-8 rounded-lg bg-[#12141F] border border-[#1E202E] pl-8 pr-3 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                  {previewData?.columns?.map((col) => (
                    <th key={col} className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#141724] animate-pulse">
                      <td colSpan={previewData?.columns?.length || 7} className="px-3 py-3 h-8 bg-[#0E1019]" />
                    </tr>
                  ))
                ) : !previewData?.rows?.length ? (
                  <tr>
                    <td colSpan={previewData?.columns?.length || 7} className="px-4 py-8 text-center text-[#475569]">
                      NO PREVIEW DATA AVAILABLE FOR '{previewType.toUpperCase()}' TYPE
                    </td>
                  </tr>
                ) : (
                  previewData.rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#141724] hover:bg-[#121522] transition-colors">
                      {previewData.columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-white font-mono whitespace-nowrap tabular-nums">
                          {row[col] !== undefined && row[col] !== null ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {previewData && (
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#181B28] bg-[#0A0B10] text-xs text-[#64748B]">
              <span>SHOWING 100 ROWS PER PAGE (TOTAL: {previewData.pagination.total})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage === 1}
                  className="p-1 rounded bg-[#141724] border border-[#262A3E] disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>PAGE {previewPage} OF {previewData.pagination.totalPages || 1}</span>
                <button
                  onClick={() => setPreviewPage((p) => Math.min(previewData.pagination.totalPages, p + 1))}
                  disabled={previewPage >= previewData.pagination.totalPages}
                  className="p-1 rounded bg-[#141724] border border-[#262A3E] disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Dataset Version History Table ─────────────────────────────── */}
      <div className="rounded-xl border border-[#1B1E2B] bg-[#0B0C12] overflow-hidden font-mono">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1B1E2B] bg-[#0D0E15]">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[#00F2FE]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">DATASET VERSION HISTORY</h4>
          </div>
          <span className="text-[10px] text-[#64748B]">{datasets.length} VERSIONS REGISTERED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#181B28] bg-[#0A0B10] text-[#64748B]">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">VERSION</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">DATASET NAME</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">ROWS</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">STATUS</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider font-bold">UPLOADED</th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider font-bold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#141724] animate-pulse">
                    <td colSpan={6} className="px-4 py-4 h-10 bg-[#0E1019]" />
                  </tr>
                ))
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#475569]">
                    NO DATASETS UPLOADED YET. CLICK "UPLOAD NEW VERSION" TO IMPORT SENSOR DATA.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => {
                  const badge = STATUS_BADGES[ds.status] || STATUS_BADGES['uploaded'];
                  return (
                    <tr key={ds._id} className="border-b border-[#141724] hover:bg-[#121522] transition-colors">
                      <td className="px-4 py-3 font-bold text-white font-mono">
                        <div className="flex items-center gap-2">
                          <span>v{ds.version}</span>
                          {ds.isActive && (
                            <span className="px-2 py-0.5 rounded bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 text-[9px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold font-mono">{ds.datasetName}</td>
                      <td className="px-4 py-3 tabular-nums font-mono text-[#94A3B8]">{ds.rowCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border', badge.bg, badge.text, badge.border)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B] font-mono">{formatDate(ds.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!ds.isActive && (
                            <button
                              onClick={() => handleActivateVersion(ds._id)}
                              className="px-2.5 py-1 rounded bg-[#161926] border border-[#2B324B] text-[10px] font-bold text-[#00F2FE] hover:bg-[#1E2336]"
                            >
                              MAKE ACTIVE
                            </button>
                          )}

                          {/* Downloads */}
                          <a
                            href={datasetsApi.getDownloadUrl(ds._id, 'original')}
                            download
                            className="p-1.5 rounded bg-[#141724] border border-[#262A3E] text-[#94A3B8] hover:text-white"
                            title="Download Original File"
                          >
                            <Download size={12} />
                          </a>

                          <button
                            onClick={() => handleDeleteVersion(ds._id)}
                            className="p-1.5 rounded bg-[#FF1744]/10 border border-[#FF1744]/30 text-[#FF1744] hover:bg-[#FF1744]/20"
                            title="Delete Version"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Upload Drag & Drop Modal ────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-xl rounded-2xl bg-[#0D0E15] border border-[#222536] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B1E2B]">
              <div className="flex items-center gap-2">
                <UploadCloud size={18} className="text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">UPLOAD HISTORICAL DATASET VERSION</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-[#64748B] hover:text-white">✕</button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">DATASET VERSION LABEL (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 2026 High Speed Run"
                  value={datasetNameInput}
                  onChange={(e) => setDatasetNameInput(e.target.value)}
                  className="w-full h-9 rounded-lg bg-[#12141F] border border-[#1E202E] px-3 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2',
                  dragActive
                    ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                    : selectedFile
                    ? 'border-[#00E676] bg-[#00E676]/5'
                    : 'border-[#222536] bg-[#12141F] hover:border-[#3B82F6]'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <>
                    <FileSpreadsheet size={32} className="text-[#00E676]" />
                    <p className="font-bold text-white text-sm">{selectedFile.name}</p>
                    <p className="text-[10px] text-[#64748B]">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={36} className="text-[#3B82F6]" />
                    <p className="font-bold text-white text-sm">Drag & Drop CSV / Excel File Here</p>
                    <p className="text-[11px] text-[#64748B]">Or click to browse files from your disk</p>
                    <div className="mt-2 text-[9px] text-[#475569] bg-[#181A26] px-3 py-1 rounded border border-[#222536]">
                      MAX SIZE: 100 MB · FORMATS: .csv, .xlsx, .xls
                    </div>
                  </>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#64748B]">
                  <span>UPLOADING & VALIDATING...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#181A26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#3B82F6] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-lg border border-[#262A3E] text-xs text-[#94A3B8] hover:text-white"
              >
                CANCEL
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={!selectedFile || uploading}
                className="px-5 py-2 rounded-lg bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] disabled:opacity-40"
              >
                SUBMIT & VALIDATE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
