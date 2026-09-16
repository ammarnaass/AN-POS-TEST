import React, { useRef } from 'react';
import type { CartItem } from '@/types';
import { ScanBarcode } from 'lucide-react';

interface Design7ActiveScanStripProps {
  activeItem?: CartItem | null;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  formatMoney: (amount?: number | null) => string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const Design7ActiveScanStrip: React.FC<Design7ActiveScanStripProps> = ({
  activeItem,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  formatMoney,
  inputRef,
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
      className="bg-[#d5ecd8] border-b border-[#a9c9ad] py-1 px-2 sm:px-4 flex items-center justify-between text-slate-800 shrink-0 gap-2 sm:gap-3 overflow-hidden"
      data-purpose="scan-status-strip"
    >
      {/* Right side in RTL: الكمية */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <span className="d7-pill-gloss-cyan px-2 sm:px-2.5 py-0.5 rounded text-slate-800 font-bold border text-[10px] sm:text-xs">
          الكمية
        </span>
        <span className="text-lg sm:text-xl font-black text-amber-700 px-1 sm:px-2 min-w-[28px] text-center font-mono">
          {activeQty}
        </span>
      </div>

      {/* Center: Barcode Input with instant scan support */}
      <form onSubmit={onBarcodeSubmit} className="flex-1 max-w-xs sm:max-w-md flex items-center gap-1.5 mx-1 sm:mx-2">
        <div className="relative w-full flex items-center">
          <ScanBarcode className="w-4 h-4 text-emerald-700 absolute right-2.5 pointer-events-none" />
          <input
            ref={resolvedRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="امسح الباركود أو أدخله يدوياً..."
            autoComplete="off"
            data-purpose="barcode-input"
            className="w-full h-7 sm:h-8 pr-8 pl-12 text-xs bg-white/95 border border-[#96b89b] focus:border-emerald-600 rounded-md focus:outline-hidden text-slate-900 font-mono shadow-inner transition-colors"
          />
          {barcodeInput ? (
            <button
              type="button"
              onClick={() => setBarcodeInput('')}
              className="absolute left-7 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] cursor-pointer"
              title="مسح الحقل"
            >
              ✕
            </button>
          ) : null}
          <span className="absolute left-1.5 text-[9px] sm:text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.5 rounded pointer-events-none">
            F3
          </span>
        </div>
      </form>

      {/* Left side in RTL: سعر الوحدة + اسم المنتوج النشط */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
        <span className="d7-pill-gloss-cyan px-2 sm:px-2.5 py-0.5 rounded text-slate-800 font-bold border text-[10px] sm:text-xs shrink-0">
          سعر الوحدة
        </span>
        <span className="text-sm sm:text-base font-black text-amber-600 shrink-0 font-mono">
          {activePrice}
        </span>
        <span className="text-xs sm:text-sm md:text-base font-black text-emerald-900 truncate max-w-[140px] sm:max-w-[200px] md:max-w-[280px]">
          {activeName}
        </span>
        {activeItem?.barcode && (
          <span className="text-[10px] font-mono bg-white/70 px-1.5 py-0.5 rounded border border-[#a9c9ad] text-slate-600 shrink-0 hidden lg:inline">
            باركود: {activeItem.barcode}
          </span>
        )}
      </div>
    </div>
  );
};
