'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, User, Settings, LogOut, Shield, Search, Radio, Command, CheckCheck, AlertTriangle, ShieldAlert, Cpu, Sparkles, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, getRoleBadgeColor, getRoleLabel, cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'anomaly' | 'warranty' | 'model' | 'system';
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'n1',
    title: 'High Vibration Anomaly Detected',
    message: 'Machine CNC-MTR-01 exceeded operating limits (2.85 g).',
    time: '5m ago',
    type: 'anomaly',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Warranty Expiry Alert',
    message: 'Motor Drive Unit warranty expires in 14 days.',
    time: '2h ago',
    type: 'warranty',
    unread: true,
  },
  {
    id: 'n3',
    title: 'AI Model Retraining Recommended',
    message: '2,400 new telemetry samples collected ready for fine-tuning.',
    time: '1d ago',
    type: 'model',
    unread: false,
  },
];

export function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, company } = useAuthStore();
  const { logout } = useAuth();

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-[#0A0B10]/90 backdrop-blur-md border-b border-[#1B1D2A] z-30 flex items-center justify-between px-6 select-none">
      {/* ─── Left: Search Input ───────────────────────── */}
      <div className="flex items-center gap-6">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-[#475569]" size={14} />
          <input
            type="text"
            placeholder="Search machines, devices, telemetry..."
            className="w-72 h-9 rounded-lg bg-[#11131C] border border-[#1E202E] pl-9 pr-3 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all font-mono"
          />
        </div>
      </div>

      {/* ─── Right: Notification & Profile Menu ──────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="navbar-notifications-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-lg bg-[#11131C] border border-[#1E202E] flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#2B324B] transition-all cursor-pointer"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF1744] rounded-full ring-2 ring-[#0A0B10]" />
            )}
          </button>

          {/* Notification Popover Card */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-[#0D0E15] border border-[#222536] shadow-2xl shadow-black/80 overflow-hidden animate-fade-in z-50 font-mono">
              <div className="px-4 py-3 border-b border-[#1E202E] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-[#00F2FE]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Notifications ({notifications.length})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={12} /> Mark read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] text-[#64748B] hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Items */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#1A1C2A]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    No notifications or alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'p-3.5 hover:bg-[#131522] transition-colors flex items-start gap-3 cursor-pointer',
                        n.unread ? 'bg-[#3B82F6]/5' : ''
                      )}
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                        );
                      }}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'anomaly' ? (
                          <AlertTriangle size={14} className="text-[#FF1744]" />
                        ) : n.type === 'warranty' ? (
                          <ShieldAlert size={14} className="text-[#FFB300]" />
                        ) : (
                          <Sparkles size={14} className="text-[#00F2FE]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                          <span className="text-[9px] text-[#64748B] shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-1.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="navbar-profile-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 bg-[#11131C] border border-[#1E202E] hover:border-[#2B324B] transition-all"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#3B82F6] to-[#00F2FE] flex items-center justify-center text-xs font-mono font-bold text-white shrink-0 overflow-hidden">
              {user?.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePicture} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user ? getInitials(user.name) : 'U'}</span>
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-none font-mono">{user?.name || 'Operator'}</p>
              <p className="text-[10px] font-mono text-[#64748B] leading-none mt-1">
                {user ? getRoleLabel(user.role as UserRole) : 'Viewer'}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={cn('text-[#64748B] transition-transform duration-200', dropdownOpen && 'rotate-180')}
            />
          </button>

          {/* Dropdown Card */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#0D0E15] border border-[#222536] shadow-2xl shadow-black/80 overflow-hidden animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-[#1E202E]">
                <p className="text-sm font-semibold text-white font-mono">{user?.name}</p>
                <p className="text-xs font-mono text-[#64748B] mt-0.5 truncate">{user?.email}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border',
                      user ? getRoleBadgeColor(user.role as UserRole) : ''
                    )}
                  >
                    <Shield size={10} />
                    {user ? getRoleLabel(user.role as UserRole) : ''}
                  </span>
                  <span className="text-[10px] font-mono text-[#00E676]">VERIFIED</span>
                </div>
              </div>

              <div className="py-1 text-xs font-mono">
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[#94A3B8] hover:bg-[#161824] hover:text-white transition-colors"
                >
                  <User size={14} /> Account Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[#94A3B8] hover:bg-[#161824] hover:text-white transition-colors"
                >
                  <Settings size={14} /> System Preferences
                </button>
              </div>

              <div className="border-t border-[#1E202E] py-1 text-xs font-mono">
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[#FF1744] hover:bg-[#FF1744]/10 transition-colors"
                >
                  <LogOut size={14} /> Terminate Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
