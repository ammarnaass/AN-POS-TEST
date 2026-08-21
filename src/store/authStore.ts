import { create } from 'zustand';
import type { UserRole } from '@/types';

const SETUP_FLAG = 'anpos_setup_completed';
const USER_ID_KEY = 'anpos_user_id';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  roleId?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkMainProcess(): Promise<boolean> {
  try {
    const api = (window as any).electronAPI;
    if (!api) return false;
    await api.app.getVersion();
    return true;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function waitForElectronAPI(timeoutMs = 15000): Promise<any> {
  const api = (window as any).electronAPI;
  if (api) {
    console.log('[authStore] electronAPI موجود فوراً');
    return api;
  }

  console.warn('[authStore] electronAPI غير موجود — بدء الانتظار...');

  // انتظار الحدث من preload (أسرع من polling)
  const eventPromise = new Promise<any>((resolve) => {
    const handler = () => {
      document.removeEventListener('electronapi-ready', handler);
      console.log('[authStore] تم استقبال حدث electronapi-ready');
      resolve((window as any).electronAPI);
    };
    document.addEventListener('electronapi-ready', handler);
  });

  // Fallback: polling
  const pollPromise = new Promise<any>(async (resolve, reject) => {
    const start = Date.now();
    const warnAt = 3000;
    let warned = false;
    while (Date.now() - start < timeoutMs) {
      const a = (window as any).electronAPI;
      if (a) {
        console.log('[authStore] تم العثور على electronAPI بعد', Date.now() - start, 'ms');
        resolve(a); return;
      }
      if (!warned && Date.now() - start > warnAt) {
        warned = true;
        console.warn('[authStore] لا يزال electronAPI غير موجود بعد', warnAt, 'ms');
      }
      await new Promise(r => setTimeout(r, 50));
    }
    console.error('[authStore] electronAPI لم يتوفر بعد', timeoutMs, 'ms');
    reject(new Error('Electron API غير متاح بعد الانتظار'));
  });

  return Promise.race([eventPromise, pollPromise]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, pin: string) => {
    try {
      const api = await waitForElectronAPI();
      const result = await api.auth.login(username, pin);

      if (result.error) {
        return { success: false, error: result.error.detail };
      }

      if (!result.user) {
        return { success: false, error: 'فشل تسجيل الدخول' };
      }

      // تسجيل دخول ناجح = إكمال الإعداد الأولي تلقائياً
      localStorage.setItem(SETUP_FLAG, 'true');
      localStorage.setItem(USER_ID_KEY, result.user.id);

      set({
        user: result.user,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? `خطأ: ${err.message}` : 'حدث خطأ غير متوقع أثناء الاتصال',
      };
    }
  },

  logout: () => {
    const user = get().user;
    const api = (window as any).electronAPI;
    if (user && api?.auth?.logout) {
      api.auth.logout(user.id).catch(() => {});
    }
    localStorage.removeItem(USER_ID_KEY);
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    if (get().isAuthenticated) return;
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) return;
    try {
      const api = await waitForElectronAPI();
      const result = await api.auth.getCurrentUser(userId);
      if (result.user) {
        set({ user: result.user, isAuthenticated: true });
      }
    } catch {
      // الجلسة غير صالحة — اترك غير مصدّق
      localStorage.removeItem(USER_ID_KEY);
    }
  },
}));
