import { SparePart, SparePartStatus } from '../models/SparePart';
import { Vendor } from '../models/Vendor';
import mongoose from 'mongoose';

// ─── Inventory Service ───────────────────────────────────────────────────────

export class InventoryService {
  async getSparePartsByCompany(companyId: string) {
    return SparePart.find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .populate('supplierId', 'name email phone')
      .sort({ status: 1, name: 1 })
      .lean({ virtuals: true });
  }

  async getLowStockAlerts(companyId: string) {
    return SparePart.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: { $in: [SparePartStatus.LOW_STOCK, SparePartStatus.OUT_OF_STOCK] },
    })
      .lean({ virtuals: true });
  }

  async createSparePart(data: any, companyId: string, userId: string) {
    const part = new SparePart({
      ...data,
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await part.save();
    return part;
  }

  async updateSparePart(partId: string, data: any) {
    const part = await SparePart.findByIdAndUpdate(partId, data, { new: true, runValidators: true });
    if (!part) throw new Error('Spare part not found');
    await part.save(); // Re-run pre-save hook for status recalculation
    return part;
  }

  async adjustStock(partId: string, adjustment: number, reason: string) {
    const part = await SparePart.findById(partId);
    if (!part) throw new Error('Spare part not found');

    part.stockQuantity = Math.max(0, part.stockQuantity + adjustment);
    if (adjustment < 0) part.lastReorderDate = new Date(); // Track reorder if restocking
    await part.save();
    return part;
  }

  async getInventorySummary(companyId: string) {
    const parts = await SparePart.find({
      companyId: new mongoose.Types.ObjectId(companyId),
    }).lean({ virtuals: true });

    const totalValue = parts.reduce((sum, p) => sum + (p.stockQuantity * p.unitCost), 0);
    const totalItems = parts.length;
    const lowStock = parts.filter(p => p.status === SparePartStatus.LOW_STOCK).length;
    const outOfStock = parts.filter(p => p.status === SparePartStatus.OUT_OF_STOCK).length;
    const inStock = parts.filter(p => p.status === SparePartStatus.IN_STOCK).length;

    return { totalItems, totalValue, inStock, lowStock, outOfStock };
  }

  async deleteSparePart(partId: string) {
    const result = await SparePart.findByIdAndDelete(partId);
    if (!result) throw new Error('Spare part not found');
    return result;
  }
}

// ─── Vendor Service ──────────────────────────────────────────────────────────

export class VendorService {
  async getVendorsByCompany(companyId: string) {
    return Vendor.find({ companyId: new mongoose.Types.ObjectId(companyId), isActive: true })
      .populate('linkedMachineIds', 'name machineCode type')
      .sort({ name: 1 })
      .lean();
  }

  async createVendor(data: any, companyId: string, userId: string) {
    const count = await Vendor.countDocuments({ companyId });
    const code = data.code || `VND-${String(count + 1).padStart(4, '0')}`;

    const vendor = new Vendor({
      ...data,
      code,
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await vendor.save();
    return vendor;
  }

  async updateVendor(vendorId: string, data: any) {
    const vendor = await Vendor.findByIdAndUpdate(vendorId, data, { new: true, runValidators: true });
    if (!vendor) throw new Error('Vendor not found');
    return vendor;
  }

  async deleteVendor(vendorId: string) {
    const vendor = await Vendor.findByIdAndUpdate(vendorId, { isActive: false }, { new: true });
    if (!vendor) throw new Error('Vendor not found');
    return vendor;
  }

  async getVendorById(vendorId: string) {
    return Vendor.findById(vendorId)
      .populate('linkedMachineIds', 'name machineCode type status')
      .lean();
  }
}

export const inventoryService = new InventoryService();
export const vendorService = new VendorService();
