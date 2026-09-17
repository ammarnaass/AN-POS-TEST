import React from 'react';
import {
  Bell,
  Home,
  Check,
  X,
  Trash2,
  Receipt,
  Plus,
  RotateCcw,
  User,
  UserCheck,
  Settings,
  Eye,
  Scale,
  Calculator,
  Percent,
  Sun,
  Moon,
  Maximize,
  Minimize,
} from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';
import type { CartItem } from '@/types';

export interface TerminalPOSTopBarProps {
  onNavigateBack: () => void;
  onSettleSale: () => void;
  cart: CartItem[];
  isSalePending: boolean;
  onClearCart: () => void;
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  onRemoveFromCart: (productId: string) => void;
  onOpenReturns: () => void;
  returnMode: boolean;
  onNewOrder?: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onSelectCustomer: () => void;
  selectedCustomerName: string;
  onOpenCustomize: () => void;
  isPriceCheckerMode: boolean;
  onTogglePriceChecker: () => void;
  onOpenFreeProduct: () => void;
  onOpenKeypad?: () => void;
  onOpenDiscount: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const TerminalPOSTopBar: React.FC<TerminalPOSTopBarProps> = ({
  onNavigateBack,
  onSettleSale,
  cart,
  isSalePending,
  onClearCart,
  selectedCartRowId,
  setSelectedCartRowId,
  onRemoveFromCart,
  onOpenReturns,
  returnMode,
  onNewOrder,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  onOpenCustomize,
  isPriceCheckerMode,
  onTogglePriceChecker,
  onOpenFreeProduct,
  onOpenKeypad,
  onOpenDiscount,
  theme,
  toggleTheme,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-3 py-2 flex items-center justify-between gap-2 shadow-2xs shrink-0 flex-wrap lg:flex-nowrap">
      {/* ─── المجموعة 1: الإجراءات التشغيلية والأساسية (يمين الواجهة RTL) ─── */}
      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
        {/* زر الدفع والتسوية الأساسي البطل (Primary CTA) */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cart.length === 0 || isSalePending}
          className="h-10 px-4 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm hover:shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 ring-2 ring-emerald-500/30"
          title="تأكيد وتسوية عملية البيع (F1)"
          aria-label="تأكيد وتسوية عملية البيع"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>تأكيد ودفع</span>
          <kbd className="font-mono text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded text-emerald-100 font-bold">F1</kbd>
        </button>

        {/* سلة جديدة (F9) */}
        <button
          type="button"
          onClick={() => {
            if (onNewOrder) onNewOrder();
            else if (cart.length > 0) onClearCart();
          }}
          className="h-9.5 px-3 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          title="فتح فاتورة بيع جديدة فارغة (F9)"
          aria-label="سلة جديدة"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>سلة جديدة</span>
          <kbd className="font-mono text-[9px] text-blue-500 bg-blue-100 dark:bg-blue-900/80 px-1 py-0.2 rounded font-bold">F9</kbd>
        </button>

        {/* زر الزبون الذكي الموحد (F2) - يحل محل الزرين المكررين */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className={`h-9.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5 ${
            selectedCustomerName
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-2xs ring-1 ring-amber-400/30'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          }`}
          title="اختيار وتحديد الزبون (F2)"
          aria-label="اختيار الزبون"
        >
          {selectedCustomerName ? (
            <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          )}
          <span className="truncate max-w-[110px] inline-block">
            {selectedCustomerName || 'الزبون'}
          </span>
          <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F2</kbd>
        </button>

        {/* تعليق واسترجاع الفواتير (F12) */}
        <button
          type="button"
          onClick={() => {
            if (cart.length > 0) onSuspendSale();
            else onOpenSuspended();
          }}
          className="h-9.5 px-3 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          title="تعليق السلة الحالية أو استرجاع الفواتير المعلقة (F12)"
          aria-label="تعليق السلة"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>تعليق</span>
          {suspendedCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mr-0.5">
              {suspendedCount}
            </span>
          )}
          <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F12</kbd>
        </button>

        {/* مرتجع مبيعات (تم تصحيح المسمى من الصندوق Caisse إلى مرتجع مبيعات) */}
        <button
          type="button"
          onClick={onOpenReturns}
          className={`h-9.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
            returnMode
              ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/50 animate-pulse shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          }`}
          title={returnMode ? 'وضع إرجاع البضائع مفعّل حالياً' : 'تفعيل وضع مرتجع المبيعات واسترجاع السلع'}
          aria-label="مرتجع مبيعات"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{returnMode ? 'إرجاع (مفعّل)' : 'مرتجع مبيعات'}</span>
        </button>

        {/* فاصل بنيوي خفيف */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0 hidden sm:block" />

        {/* خصم الفاتورة (F6) */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="h-9.5 px-2.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
          title="تطبيق تخفيض أو خصم على الفاتورة (F6)"
          aria-label="تخفيض الفاتورة"
        >
          <Percent className="w-3.5 h-3.5 text-amber-500" />
          <span>خصم</span>
          <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F6</kbd>
        </button>

        {/* صنف حر (F4) */}
        <button
          type="button"
          onClick={onOpenFreeProduct}
          className="h-9.5 px-2.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
          title="إضافة سلعة حرة يدوية السعر أو بالوزن (F4)"
          aria-label="صنف حر"
        >
          <Scale className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>صنف حر</span>
          <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F4</kbd>
        </button>

        {/* عارض ومستعلم الأسعار (F7) */}
        <button
          type="button"
          onClick={onTogglePriceChecker}
          className={`h-9.5 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 ${
            isPriceCheckerMode
              ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400/50 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          }`}
          title="تفعيل وضع استعلام أسعار ومخزون السلع دون إضافتها للسلة (F7)"
          aria-label="عارض الأسعار"
        >
          <Eye className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>عارض الأسعار</span>
          <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F7</kbd>
        </button>

        {/* آلة حاسبة / لوحة الأرقام (F11) */}
        {onOpenKeypad && (
          <button
            type="button"
            onClick={onOpenKeypad}
            className="h-9.5 px-2.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
            title="فتح الآلة الحاسبة ولوحة الأرقام اللمسية (F11)"
            aria-label="آلة حاسبة"
          >
            <Calculator className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>حاسبة</span>
            <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F11</kbd>
          </button>
        )}
      </div>

      {/* ─── المجموعة 2: إجراءات الحذف والأمان والمرافق النظامية (يسار الواجهة RTL) ─── */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
        {/* حذف السلعة المحددة (Ctrl+D) */}
        <button
          type="button"
          onClick={() => {
            if (selectedCartRowId) {
              onRemoveFromCart(selectedCartRowId);
              setSelectedCartRowId(null);
            } else if (cart.length > 0) {
              onRemoveFromCart(cart[cart.length - 1].productId);
            }
          }}
          disabled={cart.length === 0}
          className="h-9.5 px-2.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          title="حذف الصنف المحدد أو الأخير من السلة (Ctrl+D / Delete)"
          aria-label="حذف سلعة من السلة"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">حذف سلعة</span>
          <kbd className="font-mono text-[9px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-1 py-0.2 rounded font-bold">Del</kbd>
        </button>

        {/* إلغاء الوصل بالكامل (F8) - إجراء خطر مفصول بلون واضح */}
        <button
          type="button"
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="h-9.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/70 transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          title="إلغاء الفاتورة الحالية وتفريغ السلة بالكامل (F8)"
          aria-label="إلغاء الفاتورة"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>إلغاء الوصل</span>
          <kbd className="font-mono text-[9px] text-rose-500 bg-rose-100 dark:bg-rose-900/70 px-1 py-0.2 rounded font-bold">F8</kbd>
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0 hidden sm:block" />

        {/* زر الإشعارات والتنبيهات التشغيلية */}
        <NotificationDropdown hideBadge>
          <button
            type="button"
            className="h-9.5 px-2.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/90 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 relative"
            title="الإشعارات والتنبيهات التشغيلية"
            aria-label="الإشعارات والتنبيهات"
          >
            <div className="relative flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full px-1 shadow-xs animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">إشعارات</span>
          </button>
        </NotificationDropdown>

        {/* إعدادات وتخصيص العرض ودقة الشاشة (F10) */}
        <button
          type="button"
          onClick={onOpenCustomize}
          className="h-9.5 px-2.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
          title="إعدادات تخصيص العرض ودقة الشاشة (F10)"
          aria-label="إعدادات وتخصيص العرض"
        >
          <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span className="hidden sm:inline">إعدادات</span>
          <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">F10</kbd>
        </button>

        {/* تبديل المظهر النهاري/الليلي */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center cursor-pointer shrink-0 active:scale-95"
          title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
          aria-label="تبديل مظهر الواجهة"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* ملء الشاشة */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center cursor-pointer shrink-0 active:scale-95"
          title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          aria-label="ملء الشاشة"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* العودة للرئيسية (Esc) */}
        <button
          type="button"
          onClick={onNavigateBack}
          className="h-9.5 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-700 dark:border-slate-600 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          title="الرجوع إلى الصفحة الرئيسية (Esc)"
          aria-label="الصفحة الرئيسية"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden md:inline">الرئيسية</span>
          <kbd className="font-mono text-[9px] text-slate-300 bg-white/10 px-1 py-0.2 rounded font-bold">Esc</kbd>
        </button>
      </div>
    </header>
  );
};
