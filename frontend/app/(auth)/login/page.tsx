'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { login, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError('');
    const result = await login(data);
    if (!result.success && result.error) {
      setServerError(result.error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">Welcome back</h2>
        <p className="mt-2 text-[oklch(0.55_0.01_240)]">
          Sign in to your SentinelX account
        </p>
      </div>

      {/* Error alert */}
      {serverError && (
        <div className="rounded-lg bg-[oklch(0.65_0.22_25/0.15)] border border-[oklch(0.65_0.22_25/0.3)] px-4 py-3 text-sm text-[oklch(0.80_0.12_25)]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-[oklch(0.75_0.01_240)] mb-1.5">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full rounded-lg bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] px-4 py-2.5 text-white placeholder-[oklch(0.40_0.01_240)] text-sm focus:outline-none focus:border-[oklch(0.62_0.20_240)] focus:ring-1 focus:ring-[oklch(0.62_0.20_240/0.4)] transition-all"
            placeholder="name@company.com"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-[oklch(0.75_0.15_25)]">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-[oklch(0.75_0.01_240)]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-lg bg-[oklch(0.14_0.007_240)] border border-[oklch(0.22_0.01_240)] px-4 py-2.5 pr-10 text-white placeholder-[oklch(0.40_0.01_240)] text-sm focus:outline-none focus:border-[oklch(0.62_0.20_240)] focus:ring-1 focus:ring-[oklch(0.62_0.20_240/0.4)] transition-all"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.50_0.01_240)] hover:text-[oklch(0.75_0.01_240)] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-[oklch(0.75_0.15_25)]">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.24_240)] to-[oklch(0.44_0.22_240)] hover:from-[oklch(0.58_0.24_240)] hover:to-[oklch(0.50_0.22_240)] text-white font-semibold py-2.5 px-4 text-sm transition-all duration-200 shadow-lg shadow-[oklch(0.52_0.24_240/0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogIn size={16} />
          )}
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-[oklch(0.55_0.01_240)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-[oklch(0.62_0.20_240)] hover:text-[oklch(0.75_0.18_200)] transition-colors"
        >
          Create one now
        </Link>
      </p>
    </div>
  );
}
