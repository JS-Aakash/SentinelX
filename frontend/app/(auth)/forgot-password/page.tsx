'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const { forgotPassword, isLoading } = useAuth();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    const result = await forgotPassword(data.email);
    if (result.success) {
      setSent(true);
    } else {
      setServerError(result.error || 'Something went wrong');
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-[oklch(0.72_0.17_160/0.15)] border border-[oklch(0.72_0.17_160/0.3)] flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[oklch(0.72_0.17_160)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-[oklch(0.55_0.01_240)] text-sm">
            If an account exists for{' '}
            <span className="text-white font-medium">{getValues('email')}</span>, you&apos;ll
            receive a password reset link shortly.
          </p>
        </div>
        <div className="rounded-lg bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] p-4 text-xs text-[oklch(0.50_0.01_240)] text-left">
          <p className="font-medium text-[oklch(0.65_0.01_240)] mb-1">Development note:</p>
          <p>Email is mocked — check the backend console for the reset link.</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Forgot password?</h2>
        <p className="mt-2 text-[oklch(0.55_0.01_240)] text-sm">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg bg-[oklch(0.65_0.22_25/0.15)] border border-[oklch(0.65_0.22_25/0.3)] px-4 py-3 text-sm text-[oklch(0.80_0.12_25)]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            {...register('email')}
            className="w-full rounded-lg bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] px-4 py-2.5 text-white placeholder-[oklch(0.40_0.01_240)] text-sm focus:outline-none focus:border-[oklch(0.62_0.20_240)] focus:ring-1 focus:ring-[oklch(0.62_0.20_240/0.4)] transition-all"
            placeholder="name@company.com"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-[oklch(0.75_0.15_25)]">{errors.email.message}</p>
          )}
        </div>

        <button
          id="forgot-password-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-4 text-sm transition-all shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-[oklch(0.55_0.01_240)] hover:text-white transition-colors"
      >
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </div>
  );
}
