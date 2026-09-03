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
}) => {
  return (
    <div className="bg-surface-container/90 backdrop-blur-md border-t border-outline-variant/20 p-4 shrink-0 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
      <div className={`grid grid-cols-1 ${showFinancialSummary ? 'lg:grid-cols-12' : ''} gap-6 items-center`}>
        {/* Financial Summary */}
        {showFinancialSummary && (
          <div className="lg:col-span-5 flex flex-col justify-center space-y-2.5 border-l border-outline-variant/15 pl-4">
            <div className="bg-surface-container-lowest/80 rounded-2xl p-3.5 border border-outline-variant/15 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-bold text-xs">المجموع الفرعي:</span>
                <span className="font-mono font-bold text-on-surface text-sm">
                  {formatMoney(subtotal)} دج
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <button
                  type="button"
                  onClick={onOpenDiscount}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تخفيض / زيادة</span>
                </button>
                <span className="font-mono font-bold text-primary text-sm">
                  {discountAmount > 0 ? `-${formatMoney(discountAmount)}` : '0.00'} دج
                </span>
              </div>

              <div className="pt-2 border-t border-dashed border-outline-variant/25 flex items-baseline justify-between">
                <span className="text-xs font-extrabold text-on-surface">الإجمالي المستحق</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl lg:text-4xl font-black font-mono text-primary tracking-tight drop-shadow-xs">
                    {formatMoney(total)}
                  </span>
                  <span className="text-base font-extrabold text-primary">دج</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons & Settlement */}
        <div className={`${showFinancialSummary ? 'lg:col-span-7' : 'w-full'} space-y-2.5`}>
          {/* 5 Quick Action Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {/* إلغاء F4 */}
            <button
              type="button"
              onClick={onClearCart}
              disabled={cartLength === 0}
              className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-red-500/15 text-red-600 border border-outline-variant/20 hover:border-red-500/30 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mb-0.5 text-red-500" />
              <span className="text-[11px] font-bold">إلغاء</span>
              <span className="text-[9px] font-mono opacity-75">F4</span>
            </button>

            {/* تعليق F2 */}
            <button
              type="button"
              onClick={onSuspendSale}
              disabled={cartLength === 0}
              className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-amber-500/15 text-amber-600 border border-outline-variant/20 hover:border-amber-500/30 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 mb-0.5 text-amber-500" />
              <span className="text-[11px] font-bold">تعليق</span>
              <span className="text-[9px] font-mono opacity-75">F2</span>
            </button>

            {/* سجل F9 */}
            <button
              type="button"
              onClick={onOpenReturns}
              className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-blue-500/15 text-blue-600 border border-outline-variant/20 hover:border-blue-500/30 flex flex-col items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <History className="w-4 h-4 mb-0.5 text-blue-500" />
              <span className="text-[11px] font-bold">سجل</span>
              <span className="text-[9px] font-mono opacity-75">F9</span>
            </button>

            {/* مسودات F3 */}
            <button
              type="button"
              onClick={onOpenSuspended}
              className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-purple-500/15 text-purple-600 border border-outline-variant/20 hover:border-purple-500/30 flex flex-col items-center justify-center transition-all relative shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <PauseCircle className="w-4 h-4 mb-0.5 text-purple-500" />
              <span className="text-[11px] font-bold">مسودات</span>
              <span className="text-[9px] font-mono opacity-75">F3</span>
              {suspendedCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              )}
            </button>

            {/* طباعة F5 */}
            <button
              type="button"
              onClick={onToggleAutoPrint}
              className={`py-2.5 px-1 rounded-2xl border flex flex-col items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                autoPrintReceipt
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
                  : 'bg-surface-container-low/90 text-on-surface-variant border-outline-variant/20'
              }`}
            >
              <Printer className="w-4 h-4 mb-0.5 text-emerald-600" />
              <span className="text-[11px] font-bold">طباعة</span>
              <span className="text-[9px] font-mono opacity-75">F5</span>
            </button>
          </div>

          {/* Giant Dominant Blue Button: تسوية الفاتورة F1 */}
          <button
            type="button"
            onClick={onSettleSale}
            disabled={cartLength === 0 || isSalePending}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-on-primary font-black flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Receipt className="w-5 h-5" />
            <span className="text-base font-black">تسوية الفاتورة</span>
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white/20 font-mono font-bold">
              F1
            </span>
          </button>

          {/* Two Auxiliary Action Buttons: حفظ كفاتورة مبدئية & حفظ كطلبية */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSaveAsProforma}
              disabled={cartLength === 0}
              className="py-2.5 px-3 rounded-2xl bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/30 text-amber-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>حفظ كفاتورة مبدئية</span>
            </button>

            <button
              type="button"
              onClick={onSaveAsOrder}
              disabled={cartLength === 0}
              className="py-2.5 px-3 rounded-2xl bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/30 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-blue-500" />
              <span>حفظ كطلبية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default POSActionBar;
