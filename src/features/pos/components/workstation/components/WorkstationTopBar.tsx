import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Clock,
  Calendar,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Power,
  ChevronDown,
  Sliders,
} from 'lucide-react';

interface WorkstationTopBarProps {
  storeName?: string;
  userName?: string;
  invoiceNumber?: number | string;
  suspendedCount: number;
  onOpenSuspended: () => void;
  selectedCustomerName: string;
  onSelectCustomer: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onNavigateBack?: () => void;
  onOpenCustomize?: () => void;
}

export const WorkstationTopBar: React.FC<WorkstationTopBarProps> = ({
  storeName = 'سوبرماركت النور والبركة • نقطة البيع السريعة',
  userName = 'مدير النظام (Admin)',
  invoiceNumber = 3,
  suspendedCount = 0,
  onOpenSuspended,
  selectedCustomerName = 'ANONYME (زبون عام)',
  onSelectCustomer,
  onToggleFullscreen,
  isFullscreen = false,
  onNavigateBack,
  onOpenCustomize,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);

      const d = String(now.getDate()).padStart(2, '0');
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      setDateStr(`${d}-${mo}-${y}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 py-2 flex-shrink-0 shadow-md select-none">
      {/* Brand & Meta */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-900/40 border border-blue-400/30">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="13" rx="2" />
              <line x1="2" y1="9" x2="22" y2="9" />
              <circle cx="6" cy="13" r="1" fill="currentColor" />
              <circle cx="10" cy="13" r="1" fill="currentColor" />
              <circle cx="14" cy="13" r="1" fill="currentColor" />
              <circle cx="18" cy="13" r="1" fill="currentColor" />
              <path d="M4 17l2 4h12l2-4" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-base tracking-wider flex items-center gap-1.5 text-white">
              <span>AN</span>
              <span className="text-sky-400 font-black">POS</span>
              <span className="text-[10px] bg-blue-700/70 text-sky-200 px-1.5 py-0.5 rounded font-mono border border-blue-500/30">
                PRO WORKSTATION
              </span>
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {storeName}
            </span>
          </div>
        </div>

        <div className="h-7 w-[1px] bg-slate-700/60 mx-1 hidden sm:block"></div>

        {/* Cashier User Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block leading-none">
              الكاشير النشط:
            </span>
            <span className="font-bold text-slate-200">{userName}</span>
          </div>
        </div>

        {/* Invoice Number */}
        <div className="bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-2 text-xs">
          <span className="text-slate-400">فاتورة رقم:</span>
          <span className="font-mono font-bold text-amber-300 text-sm">
            #{invoiceNumber}
          </span>
        </div>

        {/* Pending Queue Badge */}
        <button
          type="button"
          onClick={onOpenSuspended}
          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-2 text-xs transition duration-150 cursor-pointer"
          title="عرض المبيعات المعلقة"
        >
          <span className="relative flex h-2 w-2">
            {suspendedCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>
            معلق بالانتظار:{' '}
            <strong className="font-bold text-amber-200">{suspendedCount}</strong>
          </span>
        </button>
      </div>

      {/* Right Header: Customer & Window Actions & Clock */}
      <div className="flex items-center gap-3">
        {/* Active Customer Selector */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 px-3 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
          title="تغيير أو اختيار الزبون"
        >
          <User className="w-3.5 h-3.5 text-sky-400" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 leading-none">الزبون الحالي</div>
            <div className="text-xs font-bold text-white tracking-wide max-w-[130px] truncate">
              {selectedCustomerName || 'ANONYME (زبون عام)'}
            </div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 mr-1" />
        </button>

        {/* Live Clock & Date */}
        <div className="hidden md:flex items-center gap-2.5 bg-slate-950/70 px-3 py-1 rounded-lg border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-sky-300 font-bold tracking-wide">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr || '00:00:00'}</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Customize button */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="تخصيص الواجهة ودقة الشاشة"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">تخصيص</span>
          </button>
        )}

        {/* Window Actions */}
        <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700 text-xs transition cursor-pointer"
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700 text-xs transition cursor-pointer"
              title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {onNavigateBack && (
            <button
              type="button"
              onClick={onNavigateBack}
              className="w-7 h-7 flex items-center justify-center rounded text-rose-300 hover:text-white hover:bg-rose-600/80 text-xs transition cursor-pointer"
              title="خروج من نقطة البيع"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
