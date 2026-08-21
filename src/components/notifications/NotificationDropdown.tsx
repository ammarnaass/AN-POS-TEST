import { useState, useRef, useEffect } from 'react';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, Info, CheckCircle, AlertOctagon } from 'lucide-react';

interface NotificationDropdownProps {
  children: React.ReactNode;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'error':
      return <AlertOctagon className="w-4 h-4 text-error" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-tertiary" />;
    default:
      return <Info className="w-4 h-4 text-primary" />;
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
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString('ar-DZ');
};

export default function NotificationDropdown({ children }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationStore();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div ref={buttonRef} className="relative inline-flex">
        <div onClick={handleToggle} className="cursor-pointer">
          {children}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] flex items-center justify-center bg-error text-on-error text-[10px] font-bold rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div ref={dropdownRef} className="fixed w-80 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant z-[9999] overflow-hidden" style={{ top: position.top, left: position.left }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-on-surface" />
              <h3 className="font-headline-md text-on-surface">الاشعارات</h3>
              {unreadCount > 0 && (
                <span className="bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant" title="تعيين الكل كمقروء">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-error/10 transition-colors text-on-surface-variant hover:text-error" title="مسح الكل">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-body-md">لا توجد اشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/50 transition-colors cursor-pointer hover:bg-surface-container-low ${
                    !notification.read ? 'bg-primary-fixed/5' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-label-md text-on-surface truncate">{notification.title}</p>
                      {!notification.read && <div className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-body-sm text-outline mt-1">{getTimeAgo(notification.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="p-1 rounded-lg hover:bg-error/10 transition-colors text-outline hover:text-error shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          </div>
        </>
      )}
    </>
  );
}
