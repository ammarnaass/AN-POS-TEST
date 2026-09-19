import React from 'react';
import {
  Bell,
  Receipt,
  Trash2,
  PauseCircle,
  History,
  Printer,
  User,
  X,
  Edit3,
  FolderOpen,
  Calculator,
  FileText,
  FileCheck,
  Sun,
  Moon,
  LogOut,
  Sliders,
} from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';
import { useThemeStore } from '@/store/themeStore';

interface ClassicPOSTopBarProps {
  onNavigateBack?: () => void;
  onOpenCustomize?: () => void;
  onSettleSale: () => void;
  isSalePending: boolean;
  cartLength: number;
  onClearCart: () => void;
  onDeleteSelectedOrLast: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onSelectCustomer: () => void;
  selectedCustomerName: string;
  onOpenDiscount: () => void;
  discountAmount: number;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  onOpenReturns: () => void;
  onOpenSalesHistory?: () => void;
  onOpenKeypad?: () => void;
  onSaveAsProforma?: () => void;
  onSaveAsOrder?: () => void;
  totalAmount: number;
  totalItemsCount: number;
  totalUnitsCount: number;
  currency?: string;
  formatMoney: (amount?: number) => string;
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
}

export const ClassicPOSTopBar: React.FC<ClassicPOSTopBarProps> = React.memo(({
  onNavigateBack,
  onOpenCustomize,
  onSettleSale,
  isSalePending,
  cartLength,
  onClearCart,
  onDeleteSelectedOrLast,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  onOpenDiscount,
  discountAmount,
  autoPrintReceipt,
  onToggleAutoPrint,
  onOpenReturns,
  onOpenSalesHistory,
  onOpenKeypad,
  onSaveAsProforma,
  onSaveAsOrder,
  totalAmount,
  totalItemsCount,
  totalUnitsCount,
  currency = 'دج',
  formatMoney,
  priceTier = '1',
  onSelectPriceTier,
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  return (
    <div className="bg-surface-container-low border-b border-outline-variant/20 p-2 sm:p-2.5 flex flex-col gap-2 shrink-0 shadow-sm">
      {/* 1. TOP ROW: GIANT PRICE DISPLAY (85%) + SETTLE BUTTON (15%) */}
      <div className="w-full flex items-stretch gap-2">
        {/* The Classic LED Digital Total Display (شاشة عرض السعر الكبرى - 85%) */}
        <div className="w-[85%] flex-1 bg-black/95 dark:bg-black rounded-2xl border-2 border-emerald-500/40 px-3.5 sm:px-5 py-2 shadow-2xl flex items-center justify-between gap-3 overflow-hidden relative">
          {/* Subtle glowing ambient effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/10 to-transparent pointer-events-none" />

          {/* Right side in RTL: Cart metadata & indicators */}
          <div className="flex items-center gap-2 sm:gap-3 relative z-10 min-w-0">
            <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-400 block leading-tight">الإجمالي الكلي:</span>
              <span className="text-xs font-mono font-bold text-emerald-400 block leading-tight">
                {cartLength > 0 ? `${totalItemsCount} سلع (${totalUnitsCount} قطع)` : 'شاشة المبيعات جاهزة'}
              </span>
            </div>

            {selectedCustomerName && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-primary/30 text-primary text-xs font-bold shrink-0">
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">{selectedCustomerName}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold shrink-0">
                <span>تخفيض:</span>
                <span className="font-mono">-{formatMoney(discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Left side in RTL: Giant glowing LED total amount */}
          <div className="text-left flex items-baseline gap-1.5 sm:gap-2 relative z-10 shrink-0" dir="ltr">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-emerald-400 tracking-wider drop-shadow-[0_0_16px_rgba(52,211,153,0.6)]">
              {formatMoney(totalAmount)}
            </span>
            <span className="text-xs sm:text-base font-black text-emerald-500">{currency}</span>
          </div>
        </div>

        {/* Giant Settle Button F1 (زر تأكيد البيع - 15%) */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cartLength === 0 || isSalePending}
          className="w-[15%] min-w-[120px] rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0 p-2"
          title="تأكيد البيع وتسوية الفاتورة (F1)"
        >
          <Receipt className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-xs" />
          <div className="flex flex-col items-center sm:items-start leading-tight">
            <span className="font-extrabold text-xs sm:text-sm">تأكيد بيع</span>
            <span className="bg-black/30 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">F1</span>
          </div>
        </button>
      </div>

      {/* 2. BOTTOM ROW (UNDERNEATH): LONGITUDINAL ACTION BUTTONS TOOLBAR (شريط الأزرار الطولي) */}
      <div className="w-full flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 border-t border-outline-variant/15 pt-1.5">
        {/* زر الخروج إلى لوحة التحكم الرئيسية */}
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="h-10 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0 shadow-2xs"
            title="الخروج إلى لوحة التحكم الرئيسية (Esc)"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span>خروج</span>
            <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Esc</span>
          </button>
        )}

        {/* زر تخصيص الواجهة ودقة الشاشة */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="h-10 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-700 dark:text-purple-300 text-xs font-black flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0 shadow-2xs"
            title="تخصيص الواجهة ودقة العرض ومقياس التكبير (F10)"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>تخصيص</span>
            <span className="bg-purple-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F10</span>
          </button>
        )}

        {/* SAFE DESTRUCTIVE / EDITING ZONE: Ctrl+D & Isolated F4 */}
        <button
          type="button"
          onClick={onDeleteSelectedOrLast}
          disabled={cartLength === 0}
          className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
          title="حذف السلعة المحددة (Ctrl+D / Delete)"
        >
          <X className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">حذف سلعة</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">Ctrl+D</span>
        </button>

        {/* Isolated Destructive Action: إلغاء الوصل (F4) */}
        <button
          type="button"
          onClick={onClearCart}
          disabled={cartLength === 0}
          className="h-10 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
          title="إلغاء الفاتورة الحالية بالكامل (F4)"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span>إلغاء الوصل</span>
          <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F4</span>
        </button>

        <div className="w-px h-6 bg-outline-variant/30 mx-0.5 shrink-0" />

        {/* SALE OPERATIONS: F2, F3, F6, Discount, F5, F9 */}
        {/* تعليق البيع (F2) */}
        <button
          type="button"
          onClick={onSuspendSale}
          disabled={cartLength === 0}
          className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-amber-500/15 text-on-surface hover:text-amber-500 border border-outline-variant/20 hover:border-amber-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
          title="تعليق البيع / سلة جديدة (F2)"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">تعليق</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F2</span>
        </button>

        {/* مسودات (F3) */}
        <button
          type="button"
          onClick={onOpenSuspended}
          className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-purple-500/15 text-on-surface hover:text-purple-500 border border-outline-variant/20 hover:border-purple-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer relative transition-all shrink-0"
          title="قائمة الفواتير المعلقة والمسودات (F3)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
          <span>مسودات</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F3</span>
          {suspendedCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping absolute -top-1 -right-1" />
          )}
        </button>

        {/* اختيار الزبون (F6) */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className={`h-10 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0 ${
            selectedCustomerName
              ? 'bg-primary/15 text-primary border-primary/40'
              : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface'
          }`}
          title="تحديد أو تغيير الزبون (F6)"
        >
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="max-w-[90px] truncate">{selectedCustomerName || 'زبون (F6)'}</span>
        </button>

        {/* فئات الأسعار: س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص */}
        <div className="flex items-center bg-surface-container border border-outline-variant/20 rounded-xl p-0.5 gap-0.5 shrink-0 text-xs font-bold h-10">
          <button
            type="button"
            onClick={() => onSelectPriceTier?.('1')}
            className={`h-8.5 px-2 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
              priceTier === '1'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
            title="سعر التجزئة س1 (Alt+1)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
            <span>س1 (تجزئة)</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPriceTier?.('2')}
            className={`h-8.5 px-2 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
              priceTier === '2'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
            title="سعر نصف الجملة س2 (Alt+2)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>س2</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPriceTier?.('3')}
            className={`h-8.5 px-2 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
              priceTier === '3'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
            title="سعر الجملة س3 (Alt+3)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
            <span>س3 (جملة)</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPriceTier?.('4')}
            className={`h-8.5 px-2 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
              priceTier === '4'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
            title="سعر خاص س4 (Alt+4)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
            <span>س4 (خاص)</span>
          </button>
        </div>

        {/* تخفيض */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0"
          title="إضافة تخفيض أو زيادة على الفاتورة"
        >
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
          <span>تخفيض: {formatMoney(discountAmount)}</span>
        </button>

        {/* طباعة (F5) */}
        <button
          type="button"
          onClick={onToggleAutoPrint}
          className={`h-10 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0 ${
            autoPrintReceipt
              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/20'
          }`}
          title="الطباعة التلقائية (F5)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">طباعة</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F5</span>
        </button>

        {/* سجل المبيعات (صفحة السجل — وليس مودال الإرجاع) */}
        <button
          type="button"
          onClick={onOpenSalesHistory}
          disabled={!onOpenSalesHistory}
          className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
          title="سجل المبيعات (Alt+S)"
        >
          <History className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">سجل</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F9</span>
        </button>

        {/* حفظ كفاتورة مبدئية */}
        {onSaveAsProforma && (
          <button
            type="button"
            onClick={onSaveAsProforma}
            disabled={cartLength === 0}
            className="h-10 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
            title="حفظ الفاتورة كمسودة مبدئية (Proforma)"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">مبدئية</span>
          </button>
        )}

        {/* حفظ كطلبيّة مبيعات */}
        {onSaveAsOrder && (
          <button
            type="button"
            onClick={onSaveAsOrder}
            disabled={cartLength === 0}
            className="h-10 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
            title="حفظ السلة كطلبيّة زبون"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline">طلبيّة</span>
          </button>
        )}

        {/* لوحة الأرقام اللمسية */}
        {onOpenKeypad && (
          <button
            type="button"
            onClick={onOpenKeypad}
            className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-primary text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0"
            title="فتح لوحة الأرقام اللمسية"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">لوحة أرقام</span>
          </button>
        )}

        {/* زر تبديل الوضع الليلي / النهاري */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`h-10 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0 ${
            theme === 'dark'
              ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-400'
              : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25 text-indigo-600'
          }`}
          title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span className="hidden sm:inline">{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
        </button>

        {/* زر الإشعارات والتنبيهات التشغيلية */}
        <NotificationDropdown hideBadge>
          <button
            type="button"
            className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-amber-500/15 text-on-surface hover:text-amber-500 border border-outline-variant/20 hover:border-amber-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0 relative"
            title="الإشعارات والتنبيهات التشغيلية"
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
      </div>
    </div>
  );
});

