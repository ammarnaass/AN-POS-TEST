import React from 'react';
import {
  Bell,
  Receipt,
  Trash2,
  PauseCircle,
  History,
  Printer,
  User,
  Package,
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
        <div className="w-[85%] flex-1 bg-black/95 dark:bg-black rounded-2xl border-2 border-emerald-500/40 px-3.5 sm:px-6 py-3 sm:py-3.5 min-h-[74px] sm:min-h-[82px] shadow-2xl flex items-center justify-between gap-2 sm:gap-4 overflow-hidden relative">
          {/* Subtle glowing ambient effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/10 to-transparent pointer-events-none" />

          {/* Right wing in RTL: Customer & Items metadata in glowing LED Green */}
          <div className="flex items-center gap-2 sm:gap-2.5 relative z-10 min-w-0 flex-1 justify-start">
            {/* عنصر الزبون باللون الأخضر */}
            <div
              onClick={onSelectCustomer}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold shrink-0 transition-all ${
                onSelectCustomer ? 'cursor-pointer hover:bg-emerald-900/50 hover:border-emerald-400' : ''
              }`}
              title="زبون الفاتورة (F6)"
            >
              <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-500/90 text-[11px] font-bold">الزبون:</span>
              <span className="text-emerald-300 font-bold truncate max-w-[100px] sm:max-w-[130px]">
                {selectedCustomerName || 'زبون عام'}
              </span>
            </div>

            {/* عنصر السلع باللون الأخضر */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold shrink-0">
              <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-500/90 text-[11px] font-bold">السلع:</span>
              <span className="text-emerald-300 font-mono font-black">
                {cartLength > 0 ? `${totalItemsCount} سلع (${totalUnitsCount} قطع)` : '0 قطع'}
              </span>
            </div>
          </div>

          {/* Exact Center: Giant glowing LED total amount (+15% larger & centered) باللون الأخضر الكامل */}
          <div className="flex items-baseline justify-center gap-2 relative z-10 shrink-0 px-2 text-center" dir="ltr">
            <span className="text-xs sm:text-sm font-bold text-emerald-500/90 shrink-0">الإجمالي الكلي:</span>
            <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono text-emerald-400 tracking-wider drop-shadow-[0_0_20px_rgba(52,211,153,0.7)]">
              {formatMoney(totalAmount)}
            </span>
            <span className="text-sm sm:text-lg font-black text-emerald-400">{currency}</span>
          </div>

          {/* Left wing in RTL: Discount & LED status pill (flex-1) باللون الأخضر */}
          <div className="flex items-center gap-2 relative z-10 min-w-0 flex-1 justify-end">
            {discountAmount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold shrink-0">
                <span className="text-emerald-500/90">تخفيض:</span>
                <span className="font-mono text-emerald-300">-{formatMoney(discountAmount)}</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LED POS</span>
            </div>
          </div>
        </div>

        {/* Giant Settle Button F1 (زر تأكيد البيع - 15%) */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cartLength === 0 || isSalePending}
          className="w-[15%] min-w-[120px] min-h-[74px] sm:min-h-[82px] rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0 p-2"
          title="تأكيد البيع وتسوية الفاتورة (F1)"
        >
          <Receipt className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-xs" />
          <div className="flex flex-col items-center sm:items-start leading-tight">
            <span className="font-extrabold text-xs sm:text-base">تأكيد بيع</span>
            <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-0.5">F1</span>
          </div>
        </button>
      </div>

      {/* 2. ACTION STRIP 1 (شريط الأزرار الأول: مرتب وظيفياً: الزبون والمعاملات -> السلة -> النظام والخروج) */}
      <div className="w-full flex items-stretch gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 border-t border-outline-variant/15 pt-1.5">
        {/* المجموعة 1: الزبون والمعاملات السريعة */}
        {/* زر اختيار الزبون (F6) */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className={`h-9 flex-1 min-w-0 px-2 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            selectedCustomerName
              ? 'bg-teal-500/25 dark:bg-teal-950/60 border-teal-500/70 text-slate-900 dark:text-white'
              : 'bg-teal-500/15 dark:bg-teal-950/40 hover:bg-teal-500/25 border-teal-500/40 text-slate-900 dark:text-white'
          }`}
          title="تحديد أو تغيير الزبون (F6)"
        >
          <User className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate font-black">{selectedCustomerName || 'زبون'}</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F6</span>
        </button>

        {/* زر تعليق البيع (F2) */}
        <button
          type="button"
          onClick={onSuspendSale}
          disabled={cartLength === 0}
          className="h-9 flex-1 min-w-0 px-2 rounded-xl bg-amber-500/20 dark:bg-amber-950/50 hover:bg-amber-500/30 text-slate-900 dark:text-white border border-amber-500/60 hover:border-amber-500 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
          title="تعليق البيع / سلة جديدة (F2)"
        >
          <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate font-black">تعليق</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F2</span>
        </button>

        {/* زر المسودات (F3) */}
        <button
          type="button"
          onClick={onOpenSuspended}
          className="h-9 flex-1 min-w-0 px-2 rounded-xl bg-indigo-500/20 dark:bg-indigo-950/50 hover:bg-indigo-500/30 text-slate-900 dark:text-white border border-indigo-500/60 hover:border-indigo-500 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer relative transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
          title="قائمة الفواتير المعلقة والمسودات (F3)"
        >
          <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate font-black">مسودات</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F3</span>
          {suspendedCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping absolute top-1 right-2" />
          )}
        </button>

        {/* فاصل تباين رأسي بين المعاملات وإدارة السلة */}
        <div className="w-px h-6 bg-outline-variant/40 shrink-0 self-center mx-0.5" />

        {/* المجموعة 2: إدارة السلة */}
        {/* زر حذف السلعة المحددة (Ctrl+D) */}
        <button
          type="button"
          onClick={onDeleteSelectedOrLast}
          disabled={cartLength === 0}
          className="h-9 flex-1 min-w-0 px-2 rounded-xl bg-red-500/15 dark:bg-red-950/50 hover:bg-red-500/25 border border-red-500/40 hover:border-red-500/70 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
          title="حذف السلعة المحددة (Ctrl+D / Delete)"
        >
          <X className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="truncate font-black">حذف سلعة</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">Ctrl+D</span>
        </button>

        {/* زر إلغاء الوصل بالكامل (F4) */}
        <button
          type="button"
          onClick={onClearCart}
          disabled={cartLength === 0}
          className="h-9 flex-1 min-w-0 px-2 rounded-xl bg-red-600/20 dark:bg-red-950/60 hover:bg-red-600/30 border border-red-600/50 hover:border-red-600 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
          title="إلغاء الفاتورة الحالية بالكامل (F4)"
        >
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="truncate font-black">إلغاء الوصل</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F4</span>
        </button>

        {/* فاصل تباين رأسي بين السلة وأدوات النظام */}
        <div className="w-px h-6 bg-outline-variant/40 shrink-0 self-center mx-0.5" />

        {/* المجموعة 3: أدوات النظام والخروج */}
        {/* زر تخصيص الواجهة ودقة الشاشة (F10) */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="h-9 flex-1 min-w-0 px-2 rounded-xl bg-purple-500/20 dark:bg-purple-950/50 hover:bg-purple-500/30 border border-purple-500/50 hover:border-purple-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="تخصيص الواجهة ودقة العرض ومقياس التكبير (F10)"
          >
            <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="truncate font-black">تخصيص</span>
            <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F10</span>
          </button>
        )}

        {/* زر الخروج إلى لوحة التحكم الرئيسية (Esc) */}
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="h-9 flex-1 min-w-0 px-2 rounded-xl bg-rose-500/20 dark:bg-rose-950/50 hover:bg-rose-500/30 border border-rose-500/50 hover:border-rose-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="الخروج إلى لوحة التحكم الرئيسية (Esc)"
          >
            <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="truncate font-black">خروج</span>
            <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">Esc</span>
          </button>
        )}
      </div>

      {/* 3. ACTION STRIP 2 (شريط الأزرار الثاني: مرتب وظيفياً: فئات الأسعار -> عمليات الفاتورة -> المستندات -> الأدوات) */}
      <div className="w-full flex items-stretch gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 border-t border-outline-variant/15 pt-1">
        {/* المجموعة 1: فئات الأسعار السريعة */}
        {/* فئة س1 (تجزئة) */}
        <button
          type="button"
          onClick={() => onSelectPriceTier?.('1')}
          className={`h-9 flex-1 min-w-0 px-1 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
            priceTier === '1'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/50'
              : 'bg-blue-500/15 dark:bg-blue-950/40 hover:bg-blue-500/25 border-blue-500/40 text-slate-900 dark:text-white'
          }`}
          title="سعر التجزئة س1 (Alt+1)"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
          <span className="truncate font-black">س1</span>
        </button>

        {/* فئة س2 (نصف جملة) */}
        <button
          type="button"
          onClick={() => onSelectPriceTier?.('2')}
          className={`h-9 flex-1 min-w-0 px-1 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
            priceTier === '2'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/50'
              : 'bg-emerald-500/15 dark:bg-emerald-950/40 hover:bg-emerald-500/25 border-emerald-500/40 text-slate-900 dark:text-white'
          }`}
          title="سعر نصف الجملة س2 (Alt+2)"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
          <span className="truncate font-black">س2</span>
        </button>

        {/* فئة س3 (جملة) */}
        <button
          type="button"
          onClick={() => onSelectPriceTier?.('3')}
          className={`h-9 flex-1 min-w-0 px-1 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
            priceTier === '3'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400/50'
              : 'bg-purple-500/15 dark:bg-purple-950/40 hover:bg-purple-500/25 border-purple-500/40 text-slate-900 dark:text-white'
          }`}
          title="سعر الجملة س3 (Alt+3)"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
          <span className="truncate font-black">س3</span>
        </button>

        {/* فئة س4 (خاص) */}
        <button
          type="button"
          onClick={() => onSelectPriceTier?.('4')}
          className={`h-9 flex-1 min-w-0 px-1 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
            priceTier === '4'
              ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/50'
              : 'bg-amber-500/15 dark:bg-amber-950/40 hover:bg-amber-500/25 border-amber-500/40 text-slate-900 dark:text-white'
          }`}
          title="سعر خاص س4 (Alt+4)"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
          <span className="truncate font-black">س4</span>
        </button>

        {/* فاصل تباين بين فئات الأسعار وعمليات الفاتورة */}
        <div className="w-px h-6 bg-outline-variant/40 shrink-0 self-center mx-0.5" />

        {/* المجموعة 2: عمليات الفاتورة الأساسية */}
        {/* زر التخفيض */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="h-9 flex-1 min-w-0 px-1 rounded-xl bg-orange-500/20 dark:bg-orange-950/50 hover:bg-orange-500/30 border border-orange-500/50 hover:border-orange-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
          title="إضافة تخفيض أو زيادة على الفاتورة"
        >
          <Edit3 className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
          <span className="truncate font-black">{discountAmount > 0 ? `تخفيض: ${formatMoney(discountAmount)}` : 'تخفيض'}</span>
        </button>

        {/* زر الطباعة التلقائية (F5) */}
        <button
          type="button"
          onClick={onToggleAutoPrint}
          className={`h-9 flex-1 min-w-0 px-1 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            autoPrintReceipt
              ? 'bg-emerald-500/25 dark:bg-emerald-950/60 text-slate-900 dark:text-white border-emerald-500/60 hover:border-emerald-500'
              : 'bg-slate-500/15 dark:bg-slate-900/50 hover:bg-slate-500/25 text-slate-900 dark:text-white border-slate-500/40'
          }`}
          title="الطباعة التلقائية (F5)"
        >
          <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate font-black">طباعة</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F5</span>
        </button>

        {/* زر سجل المبيعات (F9 / Alt+S) */}
        <button
          type="button"
          onClick={onOpenSalesHistory}
          disabled={!onOpenSalesHistory}
          className="h-9 flex-1 min-w-0 px-1 rounded-xl bg-sky-500/20 dark:bg-sky-950/50 hover:bg-sky-500/30 border border-sky-500/50 hover:border-sky-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
          title="سجل المبيعات (Alt+S)"
        >
          <History className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="truncate font-black">سجل</span>
          <span className="bg-black/75 dark:bg-black/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black shrink-0 shadow-xs">F9</span>
        </button>

        {/* فاصل تباين بين العمليات والمستندات */}
        <div className="w-px h-6 bg-outline-variant/40 shrink-0 self-center mx-0.5" />

        {/* المجموعة 3: حفظ المستندات والطلبيات */}
        {/* حفظ كفاتورة مبدئية */}
        {onSaveAsProforma && (
          <button
            type="button"
            onClick={onSaveAsProforma}
            disabled={cartLength === 0}
            className="h-9 flex-1 min-w-0 px-1 rounded-xl bg-amber-500/20 dark:bg-amber-950/50 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="حفظ الفاتورة كمسودة مبدئية (Proforma)"
          >
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate font-black">مبدئية</span>
          </button>
        )}

        {/* حفظ كطلبيّة مبيعات */}
        {onSaveAsOrder && (
          <button
            type="button"
            onClick={onSaveAsOrder}
            disabled={cartLength === 0}
            className="h-9 flex-1 min-w-0 px-1 rounded-xl bg-blue-500/20 dark:bg-blue-950/50 hover:bg-blue-500/30 border border-blue-500/50 hover:border-blue-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="حفظ السلة كطلبيّة زبون"
          >
            <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate font-black">طلبيّة</span>
          </button>
        )}

        {/* فاصل تباين بين المستندات والأدوات */}
        <div className="w-px h-6 bg-outline-variant/40 shrink-0 self-center mx-0.5" />

        {/* المجموعة 4: الأدوات التشغيلية */}
        {/* لوحة الأرقام اللمسية */}
        {onOpenKeypad && (
          <button
            type="button"
            onClick={onOpenKeypad}
            className="h-9 flex-1 min-w-0 px-1 rounded-xl bg-teal-500/20 dark:bg-teal-950/50 hover:bg-teal-500/30 border border-teal-500/50 hover:border-teal-500 text-slate-900 dark:text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="فتح لوحة الأرقام اللمسية"
          >
            <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate font-black">حاسبة</span>
          </button>
        )}

        {/* زر تبديل الوضع الليلي / النهاري */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`h-9 flex-1 min-w-0 px-1 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            theme === 'dark'
              ? 'bg-amber-500/20 dark:bg-amber-950/50 hover:bg-amber-500/30 border-amber-500/50 text-slate-900 dark:text-white'
              : 'bg-indigo-500/20 dark:bg-indigo-950/50 hover:bg-indigo-500/30 border-indigo-500/50 text-slate-900 dark:text-white'
          }`}
          title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
          )}
          <span className="truncate font-black">{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
        </button>

        {/* زر الإشعارات والتنبيهات التشغيلية */}
        <div className="flex-1 min-w-0 flex">
          <NotificationDropdown hideBadge>
            <button
              type="button"
              className="h-9 w-full px-1 rounded-xl bg-rose-500/20 dark:bg-rose-950/50 hover:bg-rose-500/30 text-slate-900 dark:text-white border border-rose-500/50 hover:border-rose-500 text-xs sm:text-sm font-black flex items-center justify-center gap-1 active:scale-95 cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 relative"
              title="الإشعارات والتنبيهات التشغيلية"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 flex items-center justify-center bg-rose-600 text-white text-[8px] font-black rounded-full px-0.5 shadow-xs animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="truncate font-black">إشعارات</span>
            </button>
          </NotificationDropdown>
        </div>
      </div>
    </div>
  );
});

