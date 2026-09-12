import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ScanLine,
  Zap,
  Menu,
  X,
  Layers,
  Minimize,
  Maximize,
  HelpCircle,
  Wallet,
  Keyboard,
  Bell,
  Smartphone,
  CloudCheck,
  Sun,
  Moon,
  SlidersHorizontal,
  RotateCcw,
  Star,
  Sparkles,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import type { Product, CashSession, User } from '@/types';

export interface POSTopBarProps {
  currentUser?: User | null;
  trial: { isActive: boolean; remainingDays: number; remainingSales: number };
  isLicensed: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  unreadCount: number;
  openSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  barcodeHeaderInput: string;
  setBarcodeHeaderInput: (val: string) => void;
  onExternalScan: (barcode: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  products: Product[];
  onAddProduct: (product: Product) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  currentSession: CashSession | null;
  onOpenSession: () => void;
  wholesaleMode: boolean;
  toggleWholesaleMode: () => void;
  onSelectPriceTier: (tier: '1' | '2' | '3' | '4') => void;
  isWholesaleActive: boolean;
  onOpenShortcuts: () => void;
  onOpenFilters: () => void;
  activeFiltersCount: number;
  onClearAllFilters: () => void;
  isFeaturedOnly: boolean;
  setIsFeaturedOnly: (val: boolean) => void;
  returnMode: boolean;
  setReturnMode: (val: boolean) => void;
  clearCart: () => void;
  onOpenReturnSale: () => void;
  onOpenFreeProduct: () => void;
  onOpenCustomize: () => void;
  onNotify?: (n: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
}

export const POSTopBar: React.FC<POSTopBarProps> = ({
  currentUser,
  trial,
  isLicensed,
  theme,
  toggleTheme,
  unreadCount,
  openSidebar,
  searchQuery,
  setSearchQuery,
  barcodeHeaderInput,
  setBarcodeHeaderInput,
  onExternalScan,
  searchInputRef,
  barcodeInputRef,
  products,
  onAddProduct,
  isFullscreen,
  toggleFullscreen,
  currentSession,
  onOpenSession,
  wholesaleMode,
  toggleWholesaleMode,
  onSelectPriceTier,
  isWholesaleActive,
  onOpenShortcuts,
  onOpenFilters,
  activeFiltersCount,
  onClearAllFilters,
  isFeaturedOnly,
  setIsFeaturedOnly,
  returnMode,
  setReturnMode,
  clearCart,
  onOpenReturnSale,
  onOpenFreeProduct,
  onOpenCustomize,
  onNotify,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* ========================================================= */}
      {/* ZONE 1: TOP HEADER                                        */}
      {/* ========================================================= */}
      <header className="h-16 px-3 sm:px-4 bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-outline-variant/20 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20 shadow-xs">
        {/* Right Side (RTL): Menu Toggle + Search + Barcode + Trial Badge */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-3xl">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary/10 via-primary/15 to-blue-500/10 hover:from-primary/20 hover:to-blue-500/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-black transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
            title="الرجوع إلى لوحة التحكم الرئيسية"
          >
            <ArrowRight className="w-4 h-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
            <span className="font-cairo font-black text-xs hidden sm:inline">الرجوع</span>
          </button>

          {/* Sidebar Menu Button */}
          <button
            onClick={openSidebar}
            className="text-on-surface-variant hover:text-primary p-2 sm:p-2.5 rounded-xl bg-surface-container/70 hover:bg-surface-container-high border border-outline-variant/25 hover:border-primary/40 transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center"
            title="القائمة الجانبية"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Quick POS Button */}
          <button
            onClick={() => navigate('/pos/quick')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/35 hover:border-amber-500/50 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0"
            title="الانتقال إلى نقطة البيع السريعة"
          >
            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="font-cairo font-extrabold hidden md:inline">نقطة البيع السريع</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shadow-2xs">⚡ FAST</span>
          </button>

          {/* Wholesale Mode Toggle Button */}
          <button
            onClick={() => {
              const willBeWholesale = !wholesaleMode;
              toggleWholesaleMode();
              onSelectPriceTier(willBeWholesale ? '3' : '1');
              if (onNotify) {
                onNotify({
                  title: willBeWholesale ? 'وضع الجملة مفعّل (Gros)' : 'وضع التجزئة مفعّل (Détail)',
                  message: willBeWholesale ? 'تم تفعيل أسعار وفواتير الجملة تلقائياً (Alt+W)' : 'تم العودة إلى أسعار التجزئة العادية (Alt+W)',
                  type: willBeWholesale ? 'success' : 'info',
                });
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0 ${
              isWholesaleActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/30'
                : 'bg-surface-container/70 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline-variant/30'
            }`}
            title="تبديل وضع بيع الجملة (Alt+W)"
          >
            <Layers className={`w-4 h-4 ${isWholesaleActive ? 'text-white' : 'text-blue-500'}`} />
            <span className="font-cairo font-extrabold hidden md:inline">
              {isWholesaleActive ? 'بيع بالجملة' : 'بيع تجزئة'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
              isWholesaleActive ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {isWholesaleActive ? 'GROS' : 'DÉTAIL'}
            </span>
          </button>

          {/* Search by Name */}
          <div className="relative flex-1 min-w-[110px] max-w-xs group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
            <input
              ref={searchInputRef as any}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const exact = products.find(
                    (p) => (p.barcode && p.barcode.trim() === searchQuery.trim()) ||
                           (p.sku && p.sku.trim() === searchQuery.trim()) ||
                           p.name.toLowerCase().trim() === searchQuery.toLowerCase().trim()
                  );
                  if (exact) {
                    onAddProduct(exact);
                    setSearchQuery('');
                  }
                }
              }}
              placeholder="البحث بالاسم..."
              className="w-full h-10 pr-8 pl-8 sm:pr-9 sm:pl-9 bg-surface-container/60 hover:bg-surface-container border border-outline-variant/20 focus:border-primary/60 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-3 focus:ring-primary/15 transition-all placeholder-on-surface-variant/70 shadow-2xs"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline absolute left-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-high/80 border border-outline-variant/30 text-[10px] font-mono font-bold text-on-surface-variant pointer-events-none shadow-2xs">
                F7
              </span>
            )}
          </div>

          {/* Dedicated Barcode Scanner Input */}
          <div className="relative hidden sm:flex flex-1 min-w-[110px] max-w-xs group">
            <ScanLine className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
            <input
              ref={barcodeInputRef as any}
              type="text"
              value={barcodeHeaderInput}
              onChange={(e) => setBarcodeHeaderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeHeaderInput.trim()) {
                  e.preventDefault();
                  onExternalScan(barcodeHeaderInput.trim());
                  setBarcodeHeaderInput('');
                }
              }}
              placeholder="امسح/اكتب الباركود..."
              className="w-full h-10 pr-9 pl-4 bg-surface-container/60 hover:bg-surface-container border border-outline-variant/20 focus:border-primary/60 rounded-xl text-xs font-mono text-on-surface focus:outline-none focus:ring-3 focus:ring-primary/15 transition-all placeholder-on-surface-variant/70 shadow-2xs"
            />
          </div>

          {/* Trial / License info pill */}
          {!isLicensed && currentUser?.role !== 'developer' && trial.isActive && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0 shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>تجربة مجانية: متبقي {trial.remainingDays} أيام ({trial.remainingSales} مبيعات)</span>
            </div>
          )}
        </div>

        {/* Left Side (RTL End): Uniform-Sized Animated Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-primary/10 border border-outline-variant/20 hover:border-primary/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 transition-transform duration-300 group-hover:scale-90" />
            ) : (
              <Maximize className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
            )}
          </button>

          {/* Help */}
          <button
            onClick={onOpenShortcuts}
            className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-cyan-500/10 border border-outline-variant/20 hover:border-cyan-500/40 flex items-center justify-center text-on-surface-variant hover:text-cyan-600 dark:hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="المساعدة والاختصارات"
          >
            <HelpCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
          </button>

          {/* Active Sessions / Shifts */}
          <button
            onClick={onOpenSession}
            className={`group relative h-8.5 sm:h-9 md:h-10 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 shadow-2xs cursor-pointer ${
              currentSession
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/25'
            }`}
            title={currentSession ? `مناوبة نشطة #${currentSession.sessionNumber} - إدارة الصندوق` : 'فتح مناوبة جديدة'}
          >
            {currentSession ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold font-mono hidden sm:inline">#{currentSession.sessionNumber}</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold hidden md:inline font-cairo">فتح مناوبة</span>
              </>
            )}
          </button>

          {/* Keyboard Shortcuts Guide */}
          <button
            onClick={onOpenShortcuts}
            className="hidden sm:flex group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-purple-500/10 border border-outline-variant/20 hover:border-purple-500/40 items-center justify-center text-on-surface-variant hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="اختصارات لوحة المفاتيح"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <NotificationDropdown>
            <button
              className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-amber-500/10 border border-outline-variant/20 hover:border-amber-500/40 flex items-center justify-center text-on-surface-variant hover:text-amber-500 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
              title="الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-tr from-red-600 to-rose-500 text-white text-[9px] font-black items-center justify-center font-mono shadow-xs">
                    {unreadCount}
                  </span>
                </span>
              )}
            </button>
          </NotificationDropdown>

          {/* Connected Devices */}
          <button
            onClick={() => navigate('/settings')}
            className="hidden md:flex group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="الأجهزة المتصلة"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Cloud Sync */}
          <div
            className="hidden sm:flex group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 items-center justify-center shadow-2xs transition-all duration-200 cursor-default"
            title="المزامنة السحابية مكتملة"
          >
            <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xs ${
              theme === 'dark'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-400'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25 text-indigo-600'
            }`}
            title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBHEADER: CATEGORY & ACTION TOOLBAR                      */}
      {/* ========================================================= */}
      <div className="px-3 sm:px-4 py-2 bg-surface-container-low/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-outline-variant/15 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 shadow-2xs relative z-30 overflow-x-auto no-scrollbar touch-scroll">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap shrink-0">
          {/* Advanced Filters Modal Trigger */}
          <button
            type="button"
            onClick={onOpenFilters}
            className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-primary/15 text-primary border-primary/40 shadow-primary/10'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 hover:border-primary/40 text-on-surface'
            }`}
            title="الفلاتر المتقدمة (العائلة، المورد، حالة المخزون)"
          >
            <SlidersHorizontal className={`w-4 h-4 ${activeFiltersCount > 0 ? 'text-primary' : 'text-on-surface-variant'}`} />
            <span>الفلاتر</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-black flex items-center justify-center font-mono shadow-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Quick Clear Filters if active */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="h-9 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/25 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="إلغاء جميع الفلاتر النشطة"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">مسح الفلاتر</span>
            </button>
          )}

          {/* Star / Featured Filter */}
          <button
            type="button"
            onClick={() => setIsFeaturedOnly(!isFeaturedOnly)}
            className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer ${
              isFeaturedOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/25'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/20 hover:border-amber-500/40'
            }`}
            title="عرض المنتجات المميزة فقط"
          >
            <Star className={`w-4 h-4 ${isFeaturedOnly ? 'fill-current' : 'text-amber-500'}`} />
            <span>مميزة</span>
          </button>

          {/* Return Mode (F9) */}
          <button
            onClick={() => {
              if (returnMode) {
                setReturnMode(false);
                clearCart();
              } else {
                onOpenReturnSale();
              }
            }}
            className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
              returnMode
                ? 'bg-red-500/15 text-red-600 border-red-500/35 shadow-red-500/10'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/20 hover:border-red-500/30'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-red-500" />
            <span>الإرجاع</span>
            <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container-high/90 border border-outline-variant/30 text-on-surface-variant font-bold shadow-2xs">F9</span>
          </button>

          {/* Free Product (F8) */}
          <button
            onClick={onOpenFreeProduct}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>منتج حر</span>
            <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-800 dark:text-amber-200 font-extrabold shadow-2xs">F8</span>
          </button>

          {/* Customize Layout */}
          <button
            onClick={onOpenCustomize}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Sliders className="w-4 h-4 text-on-surface-variant" />
            <span>تخصيص</span>
          </button>
        </div>
      </div>
    </>
  );
};
