'use client';
import { create } from 'zustand';
import {
  getStoredToken,
  getStoredUser,
  clearAuth as clearStoredAuth,
  AuthUser,
} from '../lib/auth-storage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  clearAuth: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>(
  (set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    clearAuth: () => {
      clearStoredAuth();
      set({
        token: null,
        user: null,
        isAuthenticated: false,
      });
    },

    initFromStorage: () => {
      const token = getStoredToken();
      const user = getStoredUser();
      if (token && user) {
        set({
          token,
          user,
          isAuthenticated: true,
        });
      }
    },
  })
);
