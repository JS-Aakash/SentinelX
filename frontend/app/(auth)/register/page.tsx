'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Building2, User, Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Step 1: Company Schema ─────────────────────────────────────────────────
const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industryType: z.string().min(2, 'Please select an industry type'),
  email: z.string().email('Invalid company email'),
  contactNumber: z.string().min(7, 'Contact number is too short'),
  address: z.string().min(5, 'Please enter a full address'),
  country: z.string().min(2, 'Country is required'),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
});

// ─── Step 2: User Schema ─────────────────────────────────────────────────────
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
  phoneNumber: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type CompanyFormValues = z.infer<typeof companySchema>;
type UserFormValues = z.infer<typeof userSchema>;

const INDUSTRY_TYPES = [
  'Manufacturing', 'Oil & Gas', 'Mining', 'Power Generation', 'Automotive',
  'Aerospace', 'Chemical Processing', 'Food & Beverage', 'Pharmaceuticals',
  'Water Treatment', 'Construction', 'Other',
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [companyData, setCompanyData] = useState<CompanyFormValues | null>(null);
  const { register: authRegister, isLoading } = useAuth();

  const companyForm = useForm<CompanyFormValues>({ resolver: zodResolver(companySchema) });
  const userForm = useForm<UserFormValues>({ resolver: zodResolver(userSchema) });

  const handleCompanyNext = companyForm.handleSubmit((data) => {
    setCompanyData(data);
    setStep(2);
  });

  const handleUserSubmit = userForm.handleSubmit(async (data) => {
    if (!companyData) return;
    setServerError('');
    const { confirmPassword, ...userData } = data;
    void confirmPassword;
    const result = await authRegister({ company: companyData, user: userData });
    if (!result.success && result.error) {
      setServerError(result.error);
    }
  });

  const inputClass =
    'w-full rounded-lg bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] px-4 py-2.5 text-white placeholder-[oklch(0.40_0.01_240)] text-sm focus:outline-none focus:border-[oklch(0.62_0.20_240)] focus:ring-1 focus:ring-[oklch(0.62_0.20_240/0.4)] transition-all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">Create your account</h2>
        <p className="mt-2 text-[oklch(0.55_0.01_240)]">
          Set up SentinelX for your company in minutes
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3">
        {[
          { num: 1, label: 'Company', icon: Building2 },
          { num: 2, label: 'Admin User', icon: User },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.num
                    ? 'bg-[oklch(0.72_0.17_160)] text-white'
                    : step === s.num
                    ? 'bg-[oklch(0.52_0.24_240)] text-white shadow-lg shadow-[oklch(0.52_0.24_240/0.4)]'
                    : 'bg-[oklch(0.17_0.008_240)] text-[oklch(0.45_0.01_240)]'
                }`}
              >
                {step > s.num ? <Check size={14} /> : <s.icon size={14} />}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  step >= s.num ? 'text-white' : 'text-[oklch(0.40_0.01_240)]'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < 1 && (
              <div className={`flex-1 h-px ml-2 ${step > 1 ? 'bg-[oklch(0.72_0.17_160)]' : 'bg-[oklch(0.22_0.01_240)]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg bg-[oklch(0.65_0.22_25/0.15)] border border-[oklch(0.65_0.22_25/0.3)] px-4 py-3 text-sm text-[oklch(0.80_0.12_25)]">
          {serverError}
        </div>
      )}

      {/* ─── Step 1: Company ── */}
      {step === 1 && (
        <form onSubmit={handleCompanyNext} className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Company Name *</label>
              <input {...companyForm.register('name')} className={inputClass} placeholder="Acme Industries" />
              {companyForm.formState.errors.name && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Industry Type *</label>
              <select {...companyForm.register('industryType')} className={`${inputClass} cursor-pointer`}>
                <option value="">Select industry...</option>
                {INDUSTRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {companyForm.formState.errors.industryType && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.industryType.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Company Email *</label>
              <input {...companyForm.register('email')} type="email" className={inputClass} placeholder="info@company.com" />
              {companyForm.formState.errors.email && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Contact Number *</label>
              <input {...companyForm.register('contactNumber')} className={inputClass} placeholder="+1 555 000 0000" />
              {companyForm.formState.errors.contactNumber && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.contactNumber.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Address *</label>
              <input {...companyForm.register('address')} className={inputClass} placeholder="123 Industrial Ave" />
              {companyForm.formState.errors.address && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.address.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Country *</label>
              <input {...companyForm.register('country')} className={inputClass} placeholder="United States" />
              {companyForm.formState.errors.country && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.country.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">State *</label>
              <input {...companyForm.register('state')} className={inputClass} placeholder="Texas" />
              {companyForm.formState.errors.state && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.state.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">City *</label>
              <input {...companyForm.register('city')} className={inputClass} placeholder="Houston" />
              {companyForm.formState.errors.city && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{companyForm.formState.errors.city.message}</p>}
            </div>
          </div>

          <button
            id="register-company-next-btn"
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-4 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)]"
          >
            Next: Create Admin Account <ArrowRight size={16} />
          </button>
        </form>
      )}

      {/* ─── Step 2: User ── */}
      {step === 2 && (
        <form onSubmit={handleUserSubmit} className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Full Name *</label>
            <input {...userForm.register('name')} className={inputClass} placeholder="John Smith" />
            {userForm.formState.errors.name && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{userForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Email Address *</label>
            <input {...userForm.register('email')} type="email" className={inputClass} placeholder="admin@company.com" />
            {userForm.formState.errors.email && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{userForm.formState.errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Phone Number</label>
            <input {...userForm.register('phoneNumber')} className={inputClass} placeholder="+1 555 000 0000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Password *</label>
              <div className="relative">
                <input {...userForm.register('password')} type={showPassword ? 'text' : 'password'} className={`${inputClass} pr-10`} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.50_0.01_240)] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {userForm.formState.errors.password && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{userForm.formState.errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Confirm *</label>
              <div className="relative">
                <input {...userForm.register('confirmPassword')} type={showConfirm ? 'text' : 'password'} className={`${inputClass} pr-10`} placeholder="Repeat password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.50_0.01_240)] hover:text-white transition-colors">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {userForm.formState.errors.confirmPassword && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{userForm.formState.errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg border border-[oklch(0.22_0.01_240)] bg-[oklch(0.14_0.007_240)] text-[oklch(0.75_0.01_240)] font-medium py-2.5 px-4 text-sm hover:border-[oklch(0.35_0.015_240)] transition-all"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-4 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-[oklch(0.55_0.01_240)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
