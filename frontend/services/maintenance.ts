import api from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface FleetInsight {
  machineId: string;
  machineCode: string;
  name: string;
  type: string;
  plant?: string;
  department?: string;
  status: string;
  healthScore: number;
  healthStatus: 'Excellent' | 'Good' | 'Warning' | 'Critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rsot: string;
  isAnomaly: boolean;
  recommendations: Array<{
    code: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    action: string;
  }>;
  lastChecked: string;
}

export interface MaintenanceOverview {
  metrics: {
    totalMachines: number;
    avgFleetHealth: number;
    highRiskCount: number;
    criticalCount: number;
    warningCount: number;
    workOrders: {
      pending: number;
      inProgress: number;
      completed: number;
      total: number;
    };
  };
  fleetInsights: FleetInsight[];
}

export interface EvidenceFile {
  name: string;
  url: string;
  ipfsCid: string;
  fileType: string;
  uploadedAt: string;
}

export interface WorkOrder {
  _id: string;
  id: string;
  workOrderNumber: string;
  machineId: {
    _id: string;
    name: string;
    machineCode: string;
    type: string;
    plant?: string;
    department?: string;
  };
  title: string;
  description: string;
  type: 'predictive' | 'preventive' | 'corrective' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'closed' | 'cancelled';
  assignedTo?: { _id: string; name: string; email: string; role: string };
  dueDate: string;
  estimatedDurationHours?: number;
  downtimeHours?: number;
  cost?: number;
  problem?: string;
  diagnosis?: string;
  rootCause?: string;
  actionTaken?: string;
  partsReplaced?: string[];
  remarks?: string;
  nextInspectionDate?: string;
  evidenceFiles?: EvidenceFile[];
  ipfsCid?: string;
  blockchainTxHash?: string;
  blockchainBlockNumber?: number;
  blockchainVerified?: boolean;
  blockchainVerifiedAt?: string;
  verifierWallet?: string;
  healthScoreBefore?: number;
  healthScoreAfter?: number;
  aiRecommendationCode?: string;
  healthScoreAtCreation?: number;
  rsotAtCreation?: string;
  createdBy: { _id: string; name: string; email: string };
  completedAt?: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  _id: string;
  machineId: { _id: string; name: string; machineCode: string; type: string; plant?: string };
  workOrderId?: string;
  activityType: string;
  title: string;
  description: string;
  engineerId: { _id: string; name: string; email: string; role: string };
  engineerName: string;
  cost: number;
  durationHours: number;
  downtimeHours: number;
  healthScoreBefore: number;
  healthScoreAfter: number;
  partsReplaced: string[];
  ipfsCid: string;
  blockchainTxHash: string;
  blockchainBlockNumber?: number;
  blockchainVerified: boolean;
  etherscanUrl: string;
  evidenceFiles?: EvidenceFile[];
  completedAt: string;
  createdAt: string;
}

export const maintenanceApi = {
  getOverview: () =>
    api.get<ApiResponse<MaintenanceOverview>>('/maintenance/overview'),

  getWorkOrders: (params?: Record<string, any>) =>
    api.get<ApiResponse<{ workOrders: WorkOrder[]; total: number; totalPages: number }>>('/maintenance/work-orders', { params }),

  createWorkOrder: (payload: {
    machineId: string;
    title: string;
    description: string;
    type?: string;
    priority?: string;
    dueDate: string;
    aiRecommendationCode?: string;
    healthScoreAtCreation?: number;
    rsotAtCreation?: string;
  }) => api.post<ApiResponse<WorkOrder>>('/maintenance/work-orders', payload),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<WorkOrder>>(`/maintenance/work-orders/${id}/status`, { status }),

  completeWorkOrder: (id: string, formData: FormData) =>
    api.post<ApiResponse<WorkOrder>>(`/maintenance/work-orders/${id}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  verifyWorkOrder: (id: string) =>
    api.post<ApiResponse<WorkOrder>>(`/maintenance/work-orders/${id}/verify`),

  getBlockchainLogs: () =>
    api.get<ApiResponse<MaintenanceRecord[]>>('/maintenance/blockchain/explorer'),

  getTimeline: (machineId: string) =>
    api.get<ApiResponse<MaintenanceRecord[]>>(`/maintenance/timeline/${machineId}`),
};
