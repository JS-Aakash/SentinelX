import mongoose, { Document, Schema } from 'mongoose';

export enum SparePartStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

export interface ISparePart extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  partNumber: string;
  componentType: string;
  description?: string;
  manufacturer?: string;
  supplierId?: mongoose.Types.ObjectId;
  stockQuantity: number;
  reservedQuantity: number;
  minQuantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  warehouseLocation?: string;
  unitCost: number;
  currency: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  expiryDate?: Date;
  status: SparePartStatus;
  compatibleMachineTypes: string[];
  imageUrl?: string;
  notes?: string;
  lastReorderDate?: Date;
  totalValueINR?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SparePartSchema = new Schema<ISparePart>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    partNumber: { type: String, required: true, trim: true, uppercase: true },
    componentType: { type: String, required: true },
    description: { type: String, default: null },
    manufacturer: { type: String, default: null },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    minQuantity: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, required: true, min: 0 },
    reorderQuantity: { type: Number, default: 10 },
    warehouseLocation: { type: String, default: null },
    unitCost: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    purchaseDate: { type: Date, default: null },
    warrantyExpiry: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(SparePartStatus),
      default: SparePartStatus.IN_STOCK,
      index: true,
    },
    compatibleMachineTypes: { type: [String], default: [] },
    imageUrl: { type: String, default: null },
    notes: { type: String, default: null },
    lastReorderDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: available quantity
SparePartSchema.virtual('availableQuantity').get(function () {
  return Math.max(0, this.stockQuantity - this.reservedQuantity);
});

// Virtual: total inventory value
SparePartSchema.virtual('inventoryValue').get(function () {
  return this.stockQuantity * this.unitCost;
});

// Pre-save: auto-update status
SparePartSchema.pre('save', function () {
  if (this.stockQuantity <= 0) this.status = SparePartStatus.OUT_OF_STOCK;
  else if (this.stockQuantity <= this.minQuantity) this.status = SparePartStatus.LOW_STOCK;
  else this.status = SparePartStatus.IN_STOCK;
});

SparePartSchema.index({ companyId: 1, status: 1 });
SparePartSchema.index({ partNumber: 1, companyId: 1 }, { unique: true });

export const SparePart = mongoose.model<ISparePart>('SparePart', SparePartSchema);
