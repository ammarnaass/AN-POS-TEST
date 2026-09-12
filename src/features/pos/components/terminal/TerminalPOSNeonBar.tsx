import React from 'react';
import { Scale, Search, ScanLine } from 'lucide-react';
import type { CartItem } from '@/types';

export interface TerminalPOSNeonBarProps {
  priceTier: '1' | '2' | '3' | '4';
  handleSelectPriceTier: (tier: '1' | '2' | '3' | '4') => void;
  isLockedBarcode: boolean;
  setIsLockedBarcode: (val: boolean) => void;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    total: number;
  };
  formatMoney: (amount?: number) => string;
  currency?: string;
  cart: CartItem[];
  totalUnitsCount: number;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  handleBarcodeOrQuerySubmit: (e?: React.FormEvent) => void;
  isPriceCheckerMode: boolean;
  selectedCartRowId: string | null;
  onOpenKeypadForQty?: (item: CartItem) => void;
  onOpenKeypad?: () => void;
}

export const TerminalPOSNeonBar: React.FC<TerminalPOSNeonBarProps> = ({
  priceTier,
  handleSelectPriceTier,
  isLockedBarcode,
  setIsLockedBarcode,
  autoPrintReceipt,
  onToggleAutoPrint,
  saleSummary,
  formatMoney,
  currency = 'دج',
  cart,
  totalUnitsCount,
  barcodeInputRef,
  barcodeInput,
  setBarcodeInput,
  handleBarcodeOrQuerySubmit,
  isPriceCheckerMode,
  selectedCartRowId,
  onOpenKeypadForQty,
  onOpenKeypad,
}) => {
  return (
    <div className="flex items-stretch justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0 flex-wrap lg:flex-nowrap">
      {/* Column 1: حقول خيارات فئات الأسعار والطباعة والتركيز */}
      <div className="flex flex-col justify-between text-xs text-slate-600 dark:text-slate-300 gap-1.5 min-w-[250px] flex-1 lg:flex-initial">
        {/* تبديل فئات السعر الأربعة بالمسميات الموحدة */}
        <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
          <button
            type="button"
            onClick={() => handleSelectPriceTier('1')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
              priceTier === '1'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
            }`}
            title="سعر التجزئة العادي س1 (Alt+1)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
            <span>س1 (تجزئة)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPriceTier('2')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
              priceTier === '2'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
            }`}
            title="سعر نصف الجملة س2 (Alt+2)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>س2</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPriceTier('3')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
              priceTier === '3'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
            }`}
            title="سعر الجملة س3 (Alt+3)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
            <span>س3 (جملة)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPriceTier('4')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
              priceTier === '4'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
            }`}
            title="سعر خاص للزبائن المميزين س4 (Alt+4)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
            <span>س4 (خاص)</span>
          </button>
        </div>

        {/* خيارات الطباعة وتثبيت المؤشر */}
        <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-1 cursor-pointer" title="تثبيت قارئ الباركود دائماً">
            <input
              type="checkbox"
              checked={isLockedBarcode}
              onChange={(e) => setIsLockedBarcode(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>تثبيت الرمز</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer" title="تفعيل الطباعة التلقائية للإيصال فور تأكيد البيع">
            <input
              type="checkbox"
              checked={autoPrintReceipt}
              onChange={onToggleAutoPrint}
              className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>طباعة تلقائية</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer" title="إعادة المؤشر تلقائياً لحقل الباركود بعد كل عملية">
            <input
              type="checkbox"
              checked={isLockedBarcode}
              onChange={(e) => setIsLockedBarcode(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>العودة للرمز دائماً</span>
          </label>
        </div>

        {/* رصيد الصندوق وسلة رقم */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <span>
            المبلغ المستحق:{' '}
            <strong className="text-blue-900 dark:text-blue-300 font-mono">
              {formatMoney(saleSummary.total)} {currency}
            </strong>
          </span>
          <span className="text-slate-400 font-mono font-bold">سلة: 1</span>
        </div>
      </div>

      {/* Column 2: شاشة المجموع الفسفوري الأخضر الرقمي الكبير النيون (Neon Total Screen) */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050b14] rounded-xl border-2 border-slate-700 px-5 py-2 shadow-inner relative overflow-hidden min-w-[260px] sm:min-w-[320px]">
        <div className="absolute top-1 right-3 text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
          المجموع الإجمالي / TOTAL
        </div>
        <div className="text-emerald-400 font-bold text-4xl sm:text-5xl tracking-wider select-text flex items-baseline gap-2 font-mono drop-shadow-[0_0_12px_rgba(34,197,94,0.75)] pt-2.5">
          <span>{formatMoney(saleSummary.total)}</span>
          <span className="text-xl sm:text-2xl font-normal text-emerald-400/90">{currency}</span>
        </div>
        <div className="w-full flex items-center justify-between text-xs text-emerald-500 border-t border-slate-800 mt-1 pt-1 font-mono">
          <span className="flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 inline" />
            <span>الوزن: 0.000 KG</span>
          </span>
          <span className="text-slate-400 text-[11px]">
            {cart.length > 0 ? `${cart.length} أصناف (${totalUnitsCount} قطع)` : 'حالة الصندوق: جاهز'}
          </span>
        </div>
      </div>

      {/* Column 3: شريط إدخال الباركود والرمز السريع F3 / F4 */}
      <div className="flex flex-col justify-between w-full sm:w-80 gap-1.5 flex-1 lg:flex-initial">
        <div>
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5 flex justify-between items-center">
            <span>الباركود أو الرمز (F3):</span>
            <button
              type="button"
              onClick={() => {
                const target = selectedCartRowId
                  ? cart.find((c) => c.productId === selectedCartRowId) || cart[cart.length - 1]
                  : cart[cart.length - 1];
                if (target && onOpenKeypadForQty) {
                  onOpenKeypadForQty(target);
                } else if (onOpenKeypad) {
                  onOpenKeypad();
                } else {
                  barcodeInputRef.current?.focus();
                }
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline"
              title="تعيين كمية الصنف المحدد أو تركيز الحقل (F4)"
            >
              التعيين (F4)
            </button>
          </div>
          <form onSubmit={handleBarcodeOrQuerySubmit} className="flex gap-1">
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={isPriceCheckerMode ? 'امسح الباركود للاستعلام...' : 'امسح الباركود أو اكتب الرمز...'}
                className={`w-full text-xs rounded-lg px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 font-semibold shadow-inner placeholder-slate-400 font-mono transition-colors ${
                  isPriceCheckerMode
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500 text-blue-950 dark:text-blue-200 focus:ring-blue-400'
                    : 'bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-white focus:ring-blue-500'
                }`}
              />
              <span className="absolute left-2 top-1.5 text-slate-400 font-mono text-[10px]">F3</span>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              title="بحث وإدخال الرمز (Enter)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث (Enter)</span>
            </button>
          </form>
        </div>

        {/* أزرار الماسح ووضع الدفع */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              barcodeInputRef.current?.focus();
              barcodeInputRef.current?.select();
            }}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[11px] font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer active:scale-95"
            title="تركيز قارئ الباركود"
          >
            <ScanLine className="w-3.5 h-3.5 text-slate-500" />
            <span>قارئ الباركود</span>
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">وضع الدفع المباشر</span>
        </div>
      </div>
    </div>
  );
};
