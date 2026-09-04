import React from 'react';
import {
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
} from 'lucide-react';

interface ClassicPOSTopBarProps {
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
  onOpenKeypad?: () => void;
  onSaveAsProforma?: () => void;
  onSaveAsOrder?: () => void;
  totalAmount: number;
  totalItemsCount: number;
  totalUnitsCount: number;
  currency?: string;
  formatMoney: (amount?: number) => string;
}

export const ClassicPOSTopBar: React.FC<ClassicPOSTopBarProps> = React.memo(({
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
  onOpenKeypad,
  onSaveAsProforma,
  onSaveAsOrder,
  totalAmount,
  totalItemsCount,
  totalUnitsCount,
  currency = 'دج',
  formatMoney,
}) => {
  return (
    <div className="bg-surface-container-low border-b border-outline-variant/20 p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0 shadow-sm">
      {/* 1. RIGHT / CENTER (in RTL): ACTIONS TOOLBAR */}
      <div className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
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

        {/* سجل المبيعات (F9) */}
        <button
          type="button"
          onClick={onOpenReturns}
          className="h-10 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0"
          title="سجل المبيعات والمرتجع (F9)"
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
      </div>

      {/* 2. LEFT (in RTL): UNIFIED SETTLEMENT & DIGITAL DISPLAY BLOCK */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Giant Settle Button F1 (Placed directly adjacent to the Total Display) */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cartLength === 0 || isSalePending}
          className="h-12 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          title="تأكيد البيع وتسوية الفاتورة (F1)"
        >
          <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-extrabold">تأكيد بيع</span>
          <span className="bg-black/30 px-2 py-0.5 rounded-lg text-xs font-mono font-bold">F1</span>
        </button>

        {/* The Classic LED Digital Total Display (شاشة العرض الرقمية الكلاسيكية) */}
        <div className="bg-black/95 rounded-2xl border-2 border-slate-700/80 px-3.5 py-1.5 shadow-2xl flex items-center justify-between gap-3 min-w-[180px] sm:min-w-[220px]">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 block">الإجمالي:</span>
            <span className="text-[10px] font-mono text-emerald-400/80 block">
              {cartLength > 0 ? `${totalItemsCount} سلع (${totalUnitsCount} قطع)` : 'شاشة جاهزة'}
            </span>
          </div>
          <div className="text-left flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-wider drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
              {formatMoney(totalAmount)}
            </span>
            <span className="text-xs font-bold text-emerald-500">{currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

