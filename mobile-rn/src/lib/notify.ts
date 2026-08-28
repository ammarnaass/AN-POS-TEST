/**
 * AN POS — Unified Notification & Alert Service
 * Provides consistent user feedback for errors, successes, warnings, and confirmations.
 */
import { Alert } from 'react-native';

export type NotifyType = 'success' | 'error' | 'warning' | 'info';

export interface NotifyOptions {
  title?: string;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface ToastMessage {
  id: string;
  type: NotifyType;
  title: string;
  message: string;
  timestamp: number;
}

type ToastListener = (toast: ToastMessage | null) => void;
const listeners: Set<ToastListener> = new Set();
let activeToastTimeout: any = null;

export const notify = {
  /** Display a success message */
  success(message: string, title: string = '✓ تم بنجاح', options?: NotifyOptions): void {
    emitToast('success', title, message, options?.duration || 3000);
  },

  /** Display an error message with clean extraction */
  error(err: unknown, defaultMessage: string = 'حدث خطأ غير متوقع', title: string = '⚠️ تنبيه'): void {
    let message = defaultMessage;
    if (typeof err === 'string') {
      message = err;
    } else if (err instanceof Error) {
      message = err.message || defaultMessage;
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
      message = String((err as any).message);
    }
    emitToast('error', title, message, 4500);
    console.warn(`[AN-POS Notify Error] ${title}: ${message}`, err);
  },

  /** Display a warning alert or toast */
  warning(message: string, title: string = 'تنبيه', options?: NotifyOptions): void {
    emitToast('warning', title, message, 4000);
  },

  /** Display an informational message */
  info(message: string, title: string = 'معلومة', options?: NotifyOptions): void {
    emitToast('info', title, message, 3000);
  },

  /** Standard confirmation dialog with Promise support */
  confirm(
    message: string,
    title: string = 'تأكيد الإجراء',
    confirmText: string = 'تأكيد',
    cancelText: string = 'إلغاء'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: cancelText,
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: confirmText,
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  },

  /** Subscribe to in-app toast stream */
  subscribe(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function emitToast(type: NotifyType, title: string, message: string, duration: number) {
  if (activeToastTimeout) {
    clearTimeout(activeToastTimeout);
  }

  const toast: ToastMessage = {
    id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type,
    title,
    message,
    timestamp: Date.now(),
  };

  listeners.forEach((listener) => {
    try {
      listener(toast);
    } catch {}
  });

  activeToastTimeout = setTimeout(() => {
    listeners.forEach((listener) => {
      try {
        listener(null);
      } catch {}
    });
    activeToastTimeout = null;
  }, duration);
}

export default notify;
