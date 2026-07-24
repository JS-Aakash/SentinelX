import mongoose, { Document, Schema } from 'mongoose';

export enum ClaimStatus {
  CREATED = 'created',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export interface IWarrantyClaim extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  warrantyId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  claimNumber: string;
  problem: string;
  failureDate: Date;
  supplier: string;
  status: ClaimStatus;
  claimNotes?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  ipfsCid?: string;
  ipfsUrl?: string;
  blockchainTxHash?: string;
  blockchainVerified?: boolean;
  documents: { name: string; ipfsCid: string; ipfsUrl: string; type: string; uploadedAt: Date }[];
  submittedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WarrantyClaimSchema = new Schema<IWarrantyClaim>(
  {
    machineId: { type: Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
    warrantyId: { type: Schema.Types.ObjectId, ref: 'Warranty', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    claimNumber: { type: String, required: true, trim: true },
    problem: { type: String, required: true },
    failureDate: { type: Date, required: true },
    supplier: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ClaimStatus),
      default: ClaimStatus.CREATED,
      index: true,
    },
    claimNotes: { type: String, default: null },
    approvalNotes: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    ipfsCid: { type: String, default: null },
    ipfsUrl: { type: String, default: null },
    blockchainTxHash: { type: String, default: null },
    blockchainVerified: { type: Boolean, default: false },
    documents: [
      {
        name: { type: String },
        ipfsCid: { type: String },
        ipfsUrl: { type: String },
        type: { type: String, enum: ['photo', 'invoice', 'report', 'other'], default: 'other' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

WarrantyClaimSchema.index({ companyId: 1, status: 1 });
WarrantyClaimSchema.index({ machineId: 1, createdAt: -1 });

export const WarrantyClaim = mongoose.model<IWarrantyClaim>('WarrantyClaim', WarrantyClaimSchema);
