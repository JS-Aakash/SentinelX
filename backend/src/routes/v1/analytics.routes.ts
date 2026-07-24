import { Router, Request, Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { analyticsService } from '../../services/analytics.service';
import { Machine } from '../../models/Machine';
import { WorkOrder } from '../../models/WorkOrder';
import { SparePart } from '../../models/SparePart';
import { Warranty } from '../../models/Warranty';
import { ComponentReplacement } from '../../models/ComponentReplacement';
import { Inspection } from '../../models/Inspection';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);

// ─── Enterprise Analytics ────────────────────────────────────────────────────

router.get('/enterprise', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const dateRange =
      from && to
        ? { from: new Date(from), to: new Date(to) }
        : undefined;
    const data = await analyticsService.getEnterpriseAnalytics(companyId, dateRange);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Asset Timeline ──────────────────────────────────────────────────────────

router.get('/timeline/:machineId', async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getAssetTimeline(req.params.machineId as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CSV Report Export ───────────────────────────────────────────────────────

router.get('/reports/machine-health', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const machines = await Machine.find({ companyId: new mongoose.Types.ObjectId(companyId) }).lean();

    const rows = [
      ['Machine Code', 'Name', 'Type', 'Status', 'Location', 'Department', 'Health Score', 'Created At'],
      ...machines.map((m: any) => [
        m.machineCode,
        m.name,
        m.type,
        m.status,
        m.location || '',
        m.department || '',
        m.lastHealthScore || '',
        new Date(m.createdAt).toLocaleDateString(),
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="machine-health-report.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/maintenance', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const workOrders = await WorkOrder.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('machineId', 'name machineCode')
      .populate('assignedTo', 'name')
      .lean();

    const rows = [
      ['Work Order #', 'Machine', 'Status', 'Priority', 'Assigned To', 'Created At', 'Completed At', 'Actual Cost', 'Blockchain Verified'],
      ...workOrders.map((wo: any) => [
        wo.workOrderNumber || wo._id.toString().slice(-8),
        (wo.machineId as any)?.name || '',
        wo.status,
        wo.priority,
        (wo.assignedTo as any)?.name || '',
        new Date(wo.createdAt).toLocaleDateString(),
        wo.completedAt ? new Date(wo.completedAt).toLocaleDateString() : '',
        wo.cost || '0',
        wo.blockchainVerified ? 'Yes' : 'No',
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="maintenance-report.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/inventory', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const parts = await SparePart.find({ companyId: new mongoose.Types.ObjectId(companyId) }).lean({ virtuals: true });

    const rows = [
      ['Part Number', 'Name', 'Component Type', 'Stock', 'Min Quantity', 'Reorder Level', 'Unit Cost', 'Total Value', 'Status', 'Warehouse Location'],
      ...parts.map((p: any) => [
        p.partNumber,
        p.name,
        p.componentType,
        p.stockQuantity,
        p.minQuantity,
        p.reorderLevel,
        p.unitCost,
        p.stockQuantity * p.unitCost,
        p.status,
        p.warehouseLocation || '',
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/warranty', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const warranties = await Warranty.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('machineId', 'name machineCode')
      .lean({ virtuals: true });

    const rows = [
      ['Machine', 'Warranty Type', 'Warranty Number', 'Provider', 'Start Date', 'Expiry Date', 'Days Remaining', 'Status', 'Blockchain Verified'],
      ...warranties.map((w: any) => [
        (w.machineId as any)?.name || '',
        w.type,
        w.warrantyNumber,
        w.provider,
        new Date(w.startDate).toLocaleDateString(),
        new Date(w.expiryDate).toLocaleDateString(),
        w.daysRemaining || '',
        w.status,
        w.blockchainVerified ? 'Yes' : 'No',
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="warranty-report.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
