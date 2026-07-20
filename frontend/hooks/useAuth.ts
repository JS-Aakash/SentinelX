'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { LoginPayload, RegisterPayload } from '@/types';
import { getApiErrorMessage } from '@/lib/utils';

export function useAuth() {
  const router = useRouter();
  const { user, company, accessToken, isAuthenticated, isLoading, setAuth, setLoading, logout: storeLogout } = useAuthStore();

  const login = useCallback(
    async (data: LoginPayload) => {
      setLoading(true);
      try {
        const response = await authApi.login(data);
        const { user, company, accessToken } = response.data.data!;
        setAuth(user, company, accessToken);
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      } finally {
        setLoading(false);
      }
    },
    [router, setAuth, setLoading]
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      setLoading(true);
      try {
        const response = await authApi.register(data);
        const { user, company, accessToken } = response.data.data!;
        setAuth(user, company, accessToken);
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      } finally {
        setLoading(false);
      }
    },
    [router, setAuth, setLoading]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — logout anyway
    } finally {
      storeLogout();
      router.push('/login');
    }
  }, [router, storeLogout]);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await authApi.forgotPassword({ email });
      return { success: true };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error) };
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    try {
      await authApi.resetPassword({ token, password });
      return { success: true };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error) };
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await authApi.changePassword({ currentPassword, newPassword });
        // Force re-login after password change
        storeLogout();
        router.push('/login');
        return { success: true };
      } catch (error) {
        return { success: false, error: getApiErrorMessage(error) };
      }
    },
    [router, storeLogout]
  );

  return {
    user,
    company,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
  };
}
