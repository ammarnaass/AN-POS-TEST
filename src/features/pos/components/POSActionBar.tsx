import React from 'react';
import {
  Trash2,
  Save,
  History,
  PauseCircle,
  Printer,
  Receipt,
  FileText,
  FileCheck,
  Edit3,
} from 'lucide-react';
import { formatMoney } from '../utils/format';

export interface POSActionBarProps {
  cartLength: number;
  subtotal: number;
  total: number;
  discountAmount: number;
  isSessionOpen: boolean;
  isSalePending: boolean;
  suspendedCount: number;
  autoPrintReceipt: boolean;
  onSettleSale: () => void; // F1
  onSuspendSale: () => void; // F2
  onOpenSuspended: () => void; // F3
  onClearCart: () => void; // F4
  onOpenReturns: () => void; // F9 / سجل
  onToggleAutoPrint: () => void; // F5
  onOpenDiscount: () => void;
  onSaveAsProforma: () => void;
  onSaveAsOrder: () => void;
  showFinancialSummary?: boolean;
  layoutVariant?: 'sidebar' | 'bottom';
}

export const POSActionBar: React.FC<POSActionBarProps> = ({
  cartLength,
  subtotal,
  total,
  discountAmount,
  isSessionOpen,
  isSalePending,
  suspendedCount,
  autoPrintReceipt,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  onClearCart,
  onOpenReturns,
  onToggleAutoPrint,
  onOpenDiscount,
  onSaveAsProforma,
  onSaveAsOrder,
  showFinancialSummary = true,
  layoutVariant = 'bottom',
}) => {
  // ─────────────────────────────────────────────────────────────
  // 1. DESIGN 1: DEDICATED VERTICAL SIDEBAR LAYOUT (Within 420-450px)
  // ─────────────────────────────────────────────────────────────
  if (layoutVariant === 'sidebar') {
    return (
      <div className="bg-surface-container/95 backdrop-blur-md border-t border-outline-variant/20 p-3 shrink-0 shadow-xl flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
        {/* Compact Financial Summary Card */}
        {showFinancialSummary && (
          <div className="bg-surface-container-lowest/90 rounded-2xl p-2.5 border border-outline-variant/15 shadow-2xs space-y-1.5">
            {/* Top Row: Subtotal & Discount Inline */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 text-on-surface-variant min-w-0">
                <span className="font-bold text-[11px] text-on-surface-variant/80">المجموع:</span>
                <span className="font-mono font-bold text-on-surface text-xs truncate">
                  {formatMoney(subtotal)} دج
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenDiscount}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                  title="تخفيض أو زيادة على الفاتورة"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>تخفيض</span>
                </button>
                <span className="font-mono font-bold text-primary text-xs">
                  {discountAmount > 0 ? `-${formatMoney(discountAmount)}` : '0.00'} دج
                </span>
              </div>
            </div>

            {/* Bottom Row: Total Due */}
            <div className="pt-1.5 border-t border-dashed border-outline-variant/20 flex items-baseline justify-between">
              <span className="text-xs font-black text-on-surface">الإجمالي المستحق:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-primary tracking-tight">
                  {formatMoney(total)}
                </span>
                <span className="text-xs font-extrabold text-primary">دج</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Buttons: 4-Col Grid (F4, F2, F3, F5) */}
        <div className="grid grid-cols-4 gap-2">
          {/* إلغاء F4 */}
          <button
            type="button"
            onClick={onClearCart}
            disabled={cartLength === 0}
            title="إلغاء وإفراغ السلة (F4)"
            className="py-2 px-1 rounded-xl bg-surface-container-low/90 hover:bg-red-500/15 text-red-600 border border-outline-variant/20 hover:border-red-500/30 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[46px]"
          >
            <Trash2 className="w-4 h-4 mb-0.5 text-red-500" />
            <span className="text-[11px] font-bold leading-tight">إلغاء</span>
            <span className="text-[9px] font-mono opacity-70">F4</span>
          </button>

          {/* تعليق F2 */}
          <button
            type="button"
            onClick={onSuspendSale}
            disabled={cartLength === 0}
            title="تعليق البيع كمسودة (F2)"
            className="py-2 px-1 rounded-xl bg-surface-container-low/90 hover:bg-amber-500/15 text-amber-600 border border-outline-variant/20 hover:border-amber-500/30 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[46px]"
          >
            <Save className="w-4 h-4 mb-0.5 text-amber-500" />
            <span className="text-[11px] font-bold leading-tight">تعليق</span>
            <span className="text-[9px] font-mono opacity-70">F2</span>
          </button>

          {/* مسودات F3 */}
          <button
            type="button"
            onClick={onOpenSuspended}
            title="المسودات والطلبات المعلقة (F3)"
            className="py-2 px-1 rounded-xl bg-surface-container-low/90 hover:bg-purple-500/15 text-purple-600 border border-outline-variant/20 hover:border-purple-500/30 flex flex-col items-center justify-center transition-all relative shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[46px]"
          >
            <PauseCircle className="w-4 h-4 mb-0.5 text-purple-500" />
            <span className="text-[11px] font-bold leading-tight">مسودات</span>
            <span className="text-[9px] font-mono opacity-70">F3</span>
            {suspendedCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            )}
          </button>

          {/* طباعة F5 */}
          <button
            type="button"
            onClick={onToggleAutoPrint}
            title="تبديل الطباعة التلقائية (F5)"
            className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[46px] ${
              autoPrintReceipt
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
                : 'bg-surface-container-low/90 text-on-surface-variant border-outline-variant/20'
            }`}
          >
            <Printer className="w-4 h-4 mb-0.5 text-emerald-600" />
            <span className="text-[11px] font-bold leading-tight">طباعة</span>
            <span className="text-[9px] font-mono opacity-70">F5</span>
          </button>
        </div>

        {/* Full-width Settle Sale Button: F1 */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cartLength === 0 || isSalePending}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-on-primary font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Receipt className="w-5 h-5" />
          <span className="text-sm sm:text-base font-black">تسوية الفاتورة</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-white/20 font-mono font-bold">
            F1
          </span>
        </button>

        {/* Secondary Auxiliary Actions: سجل (F9) + مبدئية + طلبية */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onOpenReturns}
            title="سجل المبيعات والمرتجع (F9)"
            className="py-1.5 px-2 rounded-xl bg-surface-container-low hover:bg-blue-500/10 text-blue-600 border border-outline-variant/20 hover:border-blue-500/30 text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>سجل</span>
            <span className="text-[9px] font-mono opacity-60">F9</span>
          </button>

          <button
            type="button"
            onClick={onSaveAsProforma}
            disabled={cartLength === 0}
            title="حفظ كفاتورة مبدئية"
            className="py-1.5 px-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer truncate"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">مبدئية</span>
          </button>

          <button
            type="button"
            onClick={onSaveAsOrder}
            disabled={cartLength === 0}
            title="حفظ كطلبيّة مبيعات"
            className="py-1.5 px-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/25 text-blue-700 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer truncate"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">طلبيّة</span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DESIGN 2: ULTRA-SLIM HORIZONTAL BOTTOM BAR (~56px height)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface-container/95 backdrop-blur-md border-t border-outline-variant/20 px-3.5 py-2 shrink-0 shadow-xl animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 min-w-0">
        {/* Section 1: Financial Summary Capsule (Right in RTL) */}
        {showFinancialSummary && (
          <div className="flex items-center gap-3 bg-surface-container-lowest/90 px-3 py-1.5 rounded-2xl border border-outline-variant/15 shadow-2xs shrink-0">
            {/* Subtotal & Discount */}
            <div className="flex flex-col justify-center text-[11px] space-y-0.5">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="font-bold">المجموع:</span>
                <span className="font-mono font-bold text-on-surface">
                  {formatMoney(subtotal)} دج
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenDiscount}
                  className="flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold transition-all cursor-pointer"
                  title="تخفيض أو زيادة"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>تخفيض</span>
                </button>
                <span className="font-mono font-bold text-primary text-[11px]">
                  {discountAmount > 0 ? `-${formatMoney(discountAmount)}` : '0.00'} دج
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-7 w-px bg-outline-variant/25 mx-0.5" />

            {/* Total Due */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-black text-on-surface">الإجمالي:</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-primary tracking-tight">
                {formatMoney(total)}
              </span>
              <span className="text-xs font-extrabold text-primary">دج</span>
            </div>
          </div>
        )}

        {/* Section 2: Quick Action Buttons Row (Center in RTL) */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* إلغاء F4 */}
          <button
            type="button"
            onClick={onClearCart}
            disabled={cartLength === 0}
            title="إلغاء وإفراغ السلة (F4)"
            className="h-10 px-2.5 rounded-xl bg-surface-container-low hover:bg-red-500/15 text-red-600 border border-outline-variant/20 hover:border-red-500/30 flex items-center gap-1 text-xs font-bold transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">إلغاء</span>
            <span className="text-[10px] font-mono opacity-70">F4</span>
          </button>

          {/* تعليق F2 */}
          <button
            type="button"
            onClick={onSuspendSale}
            disabled={cartLength === 0}
            title="تعليق البيع كمسودة (F2)"
            className="h-10 px-2.5 rounded-xl bg-surface-container-low hover:bg-amber-500/15 text-amber-600 border border-outline-variant/20 hover:border-amber-500/30 flex items-center gap-1 text-xs font-bold transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">تعليق</span>
            <span className="text-[10px] font-mono opacity-70">F2</span>
          </button>

          {/* مسودات F3 */}
          <button
            type="button"
            onClick={onOpenSuspended}
            title="المسودات والطلبات المعلقة (F3)"
            className="h-10 px-2.5 rounded-xl bg-surface-container-low hover:bg-purple-500/15 text-purple-600 border border-outline-variant/20 hover:border-purple-500/30 flex items-center gap-1 text-xs font-bold transition-all relative shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          >
            <PauseCircle className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">مسودات</span>
            <span className="text-[10px] font-mono opacity-70">F3</span>
            {suspendedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
            )}
          </button>

          {/* طباعة F5 */}
          <button
            type="button"
            onClick={onToggleAutoPrint}
            title="تبديل الطباعة التلقائية (F5)"
            className={`h-10 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0 ${
              autoPrintReceipt
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">طباعة</span>
            <span className="text-[10px] font-mono opacity-70">F5</span>
          </button>

          {/* سجل F9 */}
          <button
            type="button"
            onClick={onOpenReturns}
            title="سجل المبيعات والمرتجع (F9)"
            className="h-10 px-2.5 rounded-xl bg-surface-container-low hover:bg-blue-500/15 text-blue-600 border border-outline-variant/20 hover:border-blue-500/30 flex items-center gap-1 text-xs font-bold transition-all shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          >
            <History className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">سجل</span>
            <span className="text-[10px] font-mono opacity-70">F9</span>
          </button>

          {/* مبدئية */}
          <button
            type="button"
            onClick={onSaveAsProforma}
            disabled={cartLength === 0}
            title="حفظ كفاتورة مبدئية"
            className="h-10 px-2.5 rounded-xl bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline text-[11px]">مبدئية</span>
          </button>

          {/* طلبية */}
          <button
            type="button"
            onClick={onSaveAsOrder}
            disabled={cartLength === 0}
            title="حفظ كطلبيّة مبيعات"
            className="h-10 px-2.5 rounded-xl bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/25 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline text-[11px]">طلبيّة</span>
          </button>
        </div>

        {/* Section 3: Prominent Settle Button F1 (Left in RTL) */}
        <button
          type="button"
          onClick={onSettleSale}
          disabled={cartLength === 0 || isSalePending}
          className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-on-primary font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>تسوية الفاتورة</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-white/20 font-mono font-bold">
            F1
          </span>
        </button>
      </div>
    </div>
  );
};
export default POSActionBar;
