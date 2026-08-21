import { create } from 'zustand';
import { electronAPI, session, type User } from '@/lib/apiClient';

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
        return { success: false, error: 'فشل تسجيل الدخول' };
      }
      await session.savePairing(result.user.id, username);
      await set({ user: result.user, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ غير متوقع' };
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    const user = get().user;
    if (user?.id) {
      electronAPI.auth.logout(user.id).catch(() => {});
    }
    session.clear();
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    if (!(await session.isConnected())) return;
    const userId = await session.getServerUrl();
    if (!userId) return;
    try {
      const result = await electronAPI.auth.me(userId);
      if (result.user) {
        set({ user: result.user, isAuthenticated: true });
      }
    } catch {
      session.clear();
    }
  },

  setServerUrl: async (url: string) => {
    set({ serverUrl: url });
  },
}));
