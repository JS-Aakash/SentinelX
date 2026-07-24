import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  MAINTENANCE_MANAGER = 'maintenance_manager',
  MAINTENANCE_ENGINEER = 'maintenance_engineer',
  MACHINE_OPERATOR = 'machine_operator',
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  profilePicture?: string;
  phoneNumber?: string;
  companyId: mongoose.Types.ObjectId;
  isActive: boolean;
  isEmailVerified: boolean;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MACHINE_OPERATOR,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['password'];
        delete ret['refreshToken'];
        delete ret['passwordResetToken'];
        delete ret['passwordResetExpires'];
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes (email unique is already set in schema field definition)
UserSchema.index({ companyId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  (this as unknown as { password: string }).password = await bcrypt.hash(
    (this as unknown as { password: string }).password,
    salt
  );
});

// Instance method: compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
