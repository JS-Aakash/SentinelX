import { Machine } from '../models/Machine';
import { WorkOrder } from '../models/WorkOrder';
import { ComponentReplacement } from '../models/ComponentReplacement';
import { Warranty } from '../models/Warranty';
import { WarrantyClaim } from '../models/WarrantyClaim';
import { SparePart } from '../models/SparePart';
import { Inspection } from '../models/Inspection';
import { User } from '../models/User';
import { AnomalyEvent } from '../models/AnomalyEvent';
import mongoose from 'mongoose';

export class AnalyticsService {
  async getEnterpriseAnalytics(companyId: string, dateRange?: { from: Date; to: Date }) {
    const cid = new mongoose.Types.ObjectId(companyId);
    const dateFilter = dateRange
      ? { createdAt: { $gte: dateRange.from, $lte: dateRange.to } }
      : {};

    const [
      machines,
      workOrders,
      components,
      warranties,
      claims,
      spareParts,
      inspections,
      anomalies,
    ] = await Promise.all([
      Machine.find({ companyId: cid }).lean(),
      WorkOrder.find({ companyId: cid, ...dateFilter }).lean(),
      ComponentReplacement.find({ companyId: cid, ...dateFilter }).lean(),
      Warranty.find({ companyId: cid }).lean({ virtuals: true }),
      WarrantyClaim.find({ companyId: cid, ...dateFilter }).lean(),
      SparePart.find({ companyId: cid }).lean({ virtuals: true }),
      Inspection.find({ companyId: cid, ...dateFilter }).lean(),
      AnomalyEvent.find({ companyId: cid, ...dateFilter }).lean(),
    ]);

    // ─── Machine Analytics ───────────────────────────────────────────────────
    const machineHealthGroups = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
    machines.forEach((m: any) => {
      let score: number | null = m.lastHealthScore ?? m.healthScore ?? null;
      
      if (score === null || score === undefined || score === 0) {
        if (m.status === 'offline' || m.status === 'degraded') {
          score = 65;
        } else if (m.status === 'critical' || m.status === 'maintenance') {
          score = 40;
        } else {
          const hasAnomaly = anomalies.some((a: any) => a.machineId?.toString() === m._id?.toString() && !a.resolved);
          score = hasAnomaly ? 60 : 92;
        }
      }

      if (score >= 80) machineHealthGroups.healthy++;
      else if (score >= 50) machineHealthGroups.warning++;
      else if (score > 0) machineHealthGroups.critical++;
      else machineHealthGroups.unknown++;
    });

    // ─── Maintenance Analytics ───────────────────────────────────────────────
    const completedWOs = workOrders.filter((wo: any) => wo.completedAt && wo.createdAt);
    const totalRepairTimeHours = completedWOs.reduce((sum: number, wo: any) => {
      const diff = new Date(wo.completedAt).getTime() - new Date(wo.createdAt).getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);
    const mttr = completedWOs.length > 0 ? totalRepairTimeHours / completedWOs.length : 0;

    // MTBF: total operating hours / number of failures
    const totalOperatingHours = machines.length * 8760; // estimated annual hours per machine
    const failureCount = workOrders.filter((wo: any) => wo.priority === 'urgent' || wo.type === 'emergency').length;
    const mtbf = failureCount > 0 ? totalOperatingHours / failureCount : 0;

    const totalDowntimeHours = workOrders.reduce((sum: number, wo: any) => sum + (wo.downtimeHours || 0), 0);

    const totalMaintenanceCost = workOrders.reduce((sum: number, wo: any) => sum + (wo.cost || 0), 0);

    // Cost per machine
    const costPerMachine: Record<string, number> = {};
    workOrders.forEach((wo: any) => {
      const mid = wo.machineId?.toString();
      if (mid) costPerMachine[mid] = (costPerMachine[mid] || 0) + (wo.cost || 0);
    });

    // ─── Engineer Analytics ──────────────────────────────────────────────────
    const engineerStats: Record<string, { completed: number; totalTime: number; verified: number }> = {};
    completedWOs.forEach((wo: any) => {
      const eid = wo.assignedTo?.toString();
      if (!eid) return;
      if (!engineerStats[eid]) engineerStats[eid] = { completed: 0, totalTime: 0, verified: 0 };
      engineerStats[eid].completed++;
      const diff = new Date(wo.completedAt).getTime() - new Date(wo.createdAt).getTime();
      engineerStats[eid].totalTime += diff / (1000 * 60 * 60);
      if (wo.blockchainVerified) engineerStats[eid].verified++;
    });

    // ─── Inventory Analytics ─────────────────────────────────────────────────
    const componentStats: Record<string, number> = {};
    components.forEach((c: any) => {
      componentStats[c.componentType] = (componentStats[c.componentType] || 0) + 1;
    });
    const mostReplacedComponents = Object.entries(componentStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const totalInventoryValue = spareParts.reduce(
      (sum: number, p: any) => sum + (p.stockQuantity * p.unitCost),
      0
    );
    const componentSavingsFromWarranty = claims
      .filter((c: any) => c.status === 'approved')
      .reduce((sum: number, c: any) => sum + (c.claimedAmount || 0), 0);

    // ─── Warranty Analytics ──────────────────────────────────────────────────
    const warrantyAnalytics = {
      total: warranties.length,
      active: warranties.filter((w: any) => w.status === 'active').length,
      expiringSoon: warranties.filter((w: any) => w.status === 'expiring_soon').length,
      expired: warranties.filter((w: any) => w.status === 'expired').length,
      claimsSubmitted: claims.length,
      claimsApproved: claims.filter((c: any) => c.status === 'approved').length,
      claimsRejected: claims.filter((c: any) => c.status === 'rejected').length,
      warrantySavings: componentSavingsFromWarranty,
    };

    // ─── Factory Analytics ───────────────────────────────────────────────────
    const totalMachines = machines.length;
    const activeMachines = machines.filter((m: any) => m.status === 'active').length;
    const machineAvailability = totalMachines > 0 ? (activeMachines / totalMachines) * 100 : 0;
    const criticalMachines = machines.filter((m: any) => {
      const score = m.lastHealthScore || m.healthScore || 0;
      return score > 0 && score < 50;
    }).length;

    // Inspection pass rate
    const completedInspections = inspections.filter((i: any) => i.completedDate);
    const passedInspections = completedInspections.filter((i: any) => i.overallResult === 'pass').length;
    const inspectionPassRate = completedInspections.length > 0
      ? (passedInspections / completedInspections.length) * 100
      : 0;

    // Anomaly trend (last 7 days)
    const anomalyTrend: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      anomalyTrend[key] = 0;
    }
    anomalies.forEach((a: any) => {
      const key = new Date(a.createdAt).toISOString().split('T')[0];
      if (anomalyTrend[key] !== undefined) anomalyTrend[key]++;
    });

    return {
      machines: {
        total: totalMachines,
        healthDistribution: machineHealthGroups,
        availability: machineAvailability,
        critical: criticalMachines,
      },
      maintenance: {
        totalWorkOrders: workOrders.length,
        completed: completedWOs.length,
        mttr: Math.round(mttr * 10) / 10,
        mtbf: Math.round(mtbf * 10) / 10,
        totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10,
        totalCost: totalMaintenanceCost,
        costPerMachine,
      },
      engineers: {
        stats: engineerStats,
      },
      inventory: {
        totalItems: spareParts.length,
        totalValue: totalInventoryValue,
        mostReplacedComponents,
        lowStockCount: spareParts.filter((p: any) => p.status === 'low_stock').length,
        outOfStockCount: spareParts.filter((p: any) => p.status === 'out_of_stock').length,
      },
      warranty: warrantyAnalytics,
      factory: {
        machineAvailability: Math.round(machineAvailability * 10) / 10,
        criticalMachines,
        inspectionPassRate: Math.round(inspectionPassRate * 10) / 10,
        anomalyTrend,
      },
    };
  }

  // ─── Full Asset Timeline ─────────────────────────────────────────────────────
  async getAssetTimeline(machineId: string) {
    if (!machineId || machineId === 'undefined' || !mongoose.Types.ObjectId.isValid(machineId)) {
      return { timeline: [] };
    }
    const mid = new mongoose.Types.ObjectId(machineId);

    const [machine, workOrders, components, warranties, claims, inspections, anomalies] =
      await Promise.all([
        Machine.findById(mid).lean(),
        WorkOrder.find({ machineId: mid }).populate('assignedTo', 'name').sort({ createdAt: 1 }).lean(),
        ComponentReplacement.find({ machineId: mid }).populate('engineerId', 'name').sort({ replacementDate: 1 }).lean(),
        Warranty.find({ machineId: mid }).sort({ startDate: 1 }).lean({ virtuals: true }),
        WarrantyClaim.find({ machineId: mid }).sort({ createdAt: 1 }).lean(),
        Inspection.find({ machineId: mid }).populate('inspectorId', 'name').sort({ scheduledDate: 1 }).lean(),
        AnomalyEvent.find({ machineId: mid }).sort({ createdAt: 1 }).lean(),
      ]);

    if (!machine) return { timeline: [] };

    const timeline: any[] = [];

    // Machine registration
    timeline.push({
      type: 'MACHINE_REGISTERED',
      timestamp: (machine as any).createdAt,
      title: 'Machine Registered',
      description: `${(machine as any).name} (${(machine as any).machineCode}) registered in SentinelX`,
      icon: 'cpu',
      severity: 'info',
    });

    if ((machine as any).installationDate) {
      timeline.push({
        type: 'MACHINE_INSTALLED',
        timestamp: (machine as any).installationDate,
        title: 'Machine Installed',
        description: `Installed at ${(machine as any).location || (machine as any).plant || 'facility'}`,
        icon: 'package',
        severity: 'info',
      });
    }

    if ((machine as any).commissioningDate) {
      timeline.push({
        type: 'MACHINE_COMMISSIONED',
        timestamp: (machine as any).commissioningDate,
        title: 'Machine Commissioned',
        description: 'Machine commissioned and operational',
        icon: 'check-circle',
        severity: 'success',
      });
    }

    // Work orders
    workOrders.forEach((wo: any) => {
      timeline.push({
        type: 'MAINTENANCE',
        timestamp: wo.createdAt,
        title: `Work Order: ${wo.workOrderNumber || wo._id.toString().slice(-6)}`,
        description: wo.description,
        status: wo.status,
        assignedTo: (wo.assignedTo as any)?.name,
        blockchainTxHash: wo.blockchainTxHash,
        icon: 'wrench',
        severity: wo.priority === 'critical' ? 'critical' : 'warning',
        data: wo,
      });
    });

    // Component replacements
    components.forEach((c: any) => {
      timeline.push({
        type: 'COMPONENT_REPLACED',
        timestamp: c.replacementDate,
        title: `${c.componentName} Replaced`,
        description: `${c.componentType} replaced — Reason: ${c.replacementReason}`,
        engineer: (c.engineerId as any)?.name,
        cost: c.cost,
        blockchainTxHash: c.blockchainTxHash,
        blockchainVerified: c.blockchainVerified,
        icon: 'refresh-cw',
        severity: 'info',
        data: c,
      });
    });

    // Warranties
    warranties.forEach((w: any) => {
      timeline.push({
        type: 'WARRANTY_ACTIVATED',
        timestamp: w.createdAt,
        title: `${w.type.toUpperCase()} Warranty Activated`,
        description: `Warranty by ${w.provider} — Expires ${new Date(w.expiryDate).toLocaleDateString()}`,
        blockchainTxHash: w.blockchainTxHash,
        icon: 'shield',
        severity: 'info',
        data: w,
      });
    });

    // Warranty claims
    claims.forEach((c: any) => {
      timeline.push({
        type: 'WARRANTY_CLAIM',
        timestamp: c.createdAt,
        title: `Warranty Claim ${c.claimNumber}`,
        description: c.problem,
        status: c.status,
        blockchainTxHash: c.blockchainTxHash,
        icon: 'file-text',
        severity: c.status === 'approved' ? 'success' : c.status === 'rejected' ? 'critical' : 'warning',
        data: c,
      });
    });

    // Inspections
    inspections.forEach((i: any) => {
      if (i.completedDate) {
        timeline.push({
          type: 'INSPECTION_COMPLETED',
          timestamp: i.completedDate,
          title: `${i.type.charAt(0).toUpperCase() + i.type.slice(1)} Inspection`,
          description: `${i.overallResult.toUpperCase()} — Inspector: ${(i.inspectorId as any)?.name || 'Unknown'}`,
          blockchainTxHash: i.blockchainTxHash,
          blockchainVerified: i.blockchainVerified,
          icon: 'clipboard-check',
          severity: i.overallResult === 'pass' ? 'success' : i.overallResult === 'warning' ? 'warning' : 'critical',
          data: i,
        });
      }
    });

    // Anomalies (critical only)
    anomalies
      .filter((a: any) => ['Critical', 'Emergency'].includes(a.severity) || a.anomalyScore > 0.8)
      .slice(-10)
      .forEach((a: any) => {
        timeline.push({
          type: 'ANOMALY_DETECTED',
          timestamp: a.timestamp || a.createdAt,
          title: `${a.severity} Anomaly Detected`,
          description: a.primaryCause || `AI detected anomaly (score: ${a.anomalyScore?.toFixed(2)})`,
          icon: 'alert-triangle',
          severity: 'critical',
          data: a,
        });
      });

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { machine, timeline };
  }
}

export const analyticsService = new AnalyticsService();
