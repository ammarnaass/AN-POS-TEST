import React from 'react';
import {
  Trash2,
  PauseCircle,
  Printer,
  Receipt,
  FileCheck,
  Tag,
} from 'lucide-react';

export interface POSTotalsBarProps {
  cartLength: number;
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    total: number;
  };
  currency?: string;
  formatMoney: (amount?: number | null) => string;
  discount?: number;
  discountType?: 'percent' | 'amount';
  onOpenDiscount: () => void;
  onSettleSale: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onClearCart: () => void;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  isSessionOpen: boolean;
  isSalePending: boolean;
  layoutVariant?: 'sidebar' | 'bottom';
  className?: string;
}

export const POSTotalsBar: React.FC<POSTotalsBarProps> = ({
  cartLength,
  saleSummary,
  currency = 'دج',
  formatMoney,
  discount = 0,
  discountType = 'amount',
  onOpenDiscount,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onClearCart,
  autoPrintReceipt,
  onToggleAutoPrint,
  isSessionOpen,
  isSalePending,
  layoutVariant = 'sidebar',
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0 ${className}`}
      data-purpose="totals-action-bar"
    >
      {/* ملخص الحساب المالي المدمج */}
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex justify-between items-center">
          <span>المجموع الفرعي:</span>
          <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
            {formatMoney(saleSummary.subtotal)} {currency}
          </span>
        </div>

        {/* الخصم إن وجد أو زر إضافة الخصم */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onOpenDiscount}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>
              {saleSummary.discountAmount > 0
                ? `الخصم (${discountType === 'percent' ? `${discount}%` : 'مبلغ ثابت'}):`
                : '+ تطبيق خصم'}
            </span>
          </button>
          <span
            className={`font-bold font-mono ${
              saleSummary.discountAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
            }`}
          >
            {saleSummary.discountAmount > 0 ? `-${formatMoney(saleSummary.discountAmount)}` : '0.00'} {currency}
          </span>
        </div>

        {/* الإجمالي النهائي */}
        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="font-bold text-sm text-slate-900 dark:text-white">المبلغ النهائي:</span>
          <div className="flex items-baseline gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
            <span className="text-xl sm:text-2xl font-black">{formatMoney(saleSummary.total)}</span>
            <span className="text-xs font-bold">{currency}</span>
          </div>
        </div>
      </div>

      {/* زر الدفع الرئيسي البارز */}
      <button
        type="button"
        onClick={onSettleSale}
        disabled={cartLength === 0 || isSalePending}
        className="w-full py-3 sm:py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        id="settle-sale-btn"
      >
        <Receipt className="w-5 h-5" />
        <span>{isSalePending ? 'جاري التنفيذ...' : 'إنهاء البيع والمحاسبة (F1)'}</span>
      </button>

      {/* شريط الإجراءات السريعة (تعليق، معلقة، تفريغ، طباعة) */}
      <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
        <button
          type="button"
          onClick={onSuspendSale}
          disabled={cartLength === 0}
          className="py-2 px-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 transition disabled:opacity-40 cursor-pointer"
          title="تعليق الفاتورة الحالية (F2)"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>تعليق (F2)</span>
        </button>

        <button
          type="button"
          onClick={onOpenSuspended}
          className="relative py-2 px-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
          title="عرض الفواتير المعلقة (F3)"
        >
          <FileCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>معلقة (F3)</span>
          {suspendedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {suspendedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onClearCart}
          disabled={cartLength === 0}
          className="py-2 px-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 transition disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-1"
          title="تفريغ السلة (F4)"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span>تفريغ (F4)</span>
        </button>

        <button
          type="button"
          onClick={onToggleAutoPrint}
          className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
            autoPrintReceipt
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
          }`}
          title="الطباعة التلقائية للإيصال (F5)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة (F5)</span>
        </button>
      </div>
    </div>
  );
};
