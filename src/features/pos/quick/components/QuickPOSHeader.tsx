import React from 'react';
import {
  Menu,
  Printer,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { QuickPOSClock } from './QuickPOSClock';
import { formatMoney } from '../../utils/format';

interface QuickPOSHeaderProps {
  shopName: string;
  cartCount: number;
  totalPiecesCount?: number;
  totalAmount: number;
  appliedDiscount?: number;
  baseCurrency: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  onNavigateHome: () => void;
  onNavigateAdvancedPOS: () => void;
  onOpenSidebar: () => void;
  theme: string;
  onToggleTheme: () => void;
  cashierName?: string;
  terminalName?: string;
}

export const QuickPOSHeader: React.FC<QuickPOSHeaderProps> = React.memo(({
  shopName,
  cartCount,
  totalPiecesCount = 0,
  totalAmount,
  appliedDiscount = 0,
  baseCurrency,
  soundEnabled,
  onToggleSound,
  autoPrintReceipt,
  onToggleAutoPrint,
  onNavigateHome,
  onNavigateAdvancedPOS,
  onOpenSidebar,
  theme,
  onToggleTheme,
  cashierName = 'محمد العربي',
  terminalName = '#POS-01',
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs flex-shrink-0 z-30 transition-colors" data-purpose="top-navigation">
      {/* 1. TOP MICRO BAR */}
      <div className="px-3 sm:px-4 py-1.5 bg-slate-900 text-slate-200 flex items-center justify-between text-xs border-b border-slate-800">
        {/* Right / Start (in RTL) */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400 whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            نظام نقاط البيع - AN POS v4.2
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden md:inline whitespace-nowrap">
            نقطة البيع الرئيسية: {terminalName}
          </span>
          <span className="text-slate-600 hidden lg:inline">|</span>
          {/* Quick Keyboard Shortcut Badges */}
          <div className="hidden lg:flex items-center gap-2 text-slate-300">
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700">
              F1 دفع فوري
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700">
              F2 تعليق
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700">
              F4 تفريغ
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700">
              F7 باركود
            </span>
          </div>
        </div>

        {/* Left / End (in RTL) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <QuickPOSClock />
          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Auto Print Toggle Button */}
          <button
            onClick={onToggleAutoPrint}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
              autoPrintReceipt
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={autoPrintReceipt ? 'الطباعة الفورية مفعّلة (F5)' : 'الطباعة الفورية معطلة (F5)'}
            type="button"
          >
            <Printer className={`w-3.5 h-3.5 ${autoPrintReceipt ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">طباعة فورية</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            title={soundEnabled ? 'صوت التنبيه مفعل' : 'صوت التنبيه معطل'}
            type="button"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'}
            type="button"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Menu Sidebar Toggle */}
          <button
            onClick={onOpenSidebar}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="القائمة الرئيسية"
            type="button"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Cashier Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-brand-500/20 shrink-0">
            AN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
                {shopName || 'متجر AN POS'}
              </h1>
              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200/60 dark:border-amber-700/40">
                ⚡ نقطة البيع السريع
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              المستخدم: {cashierName} (PRO)
            </p>
          </div>
        </div>

        {/* HUGE PROMINENT GRAND TOTAL DISPLAY BANNER */}
        <div
          className="flex items-center gap-3 sm:gap-4 bg-gradient-to-l from-amber-50 via-orange-50 to-amber-100/70 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/40 border-2 border-amber-300/80 dark:border-amber-600/60 px-4 sm:px-6 py-1.5 rounded-2xl shadow-inner"
          data-purpose="grand-total-banner"
        >
          <div className="text-right">
            <div className="text-[11px] sm:text-[12px] font-semibold text-amber-900 dark:text-amber-300 tracking-wide flex items-center gap-1.5 justify-end">
              <span>المجموع الإجمالي المستحق</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse"></span>
            </div>
            {/* Huge Grand Total Typography */}
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1.5 font-sans">
              <span className="text-brand-600 dark:text-brand-400 font-extrabold font-mono">
                {formatMoney(totalAmount)}
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300">
                {baseCurrency || 'دج'}
              </span>
            </div>
          </div>

          {/* Metric badges inside total banner */}
          <div className="h-9 w-px bg-amber-300 dark:bg-amber-700 mx-1 hidden sm:block"></div>
          <div className="hidden sm:flex flex-col text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">عدد الأصناف:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md shadow-2xs border border-amber-200/50 dark:border-slate-700 font-mono">
                {cartCount} أصناف {totalPiecesCount > 0 ? `(${totalPiecesCount} ق)` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">الخصم المطبق:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatMoney(appliedDiscount)} {baseCurrency || 'دج'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Operations */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateAdvancedPOS}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            title="الانتقال إلى نقطة البيع المتقدمة"
            type="button"
          >
            <Layers className="w-4 h-4" />
            <span>نقطة البيع المتقدمة PRO</span>
          </button>
          <button
            onClick={onNavigateHome}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer"
            title="الرجوع إلى الرئيسية"
            type="button"
          >
            <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>الرجوع</span>
          </button>
        </div>
      </div>
    </header>
  );
});
