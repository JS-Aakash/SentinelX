import mongoose, { Document, Schema } from 'mongoose';

export const COMPONENT_TYPES = [
  'Bearing',
  'Motor',
  'Pump',
  'Gearbox',
  'Belt',
  'Fan',
  'Coupling',
  'Sensor',
  'PCB',
  'Power Supply',
  'Filter',
  'Valve',
  'Shaft',
  'Seal',
  'Custom',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export enum ReplacementReason {
  WEAR = 'wear',
  FAILURE = 'failure',
  PREVENTIVE = 'preventive',
  UPGRADE = 'upgrade',
  WARRANTY = 'warranty',
  DAMAGE = 'damage',
}

export interface IComponentReplacement extends Document {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  componentType: string;
  componentName: string;
  partNumber?: string;
  serialNumber?: string;
  supplier?: string;
  oldPartSerial?: string;
  newPartSerial?: string;
  cost: number;
  quantity: number;
  currency: string;
  replacementReason: ReplacementReason;
  description?: string;
  engineerId: mongoose.Types.ObjectId;
  replacementDate: Date;
  warrantyId?: mongoose.Types.ObjectId;
  sparePartId?: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  ipfsCid?: string;
  ipfsUrl?: string;
  blockchainTxHash?: string;
  blockchainVerified?: boolean;
  supervisorVerifiedBy?: mongoose.Types.ObjectId;
  supervisorVerifiedAt?: Date;
  documents: { name: string; ipfsCid: string; ipfsUrl: string; uploadedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const ComponentReplacementSchema = new Schema<IComponentReplacement>(
  {
    machineId: { type: Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    componentType: { type: String, required: true },
    componentName: { type: String, required: true, trim: true },
    partNumber: { type: String, trim: true, default: null },
    serialNumber: { type: String, trim: true, default: null },
    supplier: { type: String, trim: true, default: null },
    oldPartSerial: { type: String, trim: true, default: null },
    newPartSerial: { type: String, trim: true, default: null },
    cost: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    currency: { type: String, default: 'INR' },
    replacementReason: { type: String, enum: Object.values(ReplacementReason), required: true },
    description: { type: String, default: null },
    engineerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    replacementDate: { type: Date, required: true },
    warrantyId: { type: Schema.Types.ObjectId, ref: 'Warranty', default: null },
    sparePartId: { type: Schema.Types.ObjectId, ref: 'SparePart', default: null },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', default: null },
    ipfsCid: { type: String, default: null },
    ipfsUrl: { type: String, default: null },
    blockchainTxHash: { type: String, default: null },
    blockchainVerified: { type: Boolean, default: false },
    supervisorVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    supervisorVerifiedAt: { type: Date, default: null },
    documents: [
      {
        name: { type: String },
        ipfsCid: { type: String },
        ipfsUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ComponentReplacementSchema.index({ companyId: 1, componentType: 1 });
ComponentReplacementSchema.index({ machineId: 1, replacementDate: -1 });

export const ComponentReplacement = mongoose.model<IComponentReplacement>(
  'ComponentReplacement',
  ComponentReplacementSchema
);
