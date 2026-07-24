'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  Box, UploadCloud, CheckCircle2, Trash2, RefreshCw, Eye,
  FileCode, Layers, Info, AlertTriangle, HardDrive, Calendar, User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { Machine, DigitalTwin } from '@/types';
import { machinesApi } from '@/api/machines';
import { DigitalTwinViewerModal } from './DigitalTwinViewerModal';

interface DigitalTwinCardProps {
  machine: Machine;
  canWrite: boolean;
  onUpdate: () => void;
}

export function DigitalTwinCard({ machine, canWrite, onUpdate }: DigitalTwinCardProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const digitalTwin: DigitalTwin = machine.digitalTwin || {
    hasModel: false,
    version: 1,
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['glb', 'gltf', 'fbx', 'obj'];

    if (!ext || !allowed.includes(ext)) {
      setError(`Invalid format .${ext}. Allowed formats: GLB, GLTF, FBX, OBJ`);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 100 MB limit.`);
      return;
    }

    setUploading(true);
    try {
      if (digitalTwin.hasModel) {
        await machinesApi.replaceDigitalTwin(machine._id, file);
      } else {
        await machinesApi.uploadDigitalTwin(machine._id, file);
      }
      onUpdate();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload 3D model.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this 3D model?')) return;
    setDeleting(true);
    setError(null);
    try {
      await machinesApi.deleteDigitalTwin(machine._id);
      onUpdate();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete 3D model.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 0.1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  const uploadedByName = typeof digitalTwin.uploadedBy === 'object' && digitalTwin.uploadedBy
    ? digitalTwin.uploadedBy.name
    : 'System Administrator';

  return (
    <>
      <div className="space-y-4 animate-fade-in">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Box size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Machine Digital Twin</h3>
                {digitalTwin.hasModel && (
                  <span className="text-[10px] font-mono font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full">
                    v{digitalTwin.version || 1} Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[oklch(0.50_0.01_240)] mt-0.5">
                Upload a 3D model of this machine for visualization in the Digital Twin dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[oklch(0.50_0.01_240)] font-mono">
              Max Size: <strong className="text-white">100 MB</strong>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── NO MODEL STATE: Drag & Drop Zone ───────────────────────────── */}
        {!digitalTwin.hasModel ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]'
                : 'border-[oklch(0.24_0.01_240)] bg-[oklch(0.11_0.006_240)] hover:border-cyan-500/40 hover:bg-[oklch(0.13_0.007_240)]'
            }`}
            onClick={() => canWrite && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.fbx,.obj"
              onChange={handleInputChange}
              className="hidden"
              disabled={!canWrite || uploading}
            />

            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1B1D2A] border border-[#2A2D3E] flex items-center justify-center text-cyan-400 shadow-xl group-hover:scale-110 transition-transform">
                {uploading ? (
                  <RefreshCw size={24} className="animate-spin text-cyan-400" />
                ) : (
                  <UploadCloud size={28} />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  {uploading ? 'Uploading 3D Model...' : 'Drag & Drop your 3D Model here'}
                </p>
                <p className="text-xs text-cyan-400 hover:underline mt-1 font-medium cursor-pointer">
                  or Browse Files
                </p>
              </div>

              <div className="pt-2 border-t border-[#1B1D2A] w-full max-w-sm">
                <p className="text-[11px] font-mono text-[#64748B]">
                  Accepted Formats: <span className="text-[#94A3B8] font-semibold">GLB • GLTF • FBX • OBJ</span>
                </p>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  (.glb recommended for optimal web performance)
                </p>
              </div>

              {canWrite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  <UploadCloud size={15} />
                  {uploading ? 'Processing File...' : 'Upload Model'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ─── AFTER UPLOAD STATE: Model Metadata & Action Buttons ────────── */
          <div className="space-y-4">
            {/* Success Banner */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span className="font-bold">✓ Model Uploaded Successfully</span>
              </div>
              <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-300">
                Ready for Digital Twin Visualization
              </span>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-[oklch(0.10_0.006_240)] border border-[oklch(0.20_0.01_240)] p-4 rounded-xl">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#64748B] block">File Name</span>
                <p className="text-xs font-medium text-white truncate" title={digitalTwin.modelName || ''}>
                  {digitalTwin.modelName || '3d_model'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#64748B] block">File Size</span>
                <p className="text-xs font-mono text-cyan-400 font-semibold">
                  {formatFileSize(digitalTwin.modelSize)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#64748B] block">Format</span>
                <p className="text-xs font-mono font-bold text-purple-400">
                  {digitalTwin.modelFormat || 'GLB'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#64748B] block">Version</span>
                <p className="text-xs font-mono font-semibold text-emerald-400">
                  v{digitalTwin.version || 1}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#64748B] block">Upload Date</span>
                <p className="text-xs text-[#94A3B8]">
                  {digitalTwin.uploadedAt ? new Date(digitalTwin.uploadedAt).toLocaleDateString() : '—'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#64748B] block">Uploaded By</span>
                <p className="text-xs text-[#94A3B8] truncate" title={uploadedByName}>
                  {uploadedByName}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowViewer(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Eye size={15} /> View 3D Model
              </button>

              {canWrite && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf,.fbx,.obj"
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B1D2A] border border-[#2A2D3E] hover:border-cyan-500/50 text-[#94A3B8] hover:text-white text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={uploading ? 'animate-spin' : ''} />
                    {uploading ? 'Replacing...' : 'Replace Model'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deleting ? 'Deleting...' : 'Delete Model'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── 3D Viewer Modal ──────────────────────────────────────────────── */}
      <DigitalTwinViewerModal
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        machineName={machine.name}
        machineCode={machine.machineCode}
        digitalTwin={digitalTwin}
      />
    </>
  );
}
