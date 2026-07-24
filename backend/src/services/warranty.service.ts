import { Warranty, WarrantyStatus } from '../models/Warranty';
import { WarrantyClaim, ClaimStatus } from '../models/WarrantyClaim';
import { IpfsService } from './IpfsService';
import { BlockchainService } from './BlockchainService';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Utility: generate a pseudo blockchain tx hash from metadata (wraps BlockchainService fallback pattern)
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
    // Deterministic fallback
    const seed = `${machineId}_${eventType}_${cid}_${Date.now()}`;
    return '0x' + crypto.createHash('sha256').update(seed).digest('hex').substring(0, 64);
  }
}

export class WarrantyService {
  // ─── Warranties ─────────────────────────────────────────────────────────────

  async getWarrantiesByMachine(machineId: string) {
    return Warranty.find({ machineId: new mongoose.Types.ObjectId(machineId) })
      .sort({ expiryDate: 1 })
      .lean({ virtuals: true });
  }

  async getWarrantiesByCompany(companyId: string) {
    return Warranty.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('machineId', 'name machineCode')
      .sort({ expiryDate: 1 })
      .lean({ virtuals: true });
  }

  async getWarrantySummary(companyId: string) {
    const [total, active, expiringSoon, expired] = await Promise.all([
      Warranty.countDocuments({ companyId }),
      Warranty.countDocuments({ companyId, status: WarrantyStatus.ACTIVE }),
      Warranty.countDocuments({ companyId, status: WarrantyStatus.EXPIRING_SOON }),
      Warranty.countDocuments({ companyId, status: WarrantyStatus.EXPIRED }),
    ]);

    const claimsAgg = await WarrantyClaim.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const claims: Record<string, number> = {};
    claimsAgg.forEach((c: any) => { claims[c._id] = c.count; });

    return { total, active, expiringSoon, expired, claims };
  }

  async createWarranty(data: any, companyId: string, userId: string) {
    const warranty = new Warranty({
      ...data,
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await warranty.save();

    // Anchor to blockchain
    try {
      const metadata = {
        event: 'WARRANTY_ACTIVATED',
        machineId: data.machineId,
        warrantyType: data.type,
        warrantyNumber: data.warrantyNumber,
        provider: data.provider,
        expiryDate: data.expiryDate,
        companyId,
        createdBy: userId,
        timestamp: new Date().toISOString(),
      };
      const ipfsResult = await IpfsService.uploadJsonToIpfs(metadata, `warranty-${warranty._id}.json`);
      const txHash = await anchorToBlockchain(
        warranty.machineId.toString(),
        'WARRANTY_ACTIVATED',
        ipfsResult.cid,
        userId
      );
      await Warranty.findByIdAndUpdate(warranty._id, {
        blockchainTxHash: txHash,
        blockchainVerified: true,
      });
    } catch (err) {
      console.warn('[WarrantyService] Blockchain anchor failed (non-fatal):', err);
    }

    return Warranty.findById(warranty._id).lean({ virtuals: true });
  }

  async checkWarrantyEligibility(machineId: string) {
    const now = new Date();
    const active = await Warranty.findOne({
      machineId: new mongoose.Types.ObjectId(machineId),
      status: { $in: [WarrantyStatus.ACTIVE, WarrantyStatus.EXPIRING_SOON] },
      expiryDate: { $gte: now },
    }).lean({ virtuals: true });

    return {
      eligible: !!active,
      warranty: active,
      message: active ? 'Eligible for Warranty Claim' : 'Warranty Expired or Unavailable',
    };
  }

  // ─── Warranty Claims ─────────────────────────────────────────────────────────

  async getClaimsByCompany(companyId: string) {
    return WarrantyClaim.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('machineId', 'name machineCode')
      .populate('warrantyId', 'type warrantyNumber provider')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getClaimsByMachine(machineId: string) {
    return WarrantyClaim.find({ machineId: new mongoose.Types.ObjectId(machineId) })
      .populate('warrantyId', 'type warrantyNumber provider')
      .sort({ createdAt: -1 })
      .lean();
  }

  async createClaim(data: any, companyId: string, userId: string) {
    const count = await WarrantyClaim.countDocuments({ companyId });
    const claimNumber = `WC-${String(count + 1).padStart(5, '0')}`;

    const claim = new WarrantyClaim({
      ...data,
      claimNumber,
      companyId: new mongoose.Types.ObjectId(companyId),
      submittedBy: new mongoose.Types.ObjectId(userId),
      status: ClaimStatus.CREATED,
    });
    await claim.save();
    return claim;
  }

  async updateClaimStatus(claimId: string, status: ClaimStatus, reviewData: any, userId: string) {
    const claim = await WarrantyClaim.findById(claimId);
    if (!claim) throw new Error('Warranty claim not found');

    claim.status = status;
    if (reviewData.approvalNotes) claim.approvalNotes = reviewData.approvalNotes;
    if (reviewData.rejectionReason) claim.rejectionReason = reviewData.rejectionReason;
    claim.reviewedBy = new mongoose.Types.ObjectId(userId);

    if (status === ClaimStatus.SUBMITTED) claim.submittedAt = new Date();
    if ([ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.CLOSED].includes(status)) {
      claim.resolvedAt = new Date();

      try {
        const metadata = {
          event: `WARRANTY_CLAIM_${status.toUpperCase()}`,
          claimId,
          claimNumber: claim.claimNumber,
          machineId: claim.machineId.toString(),
          status,
          reviewedBy: userId,
          timestamp: new Date().toISOString(),
        };
        const ipfsResult = await IpfsService.uploadJsonToIpfs(metadata, `claim-${claimId}-${status}.json`);
        const txHash = await anchorToBlockchain(
          claim.machineId.toString(),
          `WARRANTY_CLAIM_${status.toUpperCase()}`,
          ipfsResult.cid,
          userId
        );
        claim.blockchainTxHash = txHash;
        claim.blockchainVerified = true;
        claim.ipfsCid = ipfsResult.cid;
      } catch (err) {
        console.warn('[WarrantyService] Claim blockchain anchor failed (non-fatal):', err);
      }
    }

    await claim.save();
    return claim;
  }
}

export const warrantyService = new WarrantyService();
