'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Building2, Key, Camera, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUser } from '@/hooks/useUser';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, getRoleLabel, cn } from '@/lib/utils';
import { UserRole } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const companySchema = z.object({
  name: z.string().min(2, 'Company name required').optional(),
  industryType: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;
type CompanyValues = z.infer<typeof companySchema>;

// ─── Alert component ──────────────────────────────────────────────────────────
function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm border',
        type === 'success'
          ? 'bg-[oklch(0.72_0.17_160/0.12)] border-[oklch(0.72_0.17_160/0.3)] text-[oklch(0.82_0.12_160)]'
          : 'bg-[oklch(0.65_0.22_25/0.12)] border-[oklch(0.65_0.22_25/0.3)] text-[oklch(0.80_0.12_25)]'
      )}
    >
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg bg-[oklch(0.11_0.006_240)] border border-[oklch(0.22_0.01_240)] px-4 py-2.5 text-white placeholder-[oklch(0.40_0.01_240)] text-sm focus:outline-none focus:border-[oklch(0.62_0.20_240)] focus:ring-1 focus:ring-[oklch(0.62_0.20_240/0.4)] transition-all';

const TABS = ['Profile', 'Password', 'Company'] as const;
type Tab = (typeof TABS)[number];

const INDUSTRY_TYPES = [
  'Manufacturing', 'Oil & Gas', 'Mining', 'Power Generation', 'Automotive',
  'Aerospace', 'Chemical Processing', 'Food & Beverage', 'Pharmaceuticals',
  'Water Treatment', 'Construction', 'Other',
];

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [profileAlert, setProfileAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordAlert, setPasswordAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [companyAlert, setCompanyAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { user, company } = useAuthStore();
  const { updateProfile, uploadAvatar, isLoading: userLoading } = useUser();
  const { updateCompany, uploadLogo, isLoading: companyLoading } = useCompany();
  const { changePassword, isLoading: authLoading } = useAuth();

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phoneNumber: user?.phoneNumber || '' },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const companyForm = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      industryType: company?.industryType || '',
      email: company?.email || '',
      contactNumber: company?.contactNumber || '',
      address: company?.address || '',
      country: company?.country || '',
      state: company?.state || '',
      city: company?.city || '',
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleProfileSubmit = profileForm.handleSubmit(async (data) => {
    setProfileAlert(null);
    const result = await updateProfile(data);
    setProfileAlert(result.success
      ? { type: 'success', message: 'Profile updated successfully!' }
      : { type: 'error', message: result.error || 'Failed to update profile' }
    );
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadAvatar(file);
    setProfileAlert(result.success
      ? { type: 'success', message: 'Avatar updated successfully!' }
      : { type: 'error', message: result.error || 'Failed to upload avatar' }
    );
  };

  const handlePasswordSubmit = passwordForm.handleSubmit(async (data) => {
    setPasswordAlert(null);
    const result = await changePassword(data.currentPassword, data.newPassword);
    if (!result.success) {
      setPasswordAlert({ type: 'error', message: result.error || 'Failed to change password' });
    }
    // On success, user is redirected to login by useAuth
  });

  const handleCompanySubmit = companyForm.handleSubmit(async (data) => {
    setCompanyAlert(null);
    const result = await updateCompany(data);
    setCompanyAlert(result.success
      ? { type: 'success', message: 'Company details updated successfully!' }
      : { type: 'error', message: result.error || 'Failed to update company' }
    );
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadLogo(file);
    setCompanyAlert(result.success
      ? { type: 'success', message: 'Company logo updated!' }
      : { type: 'error', message: result.error || 'Failed to upload logo' }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-[oklch(0.50_0.01_240)] mt-1">
          Manage your account and company preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[oklch(0.11_0.006_240)] border border-[oklch(0.17_0.008_240)] w-fit">
        {TABS.filter((t) => t !== 'Company' || isAdmin).map((tab) => {
          const icons = { Profile: User, Password: Key, Company: Building2 };
          const Icon = icons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-[oklch(0.17_0.008_240)] text-white shadow-sm'
                  : 'text-[oklch(0.50_0.01_240)] hover:text-white'
              )}
            >
              <Icon size={14} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* ─── Profile Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'Profile' && (
        <div className="glass rounded-xl p-6 space-y-6 animate-fade-in">
          <h2 className="font-semibold text-white">Personal Information</h2>

          {profileAlert && <Alert {...profileAlert} />}

          {/* Avatar section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[oklch(0.62_0.20_240)] to-[oklch(0.75_0.18_200)] flex items-center justify-center text-2xl font-bold text-white overflow-hidden shadow-lg">
                {user?.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePicture} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user ? getInitials(user.name) : 'U'}</span>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera size={18} className="text-white" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-[oklch(0.45_0.01_240)]">{getRoleLabel(user?.role as UserRole)}</p>
              <button
                id="upload-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
                className="mt-2 text-xs text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors"
              >
                Change photo
              </button>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Full Name</label>
                <input {...profileForm.register('name')} className={inputClass} />
                {profileForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Phone Number</label>
                <input {...profileForm.register('phoneNumber')} className={inputClass} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1 text-xs text-[oklch(0.40_0.01_240)]">Email cannot be changed here</p>
            </div>
            <button
              id="save-profile-btn"
              type="submit"
              disabled={userLoading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-6 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {userLoading && <Loader2 size={14} className="animate-spin" />}
              {userLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ─── Password Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'Password' && (
        <div className="glass rounded-xl p-6 space-y-6 animate-fade-in">
          <h2 className="font-semibold text-white">Change Password</h2>
          <p className="text-sm text-[oklch(0.50_0.01_240)]">
            After changing your password you will be signed out and need to log in again.
          </p>

          {passwordAlert && <Alert {...passwordAlert} />}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {[
              { field: 'currentPassword', label: 'Current Password', show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
              { field: 'newPassword', label: 'New Password', show: showNew, toggle: () => setShowNew(!showNew) },
              { field: 'confirmPassword', label: 'Confirm New Password', show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
            ].map(({ field, label, show, toggle }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    {...passwordForm.register(field as keyof PasswordValues)}
                    type={show ? 'text' : 'password'}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.50_0.01_240)] hover:text-white transition-colors"
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passwordForm.formState.errors[field as keyof PasswordValues] && (
                  <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">
                    {passwordForm.formState.errors[field as keyof PasswordValues]?.message}
                  </p>
                )}
              </div>
            ))}

            <button
              id="change-password-btn"
              type="submit"
              disabled={authLoading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-6 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading && <Loader2 size={14} className="animate-spin" />}
              {authLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* ─── Company Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'Company' && isAdmin && (
        <div className="glass rounded-xl p-6 space-y-6 animate-fade-in">
          <h2 className="font-semibold text-white">Company Details</h2>

          {companyAlert && <Alert {...companyAlert} />}

          {/* Logo section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-xl bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] flex items-center justify-center overflow-hidden">
                {company?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={28} className="text-[oklch(0.40_0.01_240)]" />
                )}
              </div>
              <button
                onClick={() => logoInputRef.current?.click()}
                className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera size={18} className="text-white" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{company?.name}</p>
              <p className="text-xs text-[oklch(0.45_0.01_240)]">{company?.industryType}</p>
              <button
                id="upload-logo-btn"
                onClick={() => logoInputRef.current?.click()}
                className="mt-2 text-xs text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors"
                disabled={companyLoading}
              >
                {companyLoading ? 'Uploading...' : 'Upload logo'}
              </button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>

          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Company Name</label>
                <input {...companyForm.register('name')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Industry Type</label>
                <select {...companyForm.register('industryType')} className={`${inputClass} cursor-pointer`}>
                  {INDUSTRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Company Email</label>
                <input {...companyForm.register('email')} type="email" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Contact Number</label>
                <input {...companyForm.register('contactNumber')} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Address</label>
                <input {...companyForm.register('address')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Country</label>
                <input {...companyForm.register('country')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">State</label>
                <input {...companyForm.register('state')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">City</label>
                <input {...companyForm.register('city')} className={inputClass} />
              </div>
            </div>

            <button
              id="save-company-btn"
              type="submit"
              disabled={companyLoading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-6 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {companyLoading && <Loader2 size={14} className="animate-spin" />}
              {companyLoading ? 'Saving...' : 'Save Company Details'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
