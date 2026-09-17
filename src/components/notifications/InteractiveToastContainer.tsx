import React from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationToastCard } from './NotificationToastCard';
import { Bell, Layers, X } from 'lucide-react';

export const InteractiveToastContainer: React.FC = () => {
  const activeToasts = useNotificationStore((s) => s.activeToasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const clearActiveToasts = useNotificationStore((s) => s.clearActiveToasts);
  const openCenter = useNotificationStore((s) => s.openCenter);

  if (activeToasts.length === 0) return null;

  // إظهار أحدث 3 إشعارات فقط لتفادي حجب الشاشة
  const visibleToasts = activeToasts.slice(0, 3);
  const hiddenCount = activeToasts.length - visibleToasts.length;

  return (
    <div
      dir="rtl"
      aria-live="polite"
      className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-[9999] flex flex-col-reverse gap-2.5 max-w-[320px] sm:max-w-sm w-full pointer-events-none"
    >
      {/* بطاقات الإشعارات النشطة */}
      {visibleToasts.map((notification) => (
        <NotificationToastCard
          key={notification.id}
          notification={notification}
          onDismiss={dismissToast}
        />
      ))}

      {/* شريط الإشعارات الإضافية عند تكديس أكثر من 3 إشعارات */}
      {hiddenCount > 0 && (
        <div className="pointer-events-auto flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-800/90 text-white backdrop-blur-md shadow-lg border border-slate-700/50 text-[11px] font-bold">
          <button
            onClick={openCenter}
            className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
            type="button"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>+{hiddenCount} إشعارات أخرى في المركز</span>
          </button>
          <button
            onClick={clearActiveToasts}
            title="إخفاء كل التنبيهات المنبثقة"
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
