import { create } from 'zustand';
import { electronAPI, session, type User } from '@/lib/apiClient';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { syncEngine } from '@/lib/syncEngine';

import { STORAGE_KEYS } from '@/lib/storageKeys';
import { rememberServerUrl } from '@/lib/discovery';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  serverUrl: string | null;

  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  restoreSession: () => Promise<boolean>;
  setServerUrl: (url: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  serverUrl: null,

  login: async (username: string, pin: string) => {
    set({ loading: true });
    try {
      const result = await electronAPI.auth.login(username, pin);
      if (result.error) {
        return { success: false, error: result.error.detail };
      }
      if (!result.user) {
        return { success: false, error: 'loginFailed' };
      }

      await AnposSecureStore.set(STORAGE_KEYS.USER_ID, result.user.id);
      set({ user: result.user, isAuthenticated: true, loading: false });

      // Trigger background sync pull if connected
      syncEngine.pullUpdates().catch(() => {});

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'serverOffline' };
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    const user = get().user;
    if (user?.id) {
      electronAPI.auth.logout(user.id).catch(() => {});
    }
    AnposSecureStore.remove(STORAGE_KEYS.USER_ID);
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    if (!(await session.isConnected())) return false;
    const userId = await AnposSecureStore.get(STORAGE_KEYS.USER_ID);
    if (!userId) return false;
    set({ loading: true });
    try {
      const result = await electronAPI.auth.me(userId);
      if (result.user) {
        set({ user: result.user, isAuthenticated: true, loading: false });
        syncEngine.pullUpdates().catch(() => {});
        return true;
      }
      set({ loading: false });
      return false;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  setServerUrl: async (url: string) => {
    set({ serverUrl: url });
    await rememberServerUrl(url).catch(() => {});
  },
}));
