import mongoose, { Document, Schema } from 'mongoose';

export enum WarrantyType {
  MANUFACTURER = 'manufacturer',
  SUPPLIER = 'supplier',
  EXTENDED = 'extended',
  AMC = 'amc',
}

export enum WarrantyStatus {
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  VOIDED = 'voided',
}

export interface IWarrantyDocument {
  name: string;
  ipfsCid: string;
  ipfsUrl: string;
  uploadedAt: Date;
}

export interface IWarranty extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  type: WarrantyType;
  warrantyNumber: string;
  provider: string;
  startDate: Date;
  expiryDate: Date;
  coverage: string;
  terms?: string;
  contactEmail?: string;
  contactPhone?: string;
  documents: IWarrantyDocument[];
  status: WarrantyStatus;
  blockchainTxHash?: string;
  blockchainVerified?: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WarrantySchema = new Schema<IWarranty>(
  {
    machineId: { type: Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: { type: String, enum: Object.values(WarrantyType), required: true },
    warrantyNumber: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    coverage: { type: String, required: true },
    terms: { type: String, default: null },
    contactEmail: { type: String, default: null },
    contactPhone: { type: String, default: null },
    documents: [
      {
        name: { type: String },
        ipfsCid: { type: String },
        ipfsUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: Object.values(WarrantyStatus),
      default: WarrantyStatus.ACTIVE,
      index: true,
    },
    blockchainTxHash: { type: String, default: null },
    blockchainVerified: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: days remaining
WarrantySchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  const diff = this.expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Pre-save: auto-update status
WarrantySchema.pre('save', function () {
  const now = new Date();
  const days = Math.ceil((this.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) this.status = WarrantyStatus.EXPIRED;
  else if (days <= 30) this.status = WarrantyStatus.EXPIRING_SOON;
  else this.status = WarrantyStatus.ACTIVE;
});

WarrantySchema.index({ companyId: 1, status: 1 });
WarrantySchema.index({ machineId: 1, type: 1 });

export const Warranty = mongoose.model<IWarranty>('Warranty', WarrantySchema);
