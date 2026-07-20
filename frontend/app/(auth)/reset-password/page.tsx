'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const { resetPassword, isLoading } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    if (!token) {
      setServerError('Invalid or missing reset token. Please request a new one.');
      return;
    }
    const result = await resetPassword(token, data.password);
    if (result.success) {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setServerError(result.error || 'Something went wrong');
    }
  };

  const inputClass =
    'w-full rounded-lg bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] px-4 py-2.5 pr-10 text-white placeholder-[oklch(0.40_0.01_240)] text-sm focus:outline-none focus:border-[oklch(0.62_0.20_240)] focus:ring-1 focus:ring-[oklch(0.62_0.20_240/0.4)] transition-all';

  if (done) {
    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-[oklch(0.72_0.17_160/0.15)] border border-[oklch(0.72_0.17_160/0.3)] flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[oklch(0.72_0.17_160)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Password reset!</h2>
          <p className="text-[oklch(0.55_0.01_240)] text-sm">
            Your password has been updated. Redirecting to sign in...
          </p>
        </div>
        <Link href="/login" className="text-sm text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors">
          Go to sign in now
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Reset password</h2>
        <p className="mt-2 text-[oklch(0.55_0.01_240)] text-sm">Enter your new password below.</p>
      </div>

      {serverError && (
        <div className="rounded-lg bg-[oklch(0.65_0.22_25/0.15)] border border-[oklch(0.65_0.22_25/0.3)] px-4 py-3 text-sm text-[oklch(0.80_0.12_25)]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">New Password</label>
          <div className="relative">
            <input {...register('password')} type={showPassword ? 'text' : 'password'} className={inputClass} placeholder="Min. 8 characters" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.50_0.01_240)] hover:text-white transition-colors">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">Confirm Password</label>
          <div className="relative">
            <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} className={inputClass} placeholder="Repeat new password" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.50_0.01_240)] hover:text-white transition-colors">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-[oklch(0.75_0.15_25)]">{errors.confirmPassword.message}</p>}
        </div>

        <button
          id="reset-password-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-4 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-[oklch(0.55_0.01_240)] text-sm">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
