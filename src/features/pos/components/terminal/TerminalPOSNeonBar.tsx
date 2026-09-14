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
      {/* Column 1: خيارات فئات الأسعار والطباعة والتركيز */}
      <div className="flex flex-col justify-between text-xs text-slate-600 dark:text-slate-300 gap-2 min-w-[260px] flex-1 lg:flex-initial">
        {/* شريط تبويب فئات السعر الأربعة اللمسي والمريح (س1 - س4) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 px-0.5">
            <span>فئة السعر النشطة للفاتورة:</span>
            <span className="font-mono text-[10px] text-slate-400">Alt + 1..4</span>
          </div>
          <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
            <button
              type="button"
              onClick={() => handleSelectPriceTier('1')}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                priceTier === '1'
                  ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
              }`}
              title="سعر التجزئة القياسي س1 (Alt+1)"
            >
              <span className={`w-2 h-2 rounded-full ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
              <span>س1 تجزئة</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPriceTier('2')}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                priceTier === '2'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
              }`}
              title="سعر نصف الجملة س2 (Alt+2)"
            >
              <span className={`w-2 h-2 rounded-full ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>س2 نصف</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPriceTier('3')}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                priceTier === '3'
                  ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
              }`}
              title="سعر الجملة س3 (Alt+3)"
            >
              <span className={`w-2 h-2 rounded-full ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
              <span>س3 جملة</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPriceTier('4')}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                priceTier === '4'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
              }`}
              title="سعر خاص للزبائن المعتمدين س4 (Alt+4)"
            >
              <span className={`w-2 h-2 rounded-full ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
              <span>س4 خاص</span>
            </button>
          </div>
        </div>

        {/* خيارات الطباعة وتثبيت المؤشر (تم إزالة التكرار) */}
        <div className="flex items-center justify-between gap-3 px-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600" title="تثبيت مؤشر الإدخال دائماً على حقل الباركود بعد كل عملية">
            <input
              type="checkbox"
              checked={isLockedBarcode}
              onChange={(e) => setIsLockedBarcode(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span>قفل التركيز على الباركود</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600" title="تفعيل الطباعة التلقائية للإيصال فور تأكيد عملية البيع">
            <input
              type="checkbox"
              checked={autoPrintReceipt}
              onChange={onToggleAutoPrint}
              className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span>طباعة تلقائية للإيصال</span>
          </label>
        </div>

        {/* ملخص السلة والمبلغ المستحق */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            المستحق للدفع:{' '}
            <strong className="text-blue-900 dark:text-blue-300 font-mono font-bold">
              {formatMoney(saleSummary.total)} {currency}
            </strong>
          </span>
          <span className="text-slate-500 font-mono">
            {cart.length > 0 ? `${cart.length} أصناف مسجلة` : 'السلة فارغة'}
          </span>
        </div>
      </div>

      {/* Column 2: شاشة المجموع الفسفوري الأخضر الرقمي الكبير النيون (Neon Total Screen) */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050b14] rounded-xl border-2 border-slate-700 px-5 py-2 shadow-inner relative overflow-hidden min-w-[260px] sm:min-w-[320px]">
        <div className="absolute top-1 right-3 text-[10px] text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-2">
          <span>المجموع الإجمالي / TOTAL</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
            {priceTier === '1' ? 'س1 تجزئة' : priceTier === '2' ? 'س2 نصف جملة' : priceTier === '3' ? 'س3 جملة' : 'س4 خاص'}
          </span>
        </div>
        <div className="text-emerald-400 font-bold text-4xl sm:text-5xl tracking-wider select-text flex items-baseline gap-2 font-mono drop-shadow-[0_0_12px_rgba(34,197,94,0.75)] pt-2.5">
          <span>{formatMoney(saleSummary.total)}</span>
          <span className="text-xl sm:text-2xl font-normal text-emerald-400/90">{currency}</span>
        </div>
        <div className="w-full flex items-center justify-between text-xs text-emerald-500 border-t border-slate-800 mt-1 pt-1 font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            <Scale className="w-3.5 h-3.5 inline text-emerald-500" />
            <span>الميزان: 0.000 KG</span>
          </span>
          <span className="text-slate-400 text-[11px]">
            {cart.length > 0 ? `${cart.length} أصناف (${totalUnitsCount} قطع)` : 'حالة الصندوق: جاهز'}
          </span>
        </div>
      </div>

      {/* Column 3: شريط إدخال الباركود والرمز السريع F3 */}
      <div className="flex flex-col justify-between w-full sm:w-84 gap-1.5 flex-1 lg:flex-initial">
        <div>
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex justify-between items-center px-0.5">
            <span className="flex items-center gap-1">
              <ScanLine className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>الباركود أو رمز السلعة (F3):</span>
            </span>
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
              className="text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline"
              title="تعديل كمية السلعة المحددة بالسلة عبر اللوحة الرقمية (Ctrl+E)"
            >
              تعديل الكمية (Ctrl+E)
            </button>
          </div>
          <form onSubmit={handleBarcodeOrQuerySubmit} className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={isPriceCheckerMode ? 'امسح الباركود للاستعلام عن السعر...' : 'امسح الباركود أو اكتب اسم السلعة...'}
                className={`w-full h-10 text-xs sm:text-sm rounded-xl px-3 pl-8 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 font-semibold shadow-inner placeholder-slate-400 font-mono transition-all ${
                  isPriceCheckerMode
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500 text-blue-950 dark:text-blue-200 focus:ring-blue-400 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.2 rounded font-bold">F3</span>
            </div>
            <button
              type="submit"
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              title="بحث وإدخال الرمز (Enter)"
            >
              <Search className="w-4 h-4" />
              <span>إدخال</span>
            </button>
          </form>
        </div>

        {/* حالة الماسح ووضع عارض الأسعار */}
        {isPriceCheckerMode ? (
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
            <span>وضع عارض الأسعار مفعّل (معاينة فقط)</span>
            <span className="font-mono text-[10px] bg-blue-200 dark:bg-blue-900 px-1.5 rounded">F7 / Esc للخروج</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>جاهز للمسح المباشر</span>
            </span>
            <span className="font-mono text-[10px]">دفع فوري سريع</span>
          </div>
        )}
      </div>
    </div>
  );
};
