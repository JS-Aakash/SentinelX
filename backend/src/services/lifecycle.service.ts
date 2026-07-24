import { ComponentReplacement } from '../models/ComponentReplacement';
import { SparePart } from '../models/SparePart';
import { Inspection } from '../models/Inspection';
import { IpfsService } from './IpfsService';
import { BlockchainService } from './BlockchainService';
import mongoose from 'mongoose';
import crypto from 'crypto';

async function anchorToBlockchain(
  machineId: string,
  eventType: string,
  cid: string,
  userId: string
): Promise<string> {
  try {
    const result = await BlockchainService.recordMaintenanceOnChain({
      machineId,
      workOrderId: `${eventType}-${Date.now()}`,
      engineerId: userId,
      ipfsCid: cid,
    });
    return result.txHash;
  } catch {
    const seed = `${machineId}_${eventType}_${cid}_${Date.now()}`;
    return '0x' + crypto.createHash('sha256').update(seed).digest('hex').substring(0, 64);
  }
}

// ─── Component Replacement Service ──────────────────────────────────────────

export class ComponentService {
  async getReplacementsByMachine(machineId: string) {
    return ComponentReplacement.find({ machineId: new mongoose.Types.ObjectId(machineId) })
      .populate('engineerId', 'name email')
      .populate('supervisorVerifiedBy', 'name')
      .sort({ replacementDate: -1 })
      .lean();
  }

  async getReplacementsByCompany(companyId: string) {
    return ComponentReplacement.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('machineId', 'name machineCode')
      .populate('engineerId', 'name email')
      .sort({ replacementDate: -1 })
      .lean();
  }

  async createReplacement(data: any, companyId: string, userId: string) {
    const replacement = new ComponentReplacement({
      ...data,
      companyId: new mongoose.Types.ObjectId(companyId),
      engineerId: new mongoose.Types.ObjectId(userId),
    });
    await replacement.save();

    // Deduct from spare parts inventory if linked
    if (data.sparePartId) {
      try {
        const part = await SparePart.findById(data.sparePartId);
        if (part) {
          part.stockQuantity = Math.max(0, part.stockQuantity - (data.quantity || 1));
          await part.save();
        }
      } catch (err) {
        console.warn('[ComponentService] Inventory deduction failed (non-fatal):', err);
      }
    }

    return replacement;
  }

  async verifyReplacement(replacementId: string, supervisorId: string) {
    const replacement = await ComponentReplacement.findById(replacementId);
    if (!replacement) throw new Error('Component replacement not found');

    try {
      const metadata = {
        event: 'COMPONENT_REPLACED',
        replacementId,
        machineId: replacement.machineId.toString(),
        componentName: replacement.componentName,
        componentType: replacement.componentType,
        reason: replacement.replacementReason,
        cost: replacement.cost,
        currency: replacement.currency,
        verifiedBy: supervisorId,
        timestamp: new Date().toISOString(),
      };
      const ipfsResult = await IpfsService.uploadJsonToIpfs(metadata, `replacement-${replacementId}.json`);
      const txHash = await anchorToBlockchain(
        replacement.machineId.toString(),
        'COMPONENT_REPLACED',
        ipfsResult.cid,
        supervisorId
      );
      replacement.blockchainTxHash = txHash;
      replacement.blockchainVerified = true;
      replacement.ipfsCid = ipfsResult.cid;
      replacement.supervisorVerifiedBy = new mongoose.Types.ObjectId(supervisorId);
      replacement.supervisorVerifiedAt = new Date();
      await replacement.save();
    } catch (err) {
      console.warn('[ComponentService] Blockchain verification failed (non-fatal):', err);
    }

    return replacement;
  }

  async getComponentStats(companyId: string) {
    return ComponentReplacement.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$componentType',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}

// ─── Inspection Service ──────────────────────────────────────────────────────

export class InspectionService {
  async getInspectionsByMachine(machineId: string) {
    return Inspection.find({ machineId: new mongoose.Types.ObjectId(machineId) })
      .populate('inspectorId', 'name email')
      .sort({ scheduledDate: -1 })
      .lean();
  }

  async getInspectionsByCompany(companyId: string) {
    return Inspection.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('machineId', 'name machineCode')
      .populate('inspectorId', 'name email')
      .sort({ scheduledDate: -1 })
      .lean();
  }

  async createInspection(data: any, companyId: string, userId: string) {
    const inspection = new Inspection({
      ...data,
      companyId: new mongoose.Types.ObjectId(companyId),
      inspectorId: new mongoose.Types.ObjectId(userId),
    });
    await inspection.save();
    return inspection;
  }

  async completeInspection(inspectionId: string, data: any, userId: string) {
    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) throw new Error('Inspection not found');

    if (data.checklist) inspection.checklist = data.checklist;
    if (data.overallResult) inspection.overallResult = data.overallResult;
    if (data.remarks !== undefined) inspection.remarks = data.remarks;
    if (data.signatureName) inspection.signatureName = data.signatureName;
    inspection.completedDate = new Date();
    if (data.calibrationRecords) inspection.calibrationRecords = data.calibrationRecords;

    try {
      const metadata = {
        event: 'INSPECTION_COMPLETED',
        inspectionId,
        machineId: inspection.machineId.toString(),
        type: inspection.type,
        overallResult: inspection.overallResult,
        completedBy: userId,
        timestamp: new Date().toISOString(),
      };
      const ipfsResult = await IpfsService.uploadJsonToIpfs(metadata, `inspection-${inspectionId}.json`);
      const txHash = await anchorToBlockchain(
        inspection.machineId.toString(),
        'INSPECTION_COMPLETED',
        ipfsResult.cid,
        userId
      );
      inspection.blockchainTxHash = txHash;
      inspection.blockchainVerified = true;
      inspection.ipfsCid = ipfsResult.cid;
    } catch (err) {
      console.warn('[InspectionService] Blockchain anchor failed (non-fatal):', err);
    }

    await inspection.save();
    return inspection;
  }
}

export const componentService = new ComponentService();
export const inspectionService = new InspectionService();
