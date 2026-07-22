'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Radio,
  Wrench,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronRight,
  Activity,
  Server,
  Layers,
  Database,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    shortcut: '⌘1',
    comingSoon: false,
  },
  {
    label: 'Machines Fleet',
    href: '/machines',
    icon: Cpu,
    shortcut: '⌘2',
    comingSoon: false,
  },
  {
    label: 'IoT Gateways',
    href: '/devices',
    icon: Radio,
    shortcut: '⌘3',
    comingSoon: false,
  },
  {
    label: 'Data Acquisition',
    href: '/data-collection',
    icon: Database,
    shortcut: '⌘4',
    comingSoon: false,
  },
  {
    label: 'Sensor Simulator',
    href: '/simulation',
    icon: Sliders,
    shortcut: '⌘5',
    comingSoon: false,
  },
  {
    label: 'Predictive Maint.',
    href: '/maintenance',
    icon: Wrench,
    shortcut: '⌘6',
    comingSoon: false,
  },
  {
    label: 'Advanced Analytics',
    href: '/analytics',
    icon: BarChart3,
    shortcut: 'Soon',
    comingSoon: true,
  },
  {
    label: 'System Settings',
    href: '/settings',
    icon: Settings,
    shortcut: '⌘6',
    comingSoon: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { company } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col bg-[#0A0B10] border-r border-[#1B1D2A] z-40 select-none">
      {/* ─── Top Brand Emblem & System Identifier ─────────────────────── */}
      <div className="px-5 h-16 border-b border-[#1B1D2A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-[#0A0B10] rounded-[6px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#00F2FE]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight font-mono">SENTINELX</span>
            </div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748B]">
              ASSET INTELLIGENCE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#12141D] border border-[#222536]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-live-dot" />
          <span className="text-[9px] font-mono text-[#00E676] font-semibold">LIVE</span>
        </div>
      </div>

      {/* ─── Plant / Company Context Pill ───────────────────────────── */}
      <div className="px-3 pt-4 pb-2">
        <div className="rounded-lg bg-[#11131C] border border-[#1E202E] p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#181A26] border border-[#262A3E] flex items-center justify-center text-[#94A3B8]">
            <Server size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-mono text-[#64748B]">Active Hub</p>
            <p className="text-xs font-semibold text-white truncate">{company?.name || 'Enterprise Hub'}</p>
          </div>
          <span className="text-[9px] font-mono bg-[#1E202E] text-[#94A3B8] px-1.5 py-0.5 rounded border border-[#2E3248]">
            P-01
          </span>
        </div>
      </div>

      {/* ─── Navigation Links ────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        <div>
          <p className="px-3 mb-2 text-[9px] font-mono font-bold uppercase tracking-widest text-[#475569]">
            PLATFORM MODULES
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  {item.comingSoon ? (
                    <div className="flex items-center justify-between rounded-md px-3 py-2 opacity-40 text-[#64748B] cursor-not-allowed text-xs font-medium">
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[9px] font-mono bg-[#181A26] border border-[#222536] px-1.5 py-0.5 rounded text-[#64748B]">
                        SOON
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-all group relative',
                        isActive
                          ? 'bg-[#141824] text-white border border-[#2B324B] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'text-[#94A3B8] hover:bg-[#11131C] hover:text-white'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#00F2FE] rounded-r" />
                      )}
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          className={cn(
                            'transition-colors',
                            isActive ? 'text-[#00F2FE]' : 'text-[#64748B] group-hover:text-[#94A3B8]'
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#475569] group-hover:text-[#64748B] transition-colors">
                        {item.shortcut}
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* System telemetry status sidebar widget */}
        <div className="pt-2">
          <p className="px-3 mb-2 text-[9px] font-mono font-bold uppercase tracking-widest text-[#475569]">
            ENGINE ENGINE STATUS
          </p>
          <div className="mx-1 rounded-lg bg-[#0F111A] border border-[#1B1E2B] p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#64748B]">MQTT Ingestion</span>
              <span className="text-[#00E676] font-semibold">ACTIVE</span>
            </div>
            <div className="w-full bg-[#181B28] h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#3B82F6] to-[#00F2FE] h-full w-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-[#475569]">
              <span>TimescaleDB Storage</span>
              <span>100% Sync</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Footer Metadata ─────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-[#1B1D2A] shrink-0 flex items-center justify-between text-[10px] font-mono text-[#475569]">
        <span className="flex items-center gap-1.5">
          <Layers size={12} className="text-[#3B82F6]" />
          v5.2.0-PROD
        </span>
        <span className="text-[#00E676]">99.98%</span>
      </div>
    </aside>
  );
}
