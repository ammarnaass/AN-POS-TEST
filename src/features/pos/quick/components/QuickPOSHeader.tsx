import React from 'react';
import {
  Menu,
  Zap,
  ArrowRight,
  Layers,
  Volume2,
  VolumeX,
  Printer,
  Sun,
  Moon,
} from 'lucide-react';
import { QuickPOSClock } from './QuickPOSClock';
import { formatMoney } from '../../utils/format';

interface QuickPOSHeaderProps {
  shopName: string;
  cartCount: number;
  totalAmount: number;
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
}

export const QuickPOSHeader: React.FC<QuickPOSHeaderProps> = React.memo(({
  shopName,
  cartCount,
  totalAmount,
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
}) => {
  return (
    <header className="h-14 px-3 sm:px-4 bg-surface-container border-b border-outline-variant/20 flex items-center justify-between shrink-0 shadow-xs z-20 gap-2">
      {/* Left / Start: Back button, Menu Toggle, Brand & Mode Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Back button */}
        <button
          onClick={onNavigateHome}
          className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary/10 via-primary/15 to-blue-500/10 hover:from-primary/20 hover:to-blue-500/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-black transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          title="الرجوع إلى لوحة التحكم الرئيسية"
        >
          <ArrowRight className="w-4 h-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
          <span className="font-cairo font-black text-xs hidden sm:inline">الرجوع</span>
        </button>

        {/* Menu Toggle */}
        <button
          onClick={onOpenSidebar}
          className="text-on-surface-variant hover:text-primary p-2 sm:p-2.5 rounded-xl bg-surface-container/70 hover:bg-surface-container-high border border-outline-variant/25 hover:border-primary/40 transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center"
          title="فتح القائمة الجانبية"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="h-5 w-px bg-outline-variant/25 mx-0.5 hidden xs:block" />

        {/* Shop identity badge */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-extrabold shadow-sm shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold tracking-tight text-on-surface truncate max-w-[110px]">
                {shopName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-600 border border-amber-500/30">
                ⚡ كاشير سريع
              </span>
            </div>
          </div>
        </div>

        {/* Switch to Advanced POS Button */}
        <button
          onClick={onNavigateAdvancedPOS}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0 active:scale-95 border border-primary/40"
          title="الانتقال إلى نقطة البيع المتقدمة"
        >
          <Layers className="w-4 h-4" />
          <span className="font-cairo font-bold hidden sm:inline">نقطة البيع المتقدمة</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-white/20 text-white rounded font-mono font-bold shadow-2xs">PRO</span>
        </button>
      </div>

      {/* Center: Dominant Total Bar */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="px-3.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <span className="text-xs font-bold">المجموع ({cartCount} أصناف):</span>
          <span className="text-base sm:text-lg font-black font-mono tracking-tight">
            {formatMoney(totalAmount)} {baseCurrency}
          </span>
        </div>
      </div>

      {/* Right / End Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          title={soundEnabled ? 'صوت التنبيه مفعل' : 'صوت التنبيه معطل'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
        </button>

        {/* Auto Print Toggle */}
        <button
          onClick={onToggleAutoPrint}
          className={`px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            autoPrintReceipt
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              : 'bg-surface text-on-surface-variant border-outline-variant/20'
          }`}
          title="طباعة الإيصال فورياً عند الدفع"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden md:inline">طباعة فورية</span>
        </button>

        {/* Isolated Clock (no re-renders of parent) */}
        <QuickPOSClock />

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
});
