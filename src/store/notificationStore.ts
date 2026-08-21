import { create } from 'zustand';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
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

const saveToStorage = (notifications: Notification[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: getInitialNotifications(),

  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [newNotification, ...state.notifications].slice(0, 50);
      saveToStorage(updated);
      return { notifications: updated };
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
      saveToStorage(updated);
      return { notifications: updated };
    }),

  clearAll: () => {
    saveToStorage([]);
    set({ notifications: [] });
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
