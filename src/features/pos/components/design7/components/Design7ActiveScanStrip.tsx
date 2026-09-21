import React, { useRef } from 'react';
import type { CartItem } from '@/types';
import { ScanBarcode, Scale } from 'lucide-react';

const normalizeNumericBarcode = (val: string): string => {
  return val
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
};

interface Design7ActiveScanStripProps {
  activeItem?: CartItem | null;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  formatMoney: (amount?: number | null) => string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  priceTier?: '1' | '2' | '3' | '4';
  onReadScale?: () => void;
}

export const Design7ActiveScanStrip: React.FC<Design7ActiveScanStripProps> = ({
  activeItem,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  formatMoney,
  inputRef,
  priceTier = '1',
  onReadScale,
}) => {
  const localRef = useRef<HTMLInputElement>(null);
  const resolvedRef = inputRef || localRef;

  const activeQty = activeItem ? (activeItem.qty ?? (activeItem as any).quantity ?? 0) : 0;
  const activeUnitPrice = activeItem ? (activeItem.unitPrice ?? (activeItem as any).price ?? 0) : 0;
  const activePrice = activeItem ? formatMoney(activeUnitPrice) : '0.00 DA';
  const activeName = activeItem
    ? (activeItem.name || (activeItem as any).productName || 'مادة بدون اسم')
    : 'في انتظار مسح أو اختيار مادة...';

  return (
    <div
      className="bg-[#d5ecd8] border-b border-[#a9c9ad] py-1 px-2 sm:px-4 flex items-center justify-between text-black shrink-0 gap-2 sm:gap-3 overflow-hidden"
      data-purpose="scan-status-strip"
    >
      {/* Right side in RTL: الكمية + مؤشر فئة السعر */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <span className="d7-pill-gloss-cyan px-2 sm:px-2.5 py-0.5 rounded text-black font-black border text-[10px] sm:text-xs">
          الكمية
        </span>
        <span className="text-lg sm:text-xl font-black text-amber-900 px-1 sm:px-2 min-w-[28px] text-center font-mono">
          {activeQty}
        </span>
        {(() => {
          const tierMeta: Record<'1' | '2' | '3' | '4', { label: string; title: string; style: string }> = {
            '1': { label: 'س1: بيع عادي', title: 'سعر التجزئة س1 (وصل عادي)', style: 'bg-emerald-100 text-emerald-950 border-emerald-400' },
            '2': { label: 'س2: نصف جملة', title: 'سعر نصف الجملة س2', style: 'bg-amber-100 text-amber-950 border-amber-400' },
            '3': { label: 'س3: فاتورة جملة', title: 'سعر الجملة س3 (فاتورة جملة A4/A5)', style: 'bg-purple-100 text-purple-950 border-purple-400' },
            '4': { label: 'س4: خاص', title: 'سعر خاص / بالفاتورة س4', style: 'bg-blue-100 text-blue-950 border-blue-400' },
          };
          const currentTier = tierMeta[priceTier || '1'];
          return (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black border shadow-2xs ${currentTier.style}`}
              title={currentTier.title}
            >
              {currentTier.label}
            </span>
          );
        })()}
      </div>

      {/* Center: Barcode Input with instant scan support & Scale button */}
      <div className="flex-1 max-w-xs sm:max-w-md flex items-center gap-1.5 mx-1 sm:mx-2">
        <form
          onSubmit={(e) => {
            onBarcodeSubmit(e);
            setTimeout(() => {
              resolvedRef.current?.focus();
            }, 40);
          }}
          className="flex-1 flex items-center"
        >
          <div className="relative w-full flex items-center">
            <ScanBarcode className="w-4 h-4 text-emerald-800 absolute right-2.5 pointer-events-none" />
            <input
              ref={resolvedRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={barcodeInput}
              onChange={(e) => {
                const cleaned = normalizeNumericBarcode(e.target.value);
                setBarcodeInput(cleaned);
              }}
              placeholder="امسح الباركود أو أدخله يدوياً..."
              autoComplete="off"
              data-purpose="barcode-input"
              className="w-full h-7 sm:h-8 pr-8 pl-12 text-xs bg-white border border-[#96b89b] focus:border-emerald-700 rounded-md focus:outline-hidden text-black font-mono font-bold shadow-inner transition-colors"
            />
            {barcodeInput ? (
              <button
                type="button"
                onClick={() => {
                  setBarcodeInput('');
                  resolvedRef.current?.focus();
                }}
                className="absolute left-7 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center text-[10px] cursor-pointer"
                title="مسح الحقل"
              >
                ✕
              </button>
            ) : null}
            <span className="absolute left-1.5 text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 border border-emerald-400 px-1 py-0.5 rounded pointer-events-none">
              F3
            </span>
          </div>
        </form>
        {onReadScale && (
          <button
            type="button"
            onClick={onReadScale}
            title="قراءة الوزن من الميزان الذكي (RS232/Serial)"
            className="h-7 sm:h-8 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[10px] sm:text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">وزن</span>
          </button>
        )}
      </div>

      {/* Left side in RTL: سعر الوحدة + اسم المنتوج النشط */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
        <span className="d7-pill-gloss-cyan px-2 sm:px-2.5 py-0.5 rounded text-black font-black border text-[10px] sm:text-xs shrink-0">
          سعر الوحدة
        </span>
        <span className="text-sm sm:text-base font-black text-amber-700 shrink-0 font-mono">
          {activePrice}
        </span>
        <span className="text-xs sm:text-sm md:text-base font-black text-black truncate max-w-[140px] sm:max-w-[200px] md:max-w-[280px]">
          {activeName}
        </span>
        {activeItem?.barcode && (
          <span className="text-[10px] font-mono font-bold bg-white/90 px-1.5 py-0.5 rounded border border-[#8fa893] text-black shrink-0 hidden lg:inline">
            باركود: {activeItem.barcode}
          </span>
        )}
      </div>
    </div>
  );
};
