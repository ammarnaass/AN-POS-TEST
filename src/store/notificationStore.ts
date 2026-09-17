import { create } from 'zustand';
import { playNotificationChime } from '@/services/sound/notificationSound';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface NotificationAction {
  label: string;
  onClick?: () => void;
  link?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  action?: NotificationAction;
  category?: 'system' | 'inventory' | 'sales' | 'print' | 'security' | string;
  duration?: number; // ms: default 5000 (0 means persistent until user dismisses)
}

interface NotificationState {
  notifications: Notification[];
  activeToasts: Notification[];
  isCenterOpen: boolean;
  soundEnabled: boolean;

  // الإجراءات الأساسية للإشعارات
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;

  // إدارة الإشعارات المنبثقة التفاعلية (Bottom-Left Toasts)
  dismissToast: (id: string) => void;
  clearActiveToasts: () => void;

  // مركز الإشعارات والصوت
  openCenter: () => void;
  closeCenter: () => void;
  toggleCenter: () => void;
  toggleSound: () => void;
}

const getInitialNotifications = (): Notification[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
  }
  return [];
};

const getInitialSoundEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('anpos_notification_sound');
    if (stored !== null) return stored === 'true';
  }
  return true;
};

const saveToStorage = (notifications: Notification[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
  }
};

const saveSoundToStorage = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('anpos_notification_sound', enabled ? 'true' : 'false');
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: getInitialNotifications(),
  activeToasts: [],
  isCenterOpen: false,
  soundEnabled: getInitialSoundEnabled(),

  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        read: false,
        createdAt: new Date().toISOString(),
        duration:
          notification.duration !== undefined
            ? notification.duration
            : notification.type === 'error'
              ? 8000
              : 5000,
      };

      const updated = [newNotification, ...state.notifications].slice(0, 50);
      saveToStorage(updated);

      // تشغيل نغمة صوتية تفاعلية إذا كان الصوت مفعلاً
      if (state.soundEnabled) {
        playNotificationChime(newNotification.type);
      }

      // إضافة الإشعار للتوست النشط في أسفل الشاشة على اليسار (الحد الأقصى 5 في طابور التوست)
      const updatedToasts = [newNotification, ...state.activeToasts].slice(0, 5);

      return {
        notifications: updated,
        activeToasts: updatedToasts,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveToStorage(updated);
      return { notifications: updated };
    }),

  markAllAsRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      saveToStorage(updated);
      return { notifications: updated };
    }),

  removeNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      const updatedToasts = state.activeToasts.filter((n) => n.id !== id);
      saveToStorage(updated);
      return {
        notifications: updated,
        activeToasts: updatedToasts,
      };
    }),

  clearAll: () => {
    saveToStorage([]);
    set({ notifications: [], activeToasts: [] });
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  dismissToast: (id) =>
    set((state) => ({
      activeToasts: state.activeToasts.filter((n) => n.id !== id),
    })),

  clearActiveToasts: () => set({ activeToasts: [] }),

  openCenter: () => set({ isCenterOpen: true }),
  closeCenter: () => set({ isCenterOpen: false }),
  toggleCenter: () => set((state) => ({ isCenterOpen: !state.isCenterOpen })),

  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      saveSoundToStorage(next);
      return { soundEnabled: next };
    }),
}));
