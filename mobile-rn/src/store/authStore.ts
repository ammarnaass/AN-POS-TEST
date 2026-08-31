import { create } from 'zustand';
import { electronAPI, session, type User } from '@/lib/apiClient';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { syncEngine } from '@/lib/syncEngine';

const USER_ID_KEY = 'anpos_user_id';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  serverUrl: string | null;

  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  restoreSession: () => Promise<void>;
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

      await AnposSecureStore.set(USER_ID_KEY, result.user.id);
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
    AnposSecureStore.remove(USER_ID_KEY);
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    if (!(await session.isConnected())) return;
    const userId = await AnposSecureStore.get(USER_ID_KEY);
    if (!userId) return;
    try {
      const result = await electronAPI.auth.me(userId);
      if (result.user) {
        set({ user: result.user, isAuthenticated: true });
        syncEngine.pullUpdates().catch(() => {});
      }
    } catch {
      // Session expired
    }
  },

  setServerUrl: async (url: string) => {
    set({ serverUrl: url });
  },
}));
