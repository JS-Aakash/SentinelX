import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Authentication',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[oklch(0.08_0.005_240)] flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        {/* Background gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.08_0.005_240)] via-[oklch(0.10_0.010_240)] to-[oklch(0.08_0.005_240)]" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-[oklch(0.52_0.24_240/0.12)] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[oklch(0.75_0.18_200/0.10)] rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[oklch(0.72_0.17_160/0.08)] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(oklch(0.95 0.01 240) 1px, transparent 1px), linear-gradient(90deg, oklch(0.95 0.01 240) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.20_240)] to-[oklch(0.75_0.18_200)] flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">SentinelX</span>
              <p className="text-xs text-[oklch(0.55_0.01_240)] leading-none mt-0.5">
                Industrial Intelligence
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Predict.{' '}
              <span className="bg-gradient-to-r from-[oklch(0.75_0.18_200)] to-[oklch(0.62_0.20_240)] bg-clip-text text-transparent">
                Prevent.
              </span>{' '}
              Prolong.
            </h1>
            <p className="text-[oklch(0.55_0.01_240)] text-lg leading-relaxed max-w-md">
              AI-powered asset intelligence for industrial operations. Monitor, analyze, and act
              before failures occur.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '40%', label: 'Cost Reduction' },
              { value: '10x', label: 'ROI' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-[oklch(0.55_0.01_240)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-[oklch(0.40_0.01_240)]">
          © 2026 SentinelX. All rights reserved.
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.20_240)] to-[oklch(0.75_0.18_200)] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">SentinelX</span>
        </div>

        <div className="w-full max-w-md animate-fade-in">{children}</div>

        <div className="mt-8 text-center text-xs text-[oklch(0.40_0.01_240)]">
          <Link href="/login" className="hover:text-[oklch(0.62_0.20_240)] transition-colors">
            Privacy Policy
          </Link>
          {' · '}
          <Link href="/login" className="hover:text-[oklch(0.62_0.20_240)] transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
