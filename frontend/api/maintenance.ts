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
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: { _id: string; name: string; email: string; role: string };
  dueDate: string;
  aiRecommendationCode?: string;
  healthScoreAtCreation?: number;
  rsotAtCreation?: string;
  createdBy: { _id: string; name: string; email: string };
  completedAt?: string;
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

  updateStatus: (id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') =>
    api.patch<ApiResponse<WorkOrder>>(`/maintenance/work-orders/${id}/status`, { status }),
};
