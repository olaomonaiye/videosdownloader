'use client';
import { create } from 'zustand';
import { adminApi } from '@/lib/api';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async (email, password) => {
    const data = await adminApi.login({ email, password });
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },
  logout: async () => {
    await adminApi.logout();
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: async () => {
    try {
      const user = await adminApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
