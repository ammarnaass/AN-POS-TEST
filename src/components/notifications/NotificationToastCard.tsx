import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/store/notificationStore';

interface NotificationToastCardProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const getToastConfig = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        badgeText: 'نجاح',
        glowColor: 'shadow-emerald-500/10 border-emerald-500/30',
        barColor: 'bg-emerald-500',
        pulseDot: 'bg-emerald-500',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        badgeText: 'تنبيه',
        glowColor: 'shadow-amber-500/10 border-amber-500/30',
        barColor: 'bg-amber-500',
        pulseDot: 'bg-amber-500',
      };
    case 'error':
      return {
        icon: <AlertOctagon className="w-5 h-5 text-rose-500" />,
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        badgeText: 'خطأ',
        glowColor: 'shadow-rose-500/10 border-rose-500/30',
        barColor: 'bg-rose-500',
        pulseDot: 'bg-rose-500',
      };
    case 'info':
    default:
      return {
        icon: <Info className="w-5 h-5 text-blue-500" />,
        badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
        badgeText: 'إشعار',
        glowColor: 'shadow-blue-500/10 border-blue-500/30',
        barColor: 'bg-blue-500',
        pulseDot: 'bg-blue-500',
      };
  }
};

export const NotificationToastCard: React.FC<NotificationToastCardProps> = ({
  notification,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);
  const duration = notification.duration ?? (notification.type === 'error' ? 8000 : 5000);
  const [progress, setProgress] = useState(100);

  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = getToastConfig(notification.type);

  // إعداد المؤقت الزمني للإغلاق التلقائي
  useEffect(() => {
    if (duration <= 0) return; // إشعار دائم

    if (!isHovered) {
      startTimeRef.current = Date.now();
      const currentRemaining = remainingRef.current;

      timerRef.current = setTimeout(() => {
        onDismiss(notification.id);
      }, currentRemaining);

      const stepMs = 50;
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const left = Math.max(0, currentRemaining - elapsed);
        setProgress((left / duration) * 100);
      }, stepMs);
    } else {
      // عند التوقف فوق البطاقة بالفأرة
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isHovered, duration, notification.id, onDismiss]);

  const handleActionClick = () => {
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
    onDismiss(notification.id);
  };

  return (
    <div
      role="alert"
      dir="rtl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border ${config.glowColor} shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:shadow-3xl pointer-events-auto select-none`}
      style={{
        animation: 'slideInBottomLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div className="p-3.5 sm:p-4">
        {/* Header: Type Badge, Icon, and Close Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex items-center justify-center p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
              {config.icon}
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.pulseDot} animate-ping opacity-75`}
              />
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.pulseDot}`}
              />
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}`}
            >
              {config.badgeText}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              الآن
            </span>
          </div>

          <button
            onClick={() => onDismiss(notification.id)}
            title="إغلاق التنبيه"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Title & Message */}
        <div className="pr-1">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug break-words">
            {notification.title}
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words line-clamp-3">
            {notification.message}
          </p>
        </div>

        {/* Interactive Action Button (if provided) */}
        {notification.action && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
            <button
              onClick={handleActionClick}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-white dark:hover:bg-blue-500 text-white dark:text-slate-900 dark:hover:text-white text-[11px] font-bold shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <span>{notification.action.label}</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Animated Countdown Progress Bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${config.barColor} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
