import React, { useState, useTransition, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Volume2,
  VolumeX,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from '@/store/notificationStore';

type FilterTab = 'all' | 'unread' | 'alerts' | 'success';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'error':
      return <AlertOctagon className="w-4 h-4 text-rose-500" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'info':
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const getNotificationBg = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'error':
      return 'bg-rose-500/10 border-rose-500/20';
    case 'success':
      return 'bg-emerald-500/10 border-emerald-500/20';
    case 'info':
    default:
      return 'bg-blue-500/10 border-blue-500/20';
  }
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'الآن';
  if (diffMin === 1) return 'منذ دقيقة';
  if (diffMin === 2) return 'منذ دقيقتين';
  if (diffMin <= 10) return `منذ ${diffMin} دقائق`;
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours === 1) return 'منذ ساعة';
  if (diffHours === 2) return 'منذ ساعتين';
  if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays <= 10) return `منذ ${diffDays} أيام`;
  return date.toLocaleDateString('ar-DZ');
};

export const NotificationCenterModal: React.FC = () => {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const isCenterOpen = useNotificationStore((s) => s.isCenterOpen);
  const closeCenter = useNotificationStore((s) => s.closeCenter);
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const soundEnabled = useNotificationStore((s) => s.soundEnabled);
  const toggleSound = useNotificationStore((s) => s.toggleSound);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'alerts':
        return notifications.filter((n) => n.type === 'warning' || n.type === 'error');
      case 'success':
        return notifications.filter((n) => n.type === 'success' || n.type === 'info');
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  if (!isCenterOpen) return null;

  const handleActionClick = (notification: Notification) => {
    if (notification.action) {
      if (notification.action.onClick) {
        notification.action.onClick();
      }
      if (notification.action.link) {
        const link = notification.action.link;
        startTransition(() => {
          navigate(link);
        });
      }
    }
    markAsRead(notification.id);
    closeCenter();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={closeCenter} />

      {/* Main Center Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 text-white text-[9px] font-black items-center justify-center font-mono">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </div>
            <div>
              <h3
                id="notification-center-title"
                className="text-base font-extrabold text-slate-900 dark:text-white"
              >
                مركز الإشعارات والتنبيهات
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {notifications.length} إشعار مسجل • {unreadCount} غير مقروء
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-1">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              type="button"
              title={soundEnabled ? 'كتم صوت التنبيهات' : 'تفعيل صوت التنبيهات'}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                type="button"
                title="تحديد الكل كمقروء"
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}

            {/* Clear All */}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                type="button"
                title="مسح سجل الإشعارات"
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={closeCenter}
              type="button"
              title="إغلاق"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar-none bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            الكل ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'unread'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            غير مقروءة ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            تنبيهات وأخطاء
          </button>
          <button
            onClick={() => setActiveTab('success')}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'success'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            نجاح ومعلومات
          </button>
        </div>

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/40 custom-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-600">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                لا توجد إشعارات في هذا التبويب
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                كل شيء يعمل على ما يرام، ستظهر التنبيهات الفورية هنا وفي أسفل الشاشة تلقائياً.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const bgBadge = getNotificationBg(notification.type);
              const icon = getNotificationIcon(notification.type);

              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`pt-2.5 first:pt-0 group relative p-3 rounded-2xl transition-all duration-150 cursor-pointer border ${
                    !notification.read
                      ? 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/40'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon Circle */}
                    <div
                      className={`p-2 rounded-xl shrink-0 flex items-center justify-center border ${bgBadge}`}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4
                            className={`text-xs sm:text-sm font-extrabold truncate ${
                              !notification.read
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed break-words line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Action Button & Delete Row */}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        {notification.action ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notification);
                            }}
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <span>{notification.action.label}</span>
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          title="حذف هذا الإشعار"
                          type="button"
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <span>تظهر التنبيهات الفورية تلقائياً في أسفل الشاشة على الجانب الأيسر</span>
          <button
            onClick={closeCenter}
            type="button"
            className="font-bold text-blue-600 hover:underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
