import React, { useState, useRef, useEffect, useMemo, useTransition, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useInRouterContext } from 'react-router-dom';
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
  Wallet,
} from 'lucide-react';
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from '@/store/notificationStore';

interface NotificationDropdownProps {
  children: React.ReactNode;
  hideBadge?: boolean;
}

type FilterTab = 'all' | 'unread' | 'debt' | 'alerts' | 'success';

const getNotificationIcon = (type: NotificationType, category?: string) => {
  if (category === 'debt') {
    return <Wallet className="w-3.5 h-3.5 text-indigo-500" />;
  }
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case 'error':
      return <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />;
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'info':
    default:
      return <Info className="w-3.5 h-3.5 text-blue-500" />;
  }
};

const getNotificationBg = (type: NotificationType, category?: string) => {
  if (category === 'debt') {
    return 'bg-indigo-500/10 border-indigo-500/20';
  }
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

function RouterNavListener({ onNavigate }: { onNavigate: (nav: (to: string) => void) => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    onNavigate(navigate);
  }, [navigate, onNavigate]);
  return null;
}

export default function NotificationDropdown({
  children,
  hideBadge = false,
}: NotificationDropdownProps) {
  const inRouter = useInRouterContext();
  const navigateRef = useRef<((to: string) => void) | null>(null);
  const handleSetNavigate = useCallback((nav: (to: string) => void) => {
    navigateRef.current = nav;
  }, []);

  const [, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 380 });

  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const soundEnabled = useNotificationStore((s) => s.soundEnabled);
  const toggleSound = useNotificationStore((s) => s.toggleSound);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(380, window.innerWidth - 32);

    // محاذاة القائمة المنسدلة بجانب/تحت الزر مع الحفاظ على هوامش الشاشة
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    const top = rect.bottom + 8;
    setPosition({ top, left, width: dropdownWidth });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'debt':
        return notifications.filter((n) => n.category === 'debt');
      case 'alerts':
        return notifications.filter((n) => (n.type === 'warning' || n.type === 'error') && n.category !== 'debt');
      case 'success':
        return notifications.filter((n) => (n.type === 'success' || n.type === 'info') && n.category !== 'debt');
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const handleActionClick = (notification: Notification) => {
    if (notification.action) {
      if (notification.action.onClick) {
        notification.action.onClick();
      }
      if (notification.action.link) {
        const link = notification.action.link;
        startTransition(() => {
          if (navigateRef.current) {
            navigateRef.current(link);
          } else if (typeof window !== 'undefined') {
            window.location.hash = link;
          }
        });
      }
    }
    markAsRead(notification.id);
    setIsOpen(false);
  };

  return (
    <>
      {inRouter && <RouterNavListener onNavigate={handleSetNavigate} />}
      {/* زر التنبيهات المغلف */}
      <div ref={buttonRef} className="relative inline-flex">
        <div
          onClick={handleToggle}
          className="cursor-pointer inline-flex items-center justify-center relative select-none"
          title="الإشعارات والتنبيهات"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
            }
          }}
        >
          {children}
          {!hideBadge && unreadCount > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold rounded-full px-1 shadow-sm pointer-events-none animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* القائمة المنسدلة المتموضعة بجانب الزر مباشرة عبر Portal لمنع الاقتصاص */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

          <div
            ref={dropdownRef}
            dir="rtl"
            role="menu"
            aria-label="قائمة الإشعارات المنسدلة"
            className="fixed z-[9999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: 'calc(100vh - 120px)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                    الإشعارات
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} غير مقروءة` : 'لا توجد إشعارات جديدة'}
                  </p>
                </div>
              </div>

              {/* Header Action Icons */}
              <div className="flex items-center gap-1">
                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  type="button"
                  title={soundEnabled ? 'كتم صوت التنبيهات' : 'تفعيل صوت التنبيهات'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Mark All Read */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    type="button"
                    title="تحديد الكل كمقروء"
                    className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Clear All */}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    type="button"
                    title="مسح السجل"
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  type="button"
                  title="إغلاق"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto custom-scrollbar-none bg-white dark:bg-slate-900 shrink-0">
              <button
                onClick={() => setActiveTab('all')}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                الكل ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                غير مقروءة ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab('debt')}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'debt'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                الديون ({notifications.filter((n) => n.category === 'debt').length})
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'alerts'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                تنبيهات
              </button>
              <button
                onClick={() => setActiveTab('success')}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                نجاح
              </button>
            </div>

            {/* Notifications Scrollable List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] p-2 space-y-1.5 custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredNotifications.length === 0 ? (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">لا توجد إشعارات حالياً</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const bgBadge = getNotificationBg(notification.type, notification.category);
                  const icon = getNotificationIcon(notification.type, notification.category);

                  return (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`pt-1.5 first:pt-0 group relative p-2.5 rounded-xl transition-all cursor-pointer border ${
                        !notification.read
                          ? 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/40'
                          : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Icon Circle */}
                        <div
                          className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center border ${bgBadge}`}
                        >
                          {icon}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4
                                className={`text-xs font-bold truncate ${
                                  !notification.read
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Action Button & Delete */}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {notification.action ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick(notification);
                                }}
                                type="button"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                              >
                                <span>{notification.action.label}</span>
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <div />
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              title="حذف"
                              type="button"
                              className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
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
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
              <span>{notifications.length} إشعار في السجل</span>
              <button
                onClick={() => setIsOpen(false)}
                type="button"
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
