import mongoose from 'mongoose';
import { Machine } from '../models/Machine';
import { WorkOrder, IWorkOrder, WorkOrderStatus } from '../models/WorkOrder';
import { PredictionHistory } from '../models/PredictionHistory';
import { ApiError } from '../utils/ApiError';

export class MaintenanceService {
  /**
   * Get overall Predictive Maintenance dashboard overview for company
   */
  public static async getOverview(companyId: string) {
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // 1. Get all machines for company
    const machines = await Machine.find({ companyId: companyObjectId }).exec();
    const totalMachines = machines.length;

    // 2. Fetch latest AI predictions & health scores per machine
    const machineIds = machines.map((m) => m._id);

    const latestPredictions = await PredictionHistory.aggregate([
      { $match: { machineId: { $in: machineIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$machineId',
          latestPrediction: { $first: '$$ROOT' },
        },
      },
    ]);

    const predMap = new Map<string, any>();
    latestPredictions.forEach((p) => {
      predMap.set(p._id.toString(), p.latestPrediction);
    });

    let highRiskCount = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let totalHealthScore = 0;
    const fleetInsights: any[] = [];

    machines.forEach((m) => {
      const pred = predMap.get(m._id.toString());
      const healthScore = pred?.healthScore ?? (m.status === 'fault' ? 30 : m.status === 'maintenance' ? 60 : 92);
      totalHealthScore += healthScore;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (healthScore < 50 || pred?.isAnomaly) {
        riskLevel = 'critical';
        criticalCount++;
        highRiskCount++;
      } else if (healthScore < 75) {
        riskLevel = 'medium';
        warningCount++;
      }

      const remHrs = pred?.remainingOperatingHours != null ? pred.remainingOperatingHours : 2450;
      const rsot = `${remHrs.toLocaleString()} operating hrs`;

      fleetInsights.push({
        machineId: m._id,
        machineCode: m.machineCode,
        name: m.name,
        type: m.type,
        plant: m.plant,
        department: m.department,
        status: m.status,
        healthScore,
        healthStatus: pred?.healthStatus || (healthScore < 50 ? 'Critical' : healthScore < 75 ? 'Warning' : 'Good'),
        riskLevel,
        rsot,
        isAnomaly: Boolean(pred?.isAnomaly),
        recommendations: pred?.recommendations || [],
        lastChecked: pred?.timestamp || m.updatedAt,
      });
    });

    // Sort fleet insights by risk priority (critical first, then lowest health score)
    fleetInsights.sort((a, b) => a.healthScore - b.healthScore);

    const avgFleetHealth = totalMachines > 0 ? Math.round(totalHealthScore / totalMachines) : 100;

    // 3. Work Orders metrics
    const pendingWO = await WorkOrder.countDocuments({ companyId: companyObjectId, status: WorkOrderStatus.PENDING });
    const inProgressWO = await WorkOrder.countDocuments({ companyId: companyObjectId, status: WorkOrderStatus.IN_PROGRESS });
    const completedWO = await WorkOrder.countDocuments({ companyId: companyObjectId, status: WorkOrderStatus.COMPLETED });

    return {
      metrics: {
        totalMachines,
        avgFleetHealth,
        highRiskCount,
        criticalCount,
        warningCount,
        workOrders: {
          pending: pendingWO,
          inProgress: inProgressWO,
          completed: completedWO,
          total: pendingWO + inProgressWO + completedWO,
        },
      },
      fleetInsights,
    };
  }

  /**
   * Get work orders list with filter & pagination
   */
  public static async getWorkOrders(companyId: string, query: Record<string, any>) {
    const { status, priority, type, machineId, page = 1, limit = 20 } = query;
    const filter: any = { companyId: new mongoose.Types.ObjectId(companyId) };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (machineId) filter.machineId = new mongoose.Types.ObjectId(machineId);

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [workOrders, total] = await Promise.all([
      WorkOrder.find(filter)
        .populate('machineId', 'name machineCode type plant department')
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .exec(),
      WorkOrder.countDocuments(filter),
    ]);

    return {
      workOrders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Create a new work order
   */
  public static async createWorkOrder(companyId: string, userId: string, payload: any): Promise<IWorkOrder> {
    const { machineId, title, description, type, priority, assignedTo, dueDate, aiRecommendationCode, healthScoreAtCreation, rsotAtCreation } = payload;

    const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }

    const count = await WorkOrder.countDocuments({ companyId });
    const workOrderNumber = `WO-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const workOrder = await WorkOrder.create({
      workOrderNumber,
      machineId: machine._id,
      companyId: new mongoose.Types.ObjectId(companyId),
      title,
      description,
      type: type || 'predictive',
      priority: priority || 'medium',
      status: WorkOrderStatus.PENDING,
      assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
      dueDate: new Date(dueDate),
      aiRecommendationCode,
      healthScoreAtCreation,
      rsotAtCreation,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return workOrder.populate([
      { path: 'machineId', select: 'name machineCode type plant department' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'createdBy', select: 'name email' },
    ]);
  }

  /**
   * Update work order status
   */
  public static async updateWorkOrderStatus(companyId: string, workOrderId: string, status: WorkOrderStatus): Promise<IWorkOrder> {
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, companyId }).exec();
    if (!workOrder) {
      throw ApiError.notFound('Work Order not found');
    }

    workOrder.status = status;
    if (status === WorkOrderStatus.COMPLETED) {
      workOrder.completedAt = new Date();
    }

    await workOrder.save();
    return workOrder.populate([
      { path: 'machineId', select: 'name machineCode type plant department' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'createdBy', select: 'name email' },
    ]);
  }
}
