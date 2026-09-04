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
  totalAmount,
  totalItemsCount,
  totalUnitsCount,
  currency = 'دج',
  formatMoney,
}) => {
  return (
    <div className="bg-surface-container-low border-b border-outline-variant/20 p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 shadow-sm">
      {/* Left / Center: Action Buttons Toolbar (F1 .. F10) */}
      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
        {/* تأكيد بيع (F1) */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cartLength === 0 || isSalePending}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          title="تأكيد البيع وتسوية الفاتورة (F1)"
        >
          <Receipt className="w-4 h-4" />
          <span>تأكيد بيع</span>
          <span className="bg-black/25 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F1</span>
        </button>

        {/* إلغاء الوصل (F4) */}
        <button
          type="button"
          onClick={onClearCart}
          disabled={cartLength === 0}
          className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all"
          title="إلغاء الفاتورة الحالية بالكامل (F4)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>إلغاء الوصل</span>
          <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">F4</span>
        </button>

        {/* حذف سلعة (Ctrl+D) */}
        <button
          type="button"
          onClick={onDeleteSelectedOrLast}
          disabled={cartLength === 0}
          className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all"
          title="حذف السلعة المحددة (Ctrl+D)"
        >
          <X className="w-3.5 h-3.5 text-red-400" />
          <span>حذف سلعة</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">Ctrl+D</span>
        </button>

        <div className="w-px h-6 bg-outline-variant/30 mx-0.5 hidden sm:block" />

        {/* سلة جديدة / تعليق (F2) */}
        <button
          type="button"
          onClick={onSuspendSale}
          disabled={cartLength === 0}
          className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-amber-500/15 text-on-surface hover:text-amber-500 border border-outline-variant/20 hover:border-amber-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all"
          title="تعليق البيع / سلة جديدة (F2)"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>تعليق البيع</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F2</span>
        </button>

        {/* مسودات (F3) */}
        <button
          type="button"
          onClick={onOpenSuspended}
          className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-purple-500/15 text-on-surface hover:text-purple-500 border border-outline-variant/20 hover:border-purple-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer relative transition-all"
          title="قائمة الفواتير المعلقة والمسودات (F3)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
          <span>مسودات</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F3</span>
          {suspendedCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>

        {/* اختيار الزبون (F6) */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all ${
            selectedCustomerName
              ? 'bg-primary/15 text-primary border-primary/40'
              : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface'
          }`}
          title="تحديد أو تغيير الزبون (F6)"
        >
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="max-w-[100px] truncate">{selectedCustomerName || 'زبون (F6)'}</span>
        </button>

        {/* تخفيض */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all"
          title="إضافة تخفيض أو زيادة على الفاتورة"
        >
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
          <span>تخفيض: {formatMoney(discountAmount)}</span>
        </button>

        {/* طباعة (F5) */}
        <button
          type="button"
          onClick={onToggleAutoPrint}
          className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all ${
            autoPrintReceipt
              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/20'
          }`}
          title="الطباعة التلقائية (F5)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F5</span>
        </button>

        {/* سجل المبيعات (F9) */}
        <button
          type="button"
          onClick={onOpenReturns}
          className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all"
          title="سجل المبيعات والمرتجع (F9)"
        >
          <History className="w-3.5 h-3.5 text-amber-500" />
          <span>سجل</span>
          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F9</span>
        </button>
      </div>

      {/* Right: The Classic LED Digital Total Display (شاشة العرض الرقمية الكلاسيكية) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-black/95 rounded-2xl border-2 border-slate-700/80 px-4 py-2 shadow-2xl flex items-center justify-between gap-4 min-w-[200px] sm:min-w-[260px]">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 block">الإجمالي الكلي:</span>
            <span className="text-[10px] font-mono text-emerald-400/80 block">
              {cartLength > 0 ? `${totalItemsCount} سلع (${totalUnitsCount} قطع)` : 'شاشة جاهزة'}
            </span>
          </div>
          <div className="text-left flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-wider drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
              {formatMoney(totalAmount)}
            </span>
            <span className="text-xs font-bold text-emerald-500">{currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
