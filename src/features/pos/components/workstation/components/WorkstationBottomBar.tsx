import React from 'react';
import {
  LogOut,
  Trash2,
  RotateCcw,
  Boxes,
  SlidersHorizontal,
  Pause,
  History,
  Minus,
  Plus,
  Printer,
  XCircle,
} from 'lucide-react';

interface WorkstationBottomBarProps {
  onEscape: () => void;
  onDeleteSelected: () => void;
  onClearCart?: () => void;
  onOpenCalculator?: () => void;
  onOpenReturns: () => void;
  onOpenFreeProduct: () => void;
  onToggleSearchCriteria: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  onDecrementQty: () => void;
  onIncrementQty: () => void;
  onConfirmSave?: () => void;
  onConfirmPrint?: () => void;
  isSalePending?: boolean;
  cartLength: number;
}

export const WorkstationBottomBar: React.FC<WorkstationBottomBarProps> = ({
  onEscape,
  onDeleteSelected,
  onClearCart,
  onOpenCalculator,
  onOpenReturns,
  onOpenFreeProduct,
  onToggleSearchCriteria,
  onSuspendSale,
  onOpenSuspended,
  onDecrementQty,
  onIncrementQty,
  onConfirmSave,
  onConfirmPrint,
  isSalePending = false,
  cartLength,
}) => {
  const hasCart = cartLength > 0;

  return (
    <footer className="bg-slate-900 border-t border-slate-800 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 flex-shrink-0 shadow-2xl select-none z-20">
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto custom-scrollbar scroll-smooth">
        {/* Left Group: Exit & Row Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 flex-shrink-0">
          {/* Esc Close */}
          <button
            type="button"
            onClick={onEscape}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center gap-1.5 sm:gap-2 font-bold text-xs transition shadow-2xs cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <div className="text-right leading-tight">
              <div>إغلاق</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">Esc</div>
            </div>
          </button>

          {/* Suppr Delete Line */}
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!hasCart}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white disabled:opacity-40 disabled:hover:bg-rose-600/20 disabled:hover:text-rose-300 active:scale-95 border border-rose-500/40 flex items-center gap-1.5 sm:gap-2 font-bold text-xs transition shadow-2xs cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <div className="text-right leading-tight">
              <div>حذف سطر</div>
              <div className="text-[9px] sm:text-[10px] font-mono opacity-80">Suppr</div>
            </div>
          </button>

          {/* Clear Cart Button */}
          {onClearCart && (
            <button
              type="button"
              onClick={() => {
                if (hasCart && window.confirm('هل أنت متأكد من تفريغ السلة وإلغاء الوصل؟')) {
                  onClearCart();
                }
              }}
              disabled={!hasCart}
              className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 disabled:opacity-40 active:scale-95 border border-slate-700 hover:border-rose-700/50 flex items-center gap-1.5 font-bold text-xs transition shadow-2xs cursor-pointer shrink-0"
              title="إفراغ السلة بالكامل"
            >
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
              <div className="text-right leading-tight">
                <div>إلغاء الوصل</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">تفريغ</div>
              </div>
            </button>
          )}

          {/* F11 Return items */}
          <button
            type="button"
            onClick={onOpenReturns}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 hover:text-rose-200 text-slate-300 active:scale-95 border border-slate-700 flex items-center gap-1.5 sm:gap-2 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
            <div className="text-right leading-tight">
              <div>إرجاع سلع</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">F11</div>
            </div>
          </button>
        </div>

        {/* Center Group: Sales Status, Hold & Lookup */}
        <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 flex-shrink-0">
          {/* Diverse Products / Free Product */}
          <button
            type="button"
            onClick={onOpenFreeProduct}
            className="h-9 sm:h-10 xl:h-11 px-1.5 sm:px-2.5 xl:px-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 active:scale-95 text-white border border-cyan-500/30 flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition shadow-2xs cursor-pointer shrink-0"
            title="إضافة سلعة متنوعة أو خدمة"
          >
            <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <div className="text-right leading-tight">
              <div>سلع متنوعة</div>
              <div className="text-[9px] sm:text-[10px] text-cyan-200 font-mono">حر</div>
            </div>
          </button>

          {/* F8 Search Mode */}
          <button
            type="button"
            onClick={onToggleSearchCriteria}
            className="h-9 sm:h-10 xl:h-11 px-1.5 sm:px-2.5 xl:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
            <div className="text-right leading-tight">
              <div>نوع البحث</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">F8</div>
            </div>
          </button>

          {/* F3 Put Sale On Hold */}
          <button
            type="button"
            onClick={onSuspendSale}
            disabled={!hasCart}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 active:scale-95 text-slate-200 border border-slate-700 flex items-center gap-1.5 sm:gap-2 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <div className="text-right leading-tight">
              <div>وضع بالانتظار</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">F3</div>
            </div>
          </button>

          {/* F6 Held Sales List */}
          <button
            type="button"
            onClick={onOpenSuspended}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center gap-1.5 sm:gap-2 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
            <div className="text-right leading-tight">
              <div>قائمة الانتظار</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">F6</div>
            </div>
          </button>
        </div>

        {/* Right Group: Primary POS Operations (Quantity, Confirm, Print) */}
        <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 flex-shrink-0">
          {/* Quantity Minus Button */}
          <button
            type="button"
            onClick={onDecrementQty}
            disabled={!hasCart}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3 rounded-xl bg-rose-700 hover:bg-rose-600 disabled:opacity-40 active:scale-95 text-white flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition shadow-2xs border border-rose-500/30 cursor-pointer shrink-0"
            title="تقليل كمية المادة النشطة"
          >
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">الكمية</span>
          </button>

          {/* Quantity Plus Button */}
          <button
            type="button"
            onClick={onIncrementQty}
            disabled={!hasCart}
            className="h-9 sm:h-10 xl:h-11 px-2 sm:px-2.5 xl:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 active:scale-95 text-white flex items-center gap-1 sm:gap-1.5 font-bold text-xs transition shadow-2xs border border-emerald-400/30 cursor-pointer shrink-0"
            title="زيادة كمية المادة النشطة"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">الكمية</span>
          </button>

          {/* Unified Confirm & Print (F1 / F2 Primary Hero Action) */}
          <button
            type="button"
            onClick={onConfirmPrint || onConfirmSave}
            disabled={!hasCart || isSalePending}
            className="h-9 sm:h-10 xl:h-11 px-3 sm:px-4 xl:px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 active:scale-95 text-white flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 font-black text-xs transition shadow-lg shadow-emerald-950/60 border border-emerald-400/50 cursor-pointer shrink-0"
            title="تأكيد حفظ وطباعة الفاتورة (F1 / F2)"
            data-testid="bottom-bar-confirm-print-btn"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-5 animate-pulse" />
            <div className="text-right leading-tight">
              <div className="text-xs sm:text-sm font-black tracking-wide">تأكيد وطبع</div>
              <div className="text-[9px] sm:text-[10px] text-emerald-100 font-mono font-medium">
                F1 / F2 <span className="hidden 2xl:inline font-sans opacity-85">(Enregistrer &amp; Imprimer)</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
};
