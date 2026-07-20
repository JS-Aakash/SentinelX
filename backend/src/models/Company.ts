import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  industryType: string;
  email: string;
  contactNumber: string;
  address: string;
  country: string;
  state: string;
  city: string;
  logo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    industryType: {
      type: String,
      required: [true, 'Industry type is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    logo: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (email unique is already set in schema field definition)
CompanySchema.index({ name: 1 });
CompanySchema.index({ isActive: 1 });

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
