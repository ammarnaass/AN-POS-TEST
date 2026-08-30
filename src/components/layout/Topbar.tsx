import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { getTrialState } from '@/services/trialService';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  DollarSign,
  Clock,
  Zap,
} from 'lucide-react';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user: currentUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const trial = getTrialState();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('ar-DZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: allSessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const shopName = rawSettings?.shopName || 'AN POS';
  const currentSession = allSessions.find((s) => s.status === 'open') || null;

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center w-full h-16 px-3 sm:px-6 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm no-print">
      {/* ── الجانب الأيمن: زر القائمة للشاشات الصغيرة + اسم المحل + البحث ──────────── */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-on-surface-variant hover:text-on-surface p-2 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
          title="القائمة الرئيسية"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* اسم المحل على الشاشات الصغيرة (عندما يكون الشريط الجانبي مغلقاً) */}
        <div className="lg:hidden flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-black text-on-surface font-cairo truncate">
            {shopName}
          </span>
        </div>

        {/* حقل البحث السريع */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-4 h-4 absolute right-3.5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="بحث سريع في الفواتير أو المنتجات..."
            className="bg-surface border border-outline-variant/25 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl pr-10 pl-4 py-2 w-48 lg:w-72 text-xs font-semibold text-right transition-all placeholder:text-on-surface-variant/50"
          />
        </div>
      </div>

      {/* ── الجانب الأيسر: حالة الصندوق + الساعة + الثيم + الإشعارات ───── */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* ساعة النظام الحية */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/15 text-xs font-bold text-on-surface-variant">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span dir="ltr">{timeStr}</span>
        </div>

        {/* حالة جلسة الصندوق */}
        {currentSession ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <DollarSign className="w-3.5 h-3.5" />
            <span className="truncate">جلسة #{currentSession.sessionNumber || 'مفتوحة'}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 text-xs font-bold">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            <span>الصندوق مغلق</span>
          </div>
        )}

        {/* شارة النسخة التجريبية إن وجدت */}
        {trial.isActive && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-500/10 text-purple-600 rounded-xl border border-purple-500/20 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            <span>متبقي {trial.remainingSales} فواتير</span>
          </div>
        )}

        {/* زر الإشعارات */}
        <NotificationDropdown>
          <button
            className="p-2 sm:p-2.5 rounded-xl bg-surface hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/15 transition-all active:scale-95 cursor-pointer shadow-sm relative"
            title="الإشعارات والتنبيهات"
          >
            <Bell className="w-4 h-4" />
          </button>
        </NotificationDropdown>

        {/* زر تبديل الوضع الليلي / النهاري */}
        <button
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-xl bg-surface hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/15 transition-all active:scale-95 cursor-pointer shadow-sm"
          title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
}
