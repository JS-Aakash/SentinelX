'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { userApi } from '@/api/user';
import { companyApi } from '@/api/company';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    isAuthenticated,
    hasHydrated,
    accessToken,
    user,
    company,
    setAuth,
    setAccessToken,
    logout,
  } = useAuthStore();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    // Wait until Zustand rehydrates state from localStorage
    if (!hasHydrated) return;

    let isMounted = true;

    const restoreSession = async () => {
      // 1. If valid auth state exists in localStorage, immediately validate and render
      const state = useAuthStore.getState();
      if (state.isAuthenticated && state.accessToken && state.user && state.company) {
        if (isMounted) setIsRestoring(false);
        return;
      }

      // 2. Try restoring session via httpOnly refresh token cookie
      try {
        const refreshRes = await authApi.refresh();
        const newToken = refreshRes.data?.data?.accessToken;

        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);

          // Fetch user profile and company info
          const [userRes, companyRes] = await Promise.all([
            userApi.getProfile(),
            companyApi.getCompany(),
          ]);

          const u = userRes.data?.data;
          const c = companyRes.data?.data;

          if (u && c && isMounted) {
            useAuthStore.getState().setAuth(u, c, newToken);
            setIsRestoring(false);
            return;
          }
        }
      } catch {
        // Refresh token expired or invalid
      }

      if (isMounted) {
        setIsRestoring(false);
        if (!useAuthStore.getState().isAuthenticated) {
          useAuthStore.getState().logout();
          router.replace('/login');
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, router]);

  if (!hasHydrated || isRestoring) {
    return (
      <div className="min-h-screen bg-[oklch(0.08_0.005_240)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[oklch(0.62_0.20_240)] animate-spin" />
          <p className="text-xs text-[oklch(0.55_0.01_240)] font-mono">Restoring SentinelX session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
