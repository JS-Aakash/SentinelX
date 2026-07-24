import mongoose, { Document, Schema } from 'mongoose';

export enum VendorType {
  MANUFACTURER = 'manufacturer',
  SUPPLIER = 'supplier',
  AMC_PROVIDER = 'amc_provider',
  SERVICE_CENTER = 'service_center',
  DISTRIBUTOR = 'distributor',
}

export interface IVendor extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  type: VendorType;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  supportEmail?: string;
  supportPhone?: string;
  slaResponseHours?: number;
  linkedMachineIds: mongoose.Types.ObjectId[];
  linkedMachineTypes: string[];
  rating?: number;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(VendorType), required: true },
    code: { type: String, trim: true, uppercase: true, default: null },
    contactName: { type: String, default: null },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, default: null },
    alternatePhone: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: 'India' },
    website: { type: String, default: null },
    gstNumber: { type: String, uppercase: true, default: null },
    panNumber: { type: String, uppercase: true, default: null },
    supportEmail: { type: String, lowercase: true, default: null },
    supportPhone: { type: String, default: null },
    slaResponseHours: { type: Number, default: null },
    linkedMachineIds: [{ type: Schema.Types.ObjectId, ref: 'Machine' }],
    linkedMachineTypes: { type: [String], default: [] },
    rating: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

VendorSchema.index({ companyId: 1, type: 1 });
VendorSchema.index({ companyId: 1, isActive: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
