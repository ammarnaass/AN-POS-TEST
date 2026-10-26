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
  Printer,
  FileText,
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

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
  autoPrintReceipt?: boolean;
  onToggleAutoPrint?: () => void;
  onOpenSalesHistory?: () => void;
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
  autoPrintReceipt = false,
  onToggleAutoPrint,
  onOpenSalesHistory,
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

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

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 flex-shrink-0 shadow-md select-none gap-2 overflow-x-auto no-scrollbar">
      {/* Brand & Meta */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40 border border-blue-400/30">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-white"
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
            <div className="font-extrabold text-sm sm:text-base tracking-wider flex items-center gap-1 sm:gap-1.5 text-white">
              <span>AN</span>
              <span className="text-sky-400 font-black">POS</span>
              <span className="text-[9px] sm:text-[10px] bg-blue-700/70 text-sky-200 px-1 sm:px-1.5 py-0.5 rounded font-mono border border-blue-500/30">
                PRO WORKSTATION
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-300 font-medium block truncate max-w-[120px] sm:max-w-[180px] md:max-w-[240px] lg:max-w-[320px]">
              {storeName}
            </span>
          </div>
        </div>

        <div className="h-6 sm:h-7 w-[1px] bg-slate-700/60 mx-0.5 hidden md:block"></div>

        {/* Cashier User Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block leading-none">
              الكاشير النشط:
            </span>
            <span className="font-bold text-slate-200">{userName}</span>
          </div>
        </div>

        {/* Invoice Number */}
        <div className="bg-slate-800/90 px-2 sm:px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1 sm:gap-2 text-xs shrink-0">
          <span className="text-slate-400 hidden xs:inline">فاتورة رقم:</span>
          <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
            #{invoiceNumber}
          </span>
        </div>

        {/* Pending Queue Badge */}
        <button
          type="button"
          onClick={onOpenSuspended}
          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs transition duration-150 cursor-pointer shrink-0 active:scale-95"
          title="عرض المبيعات المعلقة"
        >
          <span className="relative flex h-2 w-2">
            {suspendedCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-[11px] sm:text-xs">
            <span className="hidden sm:inline">معلق بالانتظار: </span>
            <span className="sm:hidden">معلق: </span>
            <strong className="font-bold text-amber-200">{suspendedCount}</strong>
          </span>
        </button>
      </div>

      {/* Right Header: Customer & Window Actions & Clock */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Active Customer Selector */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 hover:bg-slate-700 px-2 sm:px-3 py-1 rounded-lg border border-slate-700 transition cursor-pointer shrink-0 active:scale-95"
          title="تغيير أو اختيار الزبون"
        >
          <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="text-right">
            <div className="text-[9px] sm:text-[10px] text-slate-400 leading-none hidden xs:block">الزبون الحالي</div>
            <div className="text-xs font-bold text-white tracking-wide max-w-[85px] sm:max-w-[120px] md:max-w-[140px] truncate">
              {selectedCustomerName || 'ANONYME (زبون عام)'}
            </div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 mr-0.5" />
        </button>

        {/* Live Clock & Date (visible on XL screens to preserve space on 1024x768 / 1366x768) */}
        <div className="hidden xl:flex items-center gap-2.5 bg-slate-950/70 px-3 py-1 rounded-lg border border-slate-800 text-xs font-mono shrink-0">
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

        {/* Sales History button */}
        {onOpenSalesHistory && (
          <button
            type="button"
            onClick={onOpenSalesHistory}
            className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
            title="سجل المبيعات والفواتير"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">السجل</span>
          </button>
        )}

        {/* Auto-print toggle button */}
        {onToggleAutoPrint && (
          <button
            type="button"
            onClick={onToggleAutoPrint}
            className={`h-8 px-2 sm:px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0 border ${
              autoPrintReceipt
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={autoPrintReceipt ? 'الطباعة التلقائية مفعلة (انقر للتعطيل)' : 'الطباعة التلقائية معطلة (انقر للتفعيل)'}
          >
            <Printer className={`w-3.5 h-3.5 ${autoPrintReceipt ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline">طباعة</span>
            <span className={`w-1.5 h-1.5 rounded-full ${autoPrintReceipt ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Customize button */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
            title="تخصيص الواجهة ودقة الشاشة (F9)"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">تخصيص</span>
            <span className="text-[10px] text-purple-300 font-mono hidden md:inline">F9</span>
          </button>
        )}

        {/* Window Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/50 p-0.5 sm:p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700 text-xs transition cursor-pointer active:scale-90"
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700 text-xs transition cursor-pointer active:scale-90 hidden xs:flex"
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
              className="w-7 h-7 flex items-center justify-center rounded text-rose-300 hover:text-white hover:bg-rose-600/80 text-xs transition cursor-pointer active:scale-90"
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
